const FINISHED_STATUS = 'finished';
const LOCKED_ACTIVATION_STATUS = 'locked';

export type SubTaskDependencyRow = {
  documentId: string;
  status: string;
  activationStatus?: string | null;
  dependencies?: unknown;
};

export function parseSubTaskDependencyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0,
  );
}

export function areSubTaskDependenciesSatisfied(
  dependencyIds: string[],
  siblingsById: Map<string, Pick<SubTaskDependencyRow, 'status'>>,
): boolean {
  if (dependencyIds.length === 0) return false;
  return dependencyIds.every((id) => {
    const sibling = siblingsById.get(id);
    return sibling?.status === FINISHED_STATUS;
  });
}

function isLockedForDependencyUnlock(
  activationStatus: string | null | undefined,
): boolean {
  return (activationStatus ?? LOCKED_ACTIVATION_STATUS) === LOCKED_ACTIVATION_STATUS;
}

export function findLockedSubTasksToUnlock(
  siblings: SubTaskDependencyRow[],
): string[] {
  const siblingsById = new Map(
    siblings.map((sibling) => [sibling.documentId, sibling]),
  );

  return siblings
    .filter((sibling) => isLockedForDependencyUnlock(sibling.activationStatus))
    .filter((sibling) => {
      const dependencyIds = parseSubTaskDependencyIds(sibling.dependencies);
      return areSubTaskDependenciesSatisfied(dependencyIds, siblingsById);
    })
    .map((sibling) => sibling.documentId);
}
