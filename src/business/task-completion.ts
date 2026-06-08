import { filterSubTasksCountedForTask } from './sub-task-task-scope';

const FINISHED_STATUS = 'finished';

export type TaskStatus = 'queued' | 'producing' | 'paused' | 'finished';

export type SubTaskForTaskCompletion = {
  status: string;
  activationStatus?: string | null;
};

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

export function resolveTaskStatusFromSubTasks(
  subTasks: SubTaskForTaskCompletion[],
): TaskStatus {
  const counted = filterSubTasksCountedForTask(subTasks);
  if (counted.length === 0) return 'queued';
  if (areAllSubTasksFinished(counted)) return FINISHED_STATUS;
  if (counted.some((subTask) => subTask.status === 'producing')) {
    return 'producing';
  }
  if (counted.some((subTask) => subTask.status === 'paused')) {
    return 'paused';
  }
  return 'queued';
}