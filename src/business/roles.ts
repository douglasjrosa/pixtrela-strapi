/**
 * Pure role-hierarchy rules for Pixtrela.
 */

export type HumanRoleType = 'admin' | 'manager' | 'leader' | 'colaborator';

export type RoleType = HumanRoleType | 'kiosk';

const MANAGEABLE_ROLES: Record<HumanRoleType, RoleType[]> = {
  admin: ['manager', 'leader', 'colaborator', 'kiosk'],
  manager: ['leader', 'colaborator'],
  leader: ['colaborator'],
  colaborator: [],
};

/**
 * Whether an actor with `actorRole` may create/deactivate a `targetRole` user.
 */
export function canManageRole(actorRole: RoleType, targetRole: RoleType): boolean {
  if (actorRole === 'kiosk') return false;
  return MANAGEABLE_ROLES[actorRole]?.includes(targetRole) ?? false;
}

/**
 * Only admin can hard-delete users.
 */
export function canDeleteUsers(actorRole: RoleType): boolean {
  return actorRole === 'admin';
}
