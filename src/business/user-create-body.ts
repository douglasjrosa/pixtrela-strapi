import { isAssignableRoleType } from './user-role';

export const PIXTRELA_EMAIL_DOMAIN = 'pixtrela.local';

/** Synthetic email when CM/frontend omits email (Strapi UP requires email). */
export function deriveUserEmail(username: unknown): string {
  const normalized = String(username).trim().toLowerCase();
  return `${normalized}@${PIXTRELA_EMAIL_DOMAIN}`;
}

async function resolveRoleIdFromType(roleType: string): Promise<number | null> {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  return role?.id ?? null;
}

/**
 * Maps roleType → role id and fills email before users-permissions validation.
 */
export async function prepareUserWriteBody(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const next = { ...body };

  if (!next.email && next.username) {
    next.email = deriveUserEmail(next.username);
  }

  if (
    !next.role &&
    typeof next.roleType === 'string' &&
    isAssignableRoleType(next.roleType)
  ) {
    const roleId = await resolveRoleIdFromType(next.roleType);
    if (roleId) next.role = roleId;
  }

  return next;
}
