import type { HumanRoleType, RoleType } from './roles';

export const KIOSK_ROLE_TYPE = 'kiosk' as const;

export const APP_ROLE_TYPES: HumanRoleType[] = [
  'admin',
  'manager',
  'leader',
  'colaborator',
];

const APP_ROLE_SET = new Set<string>(APP_ROLE_TYPES);

export function isAppRoleType(value: string): value is HumanRoleType {
  return APP_ROLE_SET.has(value);
}

export function isKioskRoleType(value: string): value is typeof KIOSK_ROLE_TYPE {
  return value === KIOSK_ROLE_TYPE;
}

export function isAssignableRoleType(value: string): value is RoleType {
  return isAppRoleType(value) || isKioskRoleType(value);
}

/** Scalar on user (like sys-rbx pemission) returned by /auth/local. */
export function normalizeRoleType(value: unknown): HumanRoleType | null {
  if (typeof value !== 'string' || !isAppRoleType(value)) return null;
  return value;
}
