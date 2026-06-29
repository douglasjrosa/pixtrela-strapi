import type { ActivityTimeRow } from './task-time-spent';

export const DUAL_WORKER_CAPACITY = 2;

export function countActiveWorkersFromActivities(
  activities: ActivityTimeRow[],
): number {
  const byColaborator = new Map<number, ActivityTimeRow[]>();

  for (const row of activities) {
    const list = byColaborator.get(row.colaboratorId) ?? [];
    list.push(row);
    byColaborator.set(row.colaboratorId, list);
  }

  let activeCount = 0;

  for (const rows of byColaborator.values()) {
    const sorted = [...rows].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    let isActive = false;

    for (const activity of sorted) {
      if (activity.action === 'started') isActive = true;
      if (activity.action === 'stoped') isActive = false;
    }

    if (isActive) activeCount += 1;
  }

  return activeCount;
}

export function isSubTaskAtWorkerCapacity(
  maxSameTimeWorkers: number,
  activeWorkerCount: number,
): boolean {
  return (
    maxSameTimeWorkers === DUAL_WORKER_CAPACITY &&
    activeWorkerCount >= DUAL_WORKER_CAPACITY
  );
}
