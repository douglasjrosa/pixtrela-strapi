import { DEFAULT_TIME_ZONE, isSameCalendarDay } from './datetime-timezone';

const FINISHED_STATUS = 'finished';

const STATUS_SORT_ORDER: Record<string, number> = {
  producing: 0,
  waiting: 1,
  paused: 1,
  finished: 2,
};

export type KioskQueueRow = {
  documentId: string;
  name: string;
  index: number;
  status: string;
  activationStatus: string;
  taskIndex: number;
  finishedAt: string | null;
};

export function isVisibleInKioskDailyQueue(
  subTask: { status: string },
  finishedAt: Date | string | null,
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): boolean {
  if (subTask.status !== FINISHED_STATUS) return true;
  if (!finishedAt) return false;

  const finishedDate =
    finishedAt instanceof Date ? finishedAt : new Date(finishedAt);
  if (Number.isNaN(finishedDate.getTime())) return false;

  return isSameCalendarDay(finishedDate, now, timeZone);
}

export function filterKioskDailyQueue<T extends KioskQueueRow>(
  rows: T[],
  now: Date,
  timeZone = DEFAULT_TIME_ZONE,
): T[] {
  return rows.filter((row) =>
    isVisibleInKioskDailyQueue(
      row,
      row.finishedAt ? new Date(row.finishedAt) : null,
      now,
      timeZone,
    ),
  );
}

function resolveStatusSortOrder(status: string): number {
  return STATUS_SORT_ORDER[status] ?? 1;
}

export function sortKioskDailyQueue<T extends KioskQueueRow>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const statusDiff =
      resolveStatusSortOrder(left.status) -
      resolveStatusSortOrder(right.status);
    if (statusDiff !== 0) return statusDiff;

    const taskDiff = left.taskIndex - right.taskIndex;
    if (taskDiff !== 0) return taskDiff;

    return left.index - right.index;
  });
}
