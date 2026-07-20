import { filterSubTasksCountedForTask } from './sub-task-task-scope';

const FINISHED_STATUS = 'finished';

export type TaskStatus =
  | 'waiting'
  | 'producing'
  | 'paused'
  | 'finished'
  | 'reviewed'
  | 'delivered';

export const TASK_STATUSES: TaskStatus[] = [
  'waiting',
  'producing',
  'paused',
  'finished',
  'reviewed',
  'delivered',
];

/** Statuses after production work is done (finished and beyond). */
export const COMPLETED_TASK_STATUSES: readonly TaskStatus[] = [
  'finished',
  'reviewed',
  'delivered',
];

export type SubTaskForTaskCompletion = {
  status: string;
  activationStatus?: string | null;
};

export function isCompletedTaskStatus(status: string): boolean {
  return (COMPLETED_TASK_STATUSES as readonly string[]).includes(status);
}

/**
 * When all sub-tasks are finished, do not downgrade reviewed/delivered
 * (or re-apply finished) from the derived status.
 */
export function shouldKeepCompletedTaskStatus(
  currentStatus: string,
  nextStatus: TaskStatus,
): boolean {
  return (
    nextStatus === FINISHED_STATUS && isCompletedTaskStatus(currentStatus)
  );
}

/**
 * A task is completed when every counted sub-task has status "finished".
 * Disabled sub-tasks are excluded, same as if they were deleted.
 */
export function areAllSubTasksFinished(
  subTasks: SubTaskForTaskCompletion[],
): boolean {
  const counted = filterSubTasksCountedForTask(subTasks);
  if (counted.length === 0) return false;
  return counted.every((subTask) => subTask.status === FINISHED_STATUS);
}

/**
 * Derives parent Task.status from counted SubTask statuses:
 * - all waiting → waiting
 * - any producing → producing
 * - all finished → finished
 * - otherwise (mix without producing) → paused
 */
export function resolveTaskStatusFromSubTasks(
  subTasks: SubTaskForTaskCompletion[],
): TaskStatus {
  const counted = filterSubTasksCountedForTask(subTasks);
  if (counted.length === 0) return 'waiting';
  if (counted.every((subTask) => subTask.status === 'waiting')) {
    return 'waiting';
  }
  if (counted.some((subTask) => subTask.status === 'producing')) {
    return 'producing';
  }
  if (areAllSubTasksFinished(counted)) return FINISHED_STATUS;
  return 'paused';
}
