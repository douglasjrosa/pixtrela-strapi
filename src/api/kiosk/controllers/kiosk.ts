import {
  canIdentifyAtKiosk,
  mapUserRowFromDb,
  parseKioskIdentifyBody,
  readKioskIdentifiableRole,
} from '../../../business/kiosk-identify';
import {
  assertKioskJwt,
  resolveJwtUserId,
} from '../../../business/kiosk-jwt';
import {
  readUserDocumentId,
  USERS_TABLE,
} from '../../../business/kiosk-subtasks';
import { parseKioskColaboratorPasswordBody } from '../../../business/kiosk-staff-colaborators';
import { parseKioskColaboratorAvatarBody } from '../../../business/kiosk-avatar';
import { LOCAL_AUTH_PROVIDER } from '../../../business/user-auth';

async function verifyKioskJwtFromCtx(
  ctx: { request: { headers?: { authorization?: string } } },
): Promise<number | null> {
  const jwtUserId = await resolveJwtUserId(
    ctx.request.headers?.authorization,
    (token) => strapi.plugin('users-permissions').service('jwt').verify(token),
  );
  if (!jwtUserId) return null;

  const knex = strapi.db.connection;
  try {
    await assertKioskJwt(knex, jwtUserId);
  } catch {
    return null;
  }

  return jwtUserId;
}

export default {
  async identify(ctx) {
    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

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
    const validPassword = await userService.validatePassword(password, user.password);
    if (!validPassword) {
      return ctx.forbidden('Invalid credentials');
    }

    const documentId = readUserDocumentId(user);
    const role = readKioskIdentifiableRole(user);
    if (!documentId || !role) {
      return ctx.forbidden('Invalid credentials');
    }

    ctx.body = { documentId, role };
  },

  async listStaffColaborators(ctx) {
    const { documentId } = ctx.params;
    if (!documentId) return ctx.badRequest('documentId required');

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    const data = await strapi
      .service('api::kiosk.kiosk')
      .listStaffColaborators(documentId);
    ctx.body = { data };
  },

  async setColaboratorPassword(ctx) {
    const { documentId, colaboratorDocumentId } = ctx.params;
    if (!documentId || !colaboratorDocumentId) {
      return ctx.badRequest('documentId and colaboratorDocumentId required');
    }

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    const parsed = parseKioskColaboratorPasswordBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest(parsed.error);
    }

    try {
      await strapi
        .service('api::kiosk.kiosk')
        .setColaboratorPassword(
          documentId,
          colaboratorDocumentId,
          parsed.password,
        );
      ctx.body = { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      return ctx.badRequest(message);
    }
  },

  async setColaboratorAvatar(ctx) {
    const { documentId, colaboratorDocumentId } = ctx.params;
    if (!documentId || !colaboratorDocumentId) {
      return ctx.badRequest('documentId and colaboratorDocumentId required');
    }

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    const parsed = parseKioskColaboratorAvatarBody(ctx.request.body);
    if (parsed.ok === false) {
      return ctx.badRequest('Invalid avatar payload');
    }

    try {
      const buffer = Buffer.from(parsed.fileBase64, 'base64');
      const result = await strapi
        .service('api::kiosk.kiosk')
        .setColaboratorAvatar(
          documentId,
          colaboratorDocumentId,
          buffer,
          parsed.mimeType,
          parsed.fileName,
        );
      ctx.body = { ok: true, avatarUrl: result.avatarUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      if (
        message === 'invalidType' ||
        message === 'tooLarge' ||
        message === 'empty' ||
        message === 'uploadFailed'
      ) {
        return ctx.badRequest(message);
      }
      return ctx.badRequest(message);
    }
  },

  async getStaffUser(ctx) {
    const { documentId } = ctx.params;
    if (!documentId) return ctx.badRequest('documentId required');

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    const user = await strapi
      .service('api::kiosk.kiosk')
      .getStaffUserByDocumentId(documentId);
    if (!user) return ctx.notFound();

    ctx.body = user;
  },

  async listSubTasks(ctx) {
    const { documentId } = ctx.params;
    if (!documentId) return ctx.badRequest('documentId required');

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    const data = await strapi
      .service('api::kiosk.kiosk')
      .listAssignedSubTasks(documentId);

    ctx.body = { data };
  },

  async startSubTask(ctx) {
    const { documentId, subTaskDocumentId } = ctx.params;
    if (!documentId || !subTaskDocumentId) {
      return ctx.badRequest('documentId and subTaskDocumentId required');
    }

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    try {
      await strapi
        .service('api::kiosk.kiosk')
        .startSubTask(documentId, subTaskDocumentId, jwtUserId);
      ctx.body = { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      return ctx.badRequest(message);
    }
  },

  async stopSubTask(ctx) {
    const { documentId, subTaskDocumentId } = ctx.params;
    if (!documentId || !subTaskDocumentId) {
      return ctx.badRequest('documentId and subTaskDocumentId required');
    }

    const jwtUserId = await verifyKioskJwtFromCtx(ctx);
    if (!jwtUserId) return ctx.unauthorized();

    try {
      const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as {
        completed?: boolean;
        isCompleted?: boolean;
        qty?: number;
      };

      await strapi
        .service('api::kiosk.kiosk')
        .stopSubTask(documentId, subTaskDocumentId, jwtUserId, body);
      ctx.body = { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      if (message === 'forbidden') return ctx.forbidden();
      if (message === 'notFound') return ctx.notFound();
      return ctx.badRequest(message);
    }
  },
};
