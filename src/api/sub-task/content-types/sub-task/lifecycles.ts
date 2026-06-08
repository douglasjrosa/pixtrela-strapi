import { findLockedSubTasksToUnlock } from '../../../../business/sub-task-dependencies';
import {
  resolveTaskStatusFromSubTasks,
  type TaskStatus,
} from '../../../../business/task-completion';

const SUB_TASK_UID = 'api::sub-task.sub-task';
const TASK_UID = 'api::task.task';
const TASK_SERVICE_UID = 'api::task.task';
const FINISHED_STATUS: TaskStatus = 'finished';
async function readTaskDocumentId(
  subTaskDocumentId: string,
): Promise<string | null> {
  const subTask = await strapi.documents(SUB_TASK_UID).findOne({
    documentId: subTaskDocumentId,
    fields: ['documentId'],
    populate: { task: { fields: ['documentId'] } },
  });
  const task = subTask?.task as { documentId?: string } | null;
  return task?.documentId ?? null;
}

async function syncParentTaskExpectedTime(
  subTaskDocumentId: string,
): Promise<void> {
  const taskDocumentId = await readTaskDocumentId(subTaskDocumentId);
  if (!taskDocumentId) return;
  await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
}

async function syncParentTaskCompletionForTask(
  taskDocumentId: string,
): Promise<void> {
  const task = await strapi.documents(TASK_UID).findOne({
    documentId: taskDocumentId,
    fields: ['status', 'endedAt'],
  });
  if (!task) return;

  const siblings = await strapi.documents(SUB_TASK_UID).findMany({
    filters: { task: { documentId: taskDocumentId } },
    fields: ['status', 'activationStatus'],
  });

  const inputs = siblings.map((row) => ({
    status: String(row.status ?? ''),
    activationStatus: row.activationStatus as string | null | undefined,
  }));

  const nextStatus = resolveTaskStatusFromSubTasks(inputs);
  const currentStatus = String(task.status ?? '');

  if (nextStatus === currentStatus) return;

  if (nextStatus === FINISHED_STATUS) {
    await strapi.documents(TASK_UID).update({
      documentId: taskDocumentId,
      data: {
        status: FINISHED_STATUS,
        endedAt: new Date(),
      },
    });
    return;
  }

  await strapi.documents(TASK_UID).update({
    documentId: taskDocumentId,
    data: {
      status: nextStatus,
      endedAt: null,
    },
  });
}

async function syncParentTaskCompletion(
  subTaskDocumentId: string,
): Promise<void> {
  const taskDocumentId = await readTaskDocumentId(subTaskDocumentId);
  if (!taskDocumentId) return;
  await syncParentTaskCompletionForTask(taskDocumentId);
}

async function unlockDependentsForTask(taskDocumentId: string): Promise<void> {
  const siblings = await strapi.documents(SUB_TASK_UID).findMany({
    filters: { task: { documentId: taskDocumentId } },
    fields: ['documentId', 'status', 'activationStatus', 'dependencies'],
  });

  const rows = siblings.map((row) => ({
    documentId: String(row.documentId ?? ''),
    status: String(row.status ?? ''),
    activationStatus: row.activationStatus as string | null | undefined,
    dependencies: row.dependencies,
  }));

  const toUnlock = findLockedSubTasksToUnlock(rows);
  await Promise.all(
    toUnlock.map((documentId) =>
      strapi.documents(SUB_TASK_UID).update({
        documentId,
        data: { activationStatus: 'unlocked' },
      }),
    ),
  );
}
/**
 * When a sub-task becomes finished, mark the parent task finished if all
 * sibling sub-tasks are finished too. Keep task totalExpectedTime in sync.
 */
export default {
  async afterCreate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;
    await syncParentTaskExpectedTime(documentId);
  },

  async afterUpdate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;

    await syncParentTaskExpectedTime(documentId);
    await syncParentTaskCompletion(documentId);

    const taskDocumentId = await readTaskDocumentId(documentId);
    if (taskDocumentId) {
      await unlockDependentsForTask(taskDocumentId);
    }
  },
  async beforeDelete(event: {
    params: { documentId?: string };
    state: { taskDocumentId?: string | null };
  }) {
    const documentId = event.params?.documentId;
    if (!documentId) return;
    event.state.taskDocumentId = await readTaskDocumentId(documentId);
  },

  async afterDelete(event: {
    state: { taskDocumentId?: string | null };
  }) {
    const taskDocumentId = event.state.taskDocumentId;
    if (!taskDocumentId) return;
    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
    await syncParentTaskCompletionForTask(taskDocumentId);
  },
};
