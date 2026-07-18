import { assertReasonWhenDeactivating } from '../../../../business/deactivation-reason';
import { runTaskSubTaskSyncRoutine } from '../../../../business/subtask-activation-sync';
import {
  resolveTaskStatusFromSubTasks,
  type TaskStatus,
} from '../../../../business/task-completion';
import { shouldSetTaskStartedAt } from '../../../../business/task-started-at';

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
    fields: ['status', 'endedAt', 'startedAt'],
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

  if (nextStatus === currentStatus && !shouldSetTaskStartedAt(nextStatus, task.startedAt)) {
    return;
  }

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

  const updateData: {
    status: TaskStatus;
    endedAt: null;
    startedAt?: Date;
  } = {
    status: nextStatus,
    endedAt: null,
  };

  if (shouldSetTaskStartedAt(nextStatus, task.startedAt)) {
    updateData.startedAt = new Date();
  }

  await strapi.documents(TASK_UID).update({
    documentId: taskDocumentId,
    data: updateData,
  });
}

async function syncSubTasksForTask(taskDocumentId: string): Promise<void> {
  await runTaskSubTaskSyncRoutine(taskDocumentId);
  await syncParentTaskCompletionForTask(taskDocumentId);
}

/**
 * When a sub-task becomes finished, mark the parent task finished if all
 * sibling sub-tasks are finished too. Keep task totalExpectedTime in sync.
 */
function assertDisablingReason(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  assertReasonWhenDeactivating(
    data.activationStatus === 'disabled',
    data.reasonForDisabling,
  );
}

export default {
  async beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    assertDisablingReason(event.params.data);
    // expectedTime × task.qty is applied by Document Service middleware
    // (registerSubTaskExpectedTimeScaling) — content-type beforeCreate is not
    // reliable for strapi.documents().create in Strapi 5.
  },

  async beforeUpdate(event: { params: { data?: Record<string, unknown> } }) {
    assertDisablingReason(event.params.data);
  },

  async afterCreate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;
    await syncParentTaskExpectedTime(documentId);

    const taskDocumentId = await readTaskDocumentId(documentId);
    if (taskDocumentId) {
      await syncSubTasksForTask(taskDocumentId);
    }
  },

  async afterUpdate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;

    await syncParentTaskExpectedTime(documentId);

    const taskDocumentId = await readTaskDocumentId(documentId);
    if (taskDocumentId) {
      await syncSubTasksForTask(taskDocumentId);
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
    await syncSubTasksForTask(taskDocumentId);
  },
};
