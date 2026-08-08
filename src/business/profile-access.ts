const PROFILE_ROLES = new Set(['colaborator', 'leader', 'manager']);

/** Roles that may edit their own profile (password + avatar + personal). */
export function canEditOwnProfile(roleType: string | null | undefined): boolean {
  if (!roleType) return false;
  return PROFILE_ROLES.has(roleType);
}
