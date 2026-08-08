/**
 * Issues JWTs for app login after code/tag/face identify (no kiosk JWT).
 */
import {
  buildAuthLoginUserPayload,
  canEstablishAppSession,
  isFaceMatchDistance,
  parseLoginByFaceConfirmBody,
  type AuthLoginSuccessBody,
} from '../../../business/auth-login';
import {
  faceDescriptorDistance,
  normalizeFaceVector,
  rankFaceMatches,
} from '../../../business/face-vector';
import {
  canIdentifyAtKiosk,
  mapUserRowFromDb,
  parseKioskIdentifyBody,
  readKioskIdentifiableRole,
} from '../../../business/kiosk-identify';
import {
  mapFaceIdentifyCandidate,
  parseKioskFaceIdentifyBody,
  buildFaceIdentifyResponse,
} from '../../../business/kiosk-face-identify';
import { parseKioskTagIdentifyBody } from '../../../business/kiosk-tag-identify';
import {
  readUserDocumentId,
  USERS_TABLE,
} from '../../../business/kiosk-subtasks';
import { LOCAL_AUTH_PROVIDER } from '../../../business/user-auth';
import { mapWelcomeProfile } from '../../../business/welcome-profile';

const USER_UID = 'plugin::users-permissions.user';

async function loadWelcomeForDocumentId(documentId: string) {
  const user = await strapi.documents(USER_UID).findOne({
    documentId,
    fields: ['name', 'username', 'greetingGender'],
    populate: {
      avatar: { fields: ['url'] },
      facePhoto: { fields: ['url'] },
    },
  });
  if (!user) return null;
  return mapWelcomeProfile(user as Parameters<typeof mapWelcomeProfile>[0]);
}

async function issueLoginForUserId(
  userId: number,
): Promise<
  | (AuthLoginSuccessBody & {
      welcome: ReturnType<typeof mapWelcomeProfile> | null;
    })
  | null
> {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { id: userId },
    select: [
      'id',
      'documentId',
      'username',
      'email',
      'name',
      'roleType',
      'blocked',
      'provider',
    ],
  });

  if (!user || user.blocked) return null;
  if (!canEstablishAppSession(user.roleType as string, Boolean(user.blocked))) {
    return null;
  }
  if (user.provider && user.provider !== LOCAL_AUTH_PROVIDER) {
    return null;
  }

  const jwt = strapi
    .plugin('users-permissions')
    .service('jwt')
    .issue({ id: user.id });

  const documentId = String(user.documentId ?? '');
  const welcome = documentId
    ? await loadWelcomeForDocumentId(documentId)
    : null;

  return {
    jwt,
    user: buildAuthLoginUserPayload(
      user as Parameters<typeof buildAuthLoginUserPayload>[0],
    ),
    welcome,
  };
}

async function issueLoginForDocumentId(
  documentId: string,
): Promise<AuthLoginSuccessBody | null> {
  const user = await strapi.db.query(USER_UID).findOne({
    where: { documentId },
    select: ['id', 'blocked', 'roleType', 'provider'],
  });
  if (!user?.id) return null;
  return issueLoginForUserId(Number(user.id));
}

export default {
  async loginByCode(ctx) {
    const parsed = parseKioskIdentifyBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    const { code, password } = parsed.value;
    const knex = strapi.db.connection;
    const rows = await knex(USERS_TABLE)
      .where({ code })
      .select(
        'id',
        'document_id',
        'role_type',
        'password',
        'blocked',
        'provider',
        'username',
      )
      .limit(1);
    const user = mapUserRowFromDb(rows[0] as Record<string, unknown>);

    if (!canIdentifyAtKiosk(user)) {
      return ctx.forbidden('Invalid credentials');
    }
    if (user.provider && user.provider !== LOCAL_AUTH_PROVIDER) {
      return ctx.forbidden('Invalid credentials');
    }

    const userService = strapi.plugin('users-permissions').service('user');
    const validPassword = await userService.validatePassword(
      password,
      user.password,
    );
    if (!validPassword) {
      return ctx.forbidden('Invalid credentials');
    }

    if (!readKioskIdentifiableRole(user)) {
      return ctx.forbidden('Invalid credentials');
    }

    const body = await issueLoginForUserId(user.id);
    if (!body) return ctx.forbidden('Invalid credentials');
    ctx.body = body;
  },

  async loginByTag(ctx) {
    const parsed = parseKioskTagIdentifyBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    const knex = strapi.db.connection;
    const rows = await knex(USERS_TABLE)
      .where({ user_tag: parsed.value.userTag })
      .select(
        'id',
        'document_id',
        'role_type',
        'password',
        'blocked',
        'provider',
        'username',
      )
      .limit(1);
    const user = mapUserRowFromDb(rows[0] as Record<string, unknown>);

    if (!canIdentifyAtKiosk(user)) {
      return ctx.forbidden('Invalid credentials');
    }
    if (user.provider && user.provider !== LOCAL_AUTH_PROVIDER) {
      return ctx.forbidden('Invalid credentials');
    }

    const documentId = readUserDocumentId(user);
    if (!documentId || !readKioskIdentifiableRole(user)) {
      return ctx.forbidden('Invalid credentials');
    }

    const body = await issueLoginForUserId(user.id);
    if (!body) return ctx.forbidden('Invalid credentials');
    ctx.body = body;
  },

  async loginByFace(ctx) {
    const parsed = parseKioskFaceIdentifyBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    const users = await strapi.documents(USER_UID).findMany({
      filters: {
        blocked: { $ne: true },
        roleType: { $in: ['colaborator', 'admin', 'manager', 'leader'] },
      },
      fields: ['name', 'greetingGender', 'faceVector', 'blocked', 'roleType'],
      populate: {
        avatar: { fields: ['url'] },
        facePhoto: { fields: ['url'] },
      },
      pagination: { pageSize: 500 },
    });

    const gallery: Array<{ documentId: string; faceVector: number[] }> = [];
    const byDocumentId = new Map<
      string,
      ReturnType<typeof mapFaceIdentifyCandidate>
    >();

    for (const user of users ?? []) {
      const documentId = String(
        (user as { documentId?: string }).documentId ?? '',
      );
      const vector = normalizeFaceVector(
        (user as { faceVector?: unknown }).faceVector,
      );
      if (!documentId || !vector) continue;

      gallery.push({ documentId, faceVector: vector });
      byDocumentId.set(
        documentId,
        mapFaceIdentifyCandidate(
          user as Parameters<typeof mapFaceIdentifyCandidate>[0],
          { includeFaceVector: true },
        ),
      );
    }

    const ranked = rankFaceMatches(parsed.descriptor, gallery);

    if (ranked.status === 'match') {
      const topId = ranked.ranked[0]?.documentId;
      if (!topId) {
        ctx.body = { status: 'none' };
        return;
      }
      const login = await issueLoginForDocumentId(topId);
      if (!login) {
        ctx.body = { status: 'none' };
        return;
      }
      const match = byDocumentId.get(topId);
      const { faceVector: _omit, ...safeMatch } = match ?? {
        documentId: topId,
        name: login.user.name,
        greetingGender: null,
        avatarUrl: null,
        facePhotoUrl: null,
      };
      void _omit;
      ctx.body = { status: 'match', match: safeMatch, ...login };
      return;
    }

    if (ranked.status === 'ambiguous') {
      ctx.body = buildFaceIdentifyResponse(
        'ambiguous',
        ranked.ranked.map((row) => row.documentId),
        byDocumentId,
      );
      return;
    }

    ctx.body = { status: 'none' };
  },

  async loginByFaceConfirm(ctx) {
    const parsed = parseLoginByFaceConfirmBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    const user = await strapi.documents(USER_UID).findOne({
      documentId: parsed.value.documentId,
      fields: ['faceVector', 'blocked', 'roleType', 'name'],
      populate: {
        avatar: { fields: ['url'] },
        facePhoto: { fields: ['url'] },
      },
    });

    if (!user) return ctx.forbidden('Invalid credentials');
    if (!canEstablishAppSession(user.roleType as string, Boolean(user.blocked))) {
      return ctx.forbidden('Invalid credentials');
    }

    const stored = normalizeFaceVector(
      (user as { faceVector?: unknown }).faceVector,
    );
    if (!stored) return ctx.forbidden('Invalid credentials');

    const distance = faceDescriptorDistance(parsed.value.descriptor, stored);
    if (!isFaceMatchDistance(distance)) {
      return ctx.forbidden('Invalid credentials');
    }

    const login = await issueLoginForDocumentId(parsed.value.documentId);
    if (!login) return ctx.forbidden('Invalid credentials');

    const match = mapFaceIdentifyCandidate(
      user as Parameters<typeof mapFaceIdentifyCandidate>[0],
      { includeFaceVector: false },
    );
    ctx.body = { status: 'match', match, ...login };
  },
};
