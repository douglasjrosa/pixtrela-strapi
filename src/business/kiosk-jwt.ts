import { KIOSK_ROLE_TYPE } from './user-role';
import { USERS_TABLE } from './kiosk-subtasks';

type JwtVerify = (token: string) => Promise<{ id?: number }>;

export async function resolveJwtUserId(
  authorizationHeader: string | undefined,
  verify: JwtVerify,
): Promise<number | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice('Bearer '.length);
  try {
    const decoded = await verify(token);
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

type KnexLike = {
  (table: string): {
    where: (filter: Record<string, unknown>) => {
      select: (...columns: string[]) => Promise<Array<Record<string, unknown>>>;
    };
  };
};

function readRoleType(row: Record<string, unknown> | undefined): string | null {
  if (!row) return null;
  const value = row.role_type ?? row.roleType;
  return typeof value === 'string' ? value : null;
}

export async function assertKioskJwt(knex: KnexLike, jwtUserId: number): Promise<void> {
  const rows = await knex(USERS_TABLE).where({ id: jwtUserId }).select('role_type');
  const roleType = readRoleType(rows[0]);
  if (roleType !== KIOSK_ROLE_TYPE) throw new Error('forbidden');
}

export async function resolveColaboratorUserId(
  knex: KnexLike,
  documentId: string,
): Promise<number> {
  const rows = await knex(USERS_TABLE)
    .where({ document_id: documentId })
    .select('id', 'role_type', 'blocked');
  const row = rows[0];

  if (!row?.id) throw new Error('notFound');

  const blocked = row.blocked === true || row.blocked === 1;
  if (blocked) throw new Error('forbidden');

  const roleType = readRoleType(row);
  if (roleType !== 'colaborator') throw new Error('forbidden');

  return Number(row.id);
}
