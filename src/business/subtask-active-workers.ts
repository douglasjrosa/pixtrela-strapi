import type { ActivityTimeRow } from './task-time-spent';

/**
 * Walks chronological started/stoped actions for one colaborator.
 * Assignment is irrelevant — only the open session matters.
 */
export function hasOpenStartedSessionFromActions(
  actions: ReadonlyArray<'started' | 'stoped'>,
): boolean {
  let isActive = false;
  for (const action of actions) {
    if (action === 'started') isActive = true;
    if (action === 'stoped') isActive = false;
  }
  return isActive;
}

function isColaboratorActiveFromSortedActivities(
  rows: ActivityTimeRow[],
): boolean {
  const sorted = [...rows].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  return hasOpenStartedSessionFromActions(sorted.map((row) => row.action));
}

export function listActiveColaboratorIdsFromActivities(
  activities: ActivityTimeRow[],
): number[] {
  const byColaborator = new Map<number, ActivityTimeRow[]>();

  for (const row of activities) {
    const list = byColaborator.get(row.colaboratorId) ?? [];
    list.push(row);
    byColaborator.set(row.colaboratorId, list);
  }

  const activeIds: number[] = [];

  for (const [colaboratorId, rows] of byColaborator.entries()) {
    if (isColaboratorActiveFromSortedActivities(rows)) {
      activeIds.push(colaboratorId);
    }
  }

  return activeIds;
}

export function countActiveWorkersFromActivities(
  activities: ActivityTimeRow[],
): number {
  return listActiveColaboratorIdsFromActivities(activities).length;
}

export function isSubTaskAtWorkerCapacity(
  maxSameTimeWorkers: number,
  activeWorkerCount: number,
): boolean {
  const capacity = Math.max(1, maxSameTimeWorkers);
  return activeWorkerCount >= capacity;
}

/**
 * When a dual-worker sub-task is at capacity, hide it from assigned viewers
 * who are not currently one of the active workers.
 */
export function shouldHideSubTaskFromKioskQueue(input: {
  maxSameTimeWorkers: number;
  activeColaboratorIds: number[];
  viewerColaboratorId: number;
}): boolean {
  if (
    !isSubTaskAtWorkerCapacity(
      input.maxSameTimeWorkers,
      input.activeColaboratorIds.length,
    )
  ) {
    return false;
  }
  return !input.activeColaboratorIds.includes(input.viewerColaboratorId);
}
