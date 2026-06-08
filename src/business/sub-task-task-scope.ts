export const DISABLED_ACTIVATION_STATUS = 'disabled';

export function isSubTaskCountedForTask(
  activationStatus: string | null | undefined,
): boolean {
  return activationStatus !== DISABLED_ACTIVATION_STATUS;
}

export function filterSubTasksCountedForTask<
  T extends { activationStatus?: string | null },
>(subTasks: T[]): T[] {
  return subTasks.filter((subTask) =>
    isSubTaskCountedForTask(subTask.activationStatus),
  );
}
