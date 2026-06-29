export type KioskColaboratorRow = {
  documentId: string;
  name: string;
  code: number;
  avatarUrl?: string | null;
};

export type KioskStaffActorRole = 'admin' | 'manager' | 'leader';

export function filterColaboratorsForStaffRole(
  actorRole: KioskStaffActorRole,
  colaborators: KioskColaboratorRow[],
  leaderTeamColaboratorDocumentIds: Set<string>,
): KioskColaboratorRow[] {
  if (actorRole === 'admin' || actorRole === 'manager') {
    return colaborators;
  }

  return colaborators.filter((colaborator) =>
    leaderTeamColaboratorDocumentIds.has(colaborator.documentId),
  );
}

export function canStaffSetColaboratorPassword(
  actorRole: KioskStaffActorRole,
  targetIsColaborator: boolean,
  leaderTeamColaboratorDocumentIds: Set<string>,
  targetDocumentId: string,
): boolean {
  if (!targetIsColaborator) return false;
  if (actorRole === 'admin' || actorRole === 'manager') return true;
  return leaderTeamColaboratorDocumentIds.has(targetDocumentId);
}

export function parseKioskColaboratorPasswordBody(
  body: unknown,
): { ok: true; password: string } | { ok: false; error: string } {
  const payload =
    body && typeof body === 'object' && 'data' in body
      ? (body as { data: unknown }).data
      : body;

  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid body' };
  }

  const password = (payload as { password?: unknown }).password;
  if (typeof password !== 'string' || password.length < 6) {
    return { ok: false, error: 'Invalid password' };
  }

  return { ok: true, password };
}
