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
 * Task total expected time = sum of counted sub-task expectedTime values.
 * Each sub-task.expectedTime is already scaled by task.qty at create time.
 * Disabled sub-tasks are excluded, same as if they were deleted.
 */
export function calculateTotalExpectedTime(
  subTaskExpectedTimes: number[],
): number {
  return subTaskExpectedTimes.reduce(
    (total, seconds) => total + Math.max(0, Number(seconds) || 0),
    0,
  );
}
