export type DashboardActorRole = 'admin' | 'manager' | 'leader' | 'colaborator';

export interface ScopedColaborator {
  documentId: string;
  name: string;
  code: number;
}

/** Colaborators visible in staff pickers and leader-scoped rankings. */
export function filterColaboratorsForActor(
  actorRole: DashboardActorRole,
  colaborators: ScopedColaborator[],
  leaderTeamDocumentIds: Set<string>,
): ScopedColaborator[] {
  if (actorRole === 'admin' || actorRole === 'manager') {
    return colaborators;
  }

  if (actorRole === 'leader') {
    return colaborators.filter((colaborator) =>
      leaderTeamDocumentIds.has(colaborator.documentId),
    );
  }

  return [];
}

/** Whether actor may load detailed insights for the target colaborator. */
export function canViewColaboratorInsights(
  actorRole: DashboardActorRole,
  actorDocumentId: string,
  targetDocumentId: string,
  leaderTeamDocumentIds: Set<string>,
): boolean {
  if (actorRole === 'admin' || actorRole === 'manager') return true;

  if (actorRole === 'colaborator') {
    return actorDocumentId === targetDocumentId;
  }

  if (actorRole === 'leader') {
    return leaderTeamDocumentIds.has(targetDocumentId);
  }

  return false;
}

/** Ranking participants: all colaborators except leaders see only their team. */
export function filterRankingColaborators(
  actorRole: DashboardActorRole,
  colaborators: ScopedColaborator[],
  leaderTeamDocumentIds: Set<string>,
): ScopedColaborator[] {
  if (actorRole === 'leader') {
    return filterColaboratorsForActor('leader', colaborators, leaderTeamDocumentIds);
  }

  return colaborators;
}
