import {
  isSubTaskAtWorkerCapacity,
  countActiveWorkersFromActivities,
} from './subtask-active-workers';
import {
  parseSubTaskDependencyIds,
  type SubTaskDependencyRow,
} from './sub-task-dependencies';
import type { ActivityTimeRow } from './task-time-spent';

const FINISHED_STATUS = 'finished';
const DISABLED_ACTIVATION_STATUS = 'disabled';
const LOCKED_ACTIVATION_STATUS = 'locked';

export type AutomaticActivationStatus = 'locked' | 'unlocked';

export type SubTaskActivationSyncRow = SubTaskDependencyRow & {
  maxSameTimeWorkers: number;
  activeWorkerCount: number;
};

export function areAllDependencySubTasksFinished(
  dependencyIds: string[],
  siblingsById: Map<string, Pick<SubTaskDependencyRow, 'status'>>,
): boolean {
  if (dependencyIds.length === 0) return true;

  return dependencyIds.every((documentId) => {
    const sibling = siblingsById.get(documentId);
    return sibling?.status === FINISHED_STATUS;
  });
}

/**
 * Derives locked/unlocked from sub-task status and dependency completion.
 * Returns null when activationStatus is disabled and must not be changed.
 */
export function computeAutomaticActivationStatus(
  subtask: SubTaskActivationSyncRow,
  siblingsById: Map<string, Pick<SubTaskDependencyRow, 'status'>>,
): AutomaticActivationStatus | null {
  const currentActivation = subtask.activationStatus ?? LOCKED_ACTIVATION_STATUS;
  if (currentActivation === DISABLED_ACTIVATION_STATUS) return null;

  if (isSubTaskAtWorkerCapacity(subtask.maxSameTimeWorkers, subtask.activeWorkerCount)) {
    return 'locked';
  }

  const dependencyIds = parseSubTaskDependencyIds(subtask.dependencies);
  const dependenciesFinished = areAllDependencySubTasksFinished(
    dependencyIds,
    siblingsById,
  );
  const ownNotFinished = subtask.status !== FINISHED_STATUS;

  if (ownNotFinished && dependenciesFinished) return 'unlocked';
  return 'locked';
}

export function resolveSubTaskActivationStatusUpdates(
  siblings: SubTaskActivationSyncRow[],
): Map<string, AutomaticActivationStatus> {
  const siblingsById = new Map(
    siblings.map((sibling) => [sibling.documentId, sibling]),
  );
  const updates = new Map<string, AutomaticActivationStatus>();

  for (const sibling of siblings) {
    const nextStatus = computeAutomaticActivationStatus(sibling, siblingsById);
    if (nextStatus === null) continue;

    const currentStatus = sibling.activationStatus ?? LOCKED_ACTIVATION_STATUS;
    if (currentStatus === nextStatus) continue;

    updates.set(sibling.documentId, nextStatus);
  }

  return updates;
}

const SUB_TASK_UID = 'api::sub-task.sub-task';
const TASK_UID = 'api::task.task';
const ACTIVITY_UID = 'api::activity.activity';

function groupActivitiesBySubTaskId(
  activities: {
    action?: string;
    timestamp?: Date | string;
    colaborator?: { id?: number } | null;
    subTask?: { id?: number } | null;
  }[],
): Map<number, ActivityTimeRow[]> {
  const bySubTask = new Map<number, ActivityTimeRow[]>();

  for (const activity of activities) {
    const subTaskId = activity.subTask?.id;
    const colaboratorId = activity.colaborator?.id;
    const timestamp = activity.timestamp;
    if (!subTaskId || !colaboratorId || !timestamp) continue;
    if (activity.action !== 'started' && activity.action !== 'stoped') continue;

    const rows = bySubTask.get(subTaskId) ?? [];
    rows.push({
      action: activity.action,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      colaboratorId,
    });
    bySubTask.set(subTaskId, rows);
  }

  return bySubTask;
}

async function fetchSubTasksForActivationSync(
  taskDocumentId: string,
): Promise<SubTaskActivationSyncRow[]> {
  const task = await strapi.db.query(TASK_UID).findOne({
    where: { documentId: taskDocumentId },
  });
  if (!task?.id) return [];

  const siblings = await strapi.db.query(SUB_TASK_UID).findMany({
    where: { task: task.id },
    select: [
      'id',
      'documentId',
      'status',
      'activationStatus',
      'dependencies',
      'maxSameTimeWorkers',
    ],
  });

  const subTaskIds = siblings
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');

  const activities =
    subTaskIds.length === 0
      ? []
      : await strapi.db.query(ACTIVITY_UID).findMany({
          where: { subTask: { id: { $in: subTaskIds } } },
          orderBy: { timestamp: 'asc' },
          populate: {
            colaborator: { select: ['id'] },
            subTask: { select: ['id'] },
          },
        });

  const activitiesBySubTaskId = groupActivitiesBySubTaskId(activities);

  return siblings.map((row) => ({
    documentId: String(row.documentId ?? ''),
    status: String(row.status ?? ''),
    activationStatus: row.activationStatus as string | null | undefined,
    dependencies: row.dependencies,
    maxSameTimeWorkers: Number(row.maxSameTimeWorkers ?? 1),
    activeWorkerCount: countActiveWorkersFromActivities(
      activitiesBySubTaskId.get(Number(row.id)) ?? [],
    ),
  }));
}

export async function syncSubTaskActivationStatusesForTask(
  taskDocumentId: string,
): Promise<void> {
  const siblings = await fetchSubTasksForActivationSync(taskDocumentId);
  const updates = resolveSubTaskActivationStatusUpdates(siblings);

  for (const [documentId, activationStatus] of updates) {
    await strapi.documents(SUB_TASK_UID).update({
      documentId,
      data: { activationStatus },
    });
  }
}

/** Runs all automatic sub-task checks for a task (extensible). */
export async function runTaskSubTaskSyncRoutine(
  taskDocumentId: string,
): Promise<void> {
  await syncSubTaskActivationStatusesForTask(taskDocumentId);
}
