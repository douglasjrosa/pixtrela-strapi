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

function groupByColaborator(
  rows: ActivityTimeRow[],
): Map<number, ActivityTimeRow[]> {
  const map = new Map<number, ActivityTimeRow[]>();
  for (const row of rows) {
    const list = map.get(row.colaboratorId) ?? [];
    list.push(row);
    map.set(row.colaboratorId, list);
  }
  return map;
}

function sumColaboratorSessionSeconds(
  rows: ActivityTimeRow[],
  now: Date,
): number {
  const sorted = sortByTimestamp(rows);
  let openStart: Date | null = null;
  let total = 0;

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

  return total;
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
    total += sumColaboratorSessionSeconds(colaboratorActivities, now);
  }

  return total;
}

/** Per-colaborator time spent from start/stop activities. */
export function listTimeSpentByColaborator(
  activities: ActivityTimeRow[],
  now: Date,
): Array<{ colaboratorId: number; timeSpentSeconds: number }> {
  const byColaborator = groupByColaborator(activities);
  const result: Array<{ colaboratorId: number; timeSpentSeconds: number }> = [];

  for (const [colaboratorId, rows] of byColaborator.entries()) {
    const timeSpentSeconds = sumColaboratorSessionSeconds(rows, now);
    if (timeSpentSeconds > 0) {
      result.push({ colaboratorId, timeSpentSeconds });
    }
  }

  return result;
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
