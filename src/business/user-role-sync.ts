/**
 * Whether lifecycle should map roleType → role relation (no /roles API needed).
 */
export function shouldResolveRoleFromRoleType(
  data: Record<string, unknown>,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(data, 'roleType')) return false;
  if (!Object.prototype.hasOwnProperty.call(data, 'role')) return true;
  return data.role === null || data.role === undefined;
}
