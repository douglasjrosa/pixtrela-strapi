/** Active when UNTILL is empty; inactive teams are historical only. */
export function isTeamActive(untill: string | Date | null | undefined): boolean {
  if (!untill) return true;
  return false;
}

export const ACTIVE_TEAM_FILTER = {
  untill: { $null: true },
};
