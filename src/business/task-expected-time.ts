import { filterSubTasksCountedForTask } from './sub-task-task-scope';

export type SubTaskExpectedTimeInput = {
  expectedTime?: number | null;
  activationStatus?: string | null;
};

export function collectSubTaskExpectedTimes(
  subTasks: SubTaskExpectedTimeInput[],
): number[] {
  return filterSubTasksCountedForTask(subTasks).map((subTask) =>
    Number(subTask.expectedTime ?? 0),
  );
}

/**
 * Task total expected time = sum(counted sub-task expectedTime) * task qty.
 * Disabled sub-tasks are excluded, same as if they were deleted.
 */
export function calculateTotalExpectedTime(
  subTaskExpectedTimes: number[],
  taskQty: number,
): number {  const safeQty = Math.max(1, taskQty);
  const sum = subTaskExpectedTimes.reduce(
    (total, seconds) => total + Math.max(0, Number(seconds) || 0),
    0,
  );
  return sum * safeQty;
}
