import { calculateActivityDurationSeconds } from './activity-duration';

const PRODUCING_STATUS = 'producing';

export type ActivityTimeRow = {
  action: 'started' | 'stoped';
  timestamp: Date;
  colaboratorId: number;
};

export type SubTaskTimeSpentInput = {
  timeSpent: number;
  status: string;
  activities: ActivityTimeRow[];
};

function sortByTimestamp(rows: ActivityTimeRow[]): ActivityTimeRow[] {
  return [...rows].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function groupByColaborator(rows: ActivityTimeRow[]): Map<number, ActivityTimeRow[]> {
  const map = new Map<number, ActivityTimeRow[]>();
  for (const row of rows) {
    const list = map.get(row.colaboratorId) ?? [];
    list.push(row);
    map.set(row.colaboratorId, list);
  }
  return map;
}

/**
 * Sums completed sessions and open started activities up to `now`.
 */
export function calculateTimeSpentFromActivities(
  activities: ActivityTimeRow[],
  now: Date,
): number {
  const byColaborator = groupByColaborator(activities);
  let total = 0;

  for (const colaboratorActivities of byColaborator.values()) {
    const sorted = sortByTimestamp(colaboratorActivities);
    let openStart: Date | null = null;

    for (const activity of sorted) {
      if (activity.action === 'started') {
        openStart = activity.timestamp;
        continue;
      }

      if (activity.action === 'stoped' && openStart) {
        total += calculateActivityDurationSeconds(openStart, activity.timestamp);
        openStart = null;
      }
    }

    if (openStart) {
      total += calculateActivityDurationSeconds(openStart, now);
    }
  }

  return total;
}

/**
 * Finished sub-tasks use persisted timeSpent; producing ones add live activity time.
 */
export function calculateSubTaskLiveTimeSpent(
  input: SubTaskTimeSpentInput,
  now: Date,
): number {
  if (input.status === PRODUCING_STATUS) {
    return calculateTimeSpentFromActivities(input.activities, now);
  }
  return Math.max(0, input.timeSpent);
}

/** Task total time spent = sum of each sub-task live time spent. */
export function calculateTaskTotalTimeSpent(
  subTasks: SubTaskTimeSpentInput[],
  now: Date,
): number {
  return subTasks.reduce(
    (total, subTask) => total + calculateSubTaskLiveTimeSpent(subTask, now),
    0,
  );
}
