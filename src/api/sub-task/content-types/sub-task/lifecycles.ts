import { assertReasonWhenDeactivating } from '../../../../business/deactivation-reason';
import { scaleExpectedTimeByTaskQty } from '../../../../business/work-currency';
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

async function resolveTaskQtyFromRelation(
  taskRef: unknown,
): Promise<number> {
  if (taskRef == null) return 1;

  if (typeof taskRef === 'object' && taskRef !== null) {
    const record = taskRef as { documentId?: string; id?: number; qty?: number };
    if (typeof record.qty === 'number') return Math.max(1, record.qty);
    if (typeof record.documentId === 'string') {
      const task = await strapi.documents(TASK_UID).findOne({
        documentId: record.documentId,
        fields: ['qty'],
      });
      return Math.max(1, Number(task?.qty ?? 1));
    }
    if (typeof record.id === 'number') {
      const task = await strapi.db.query(TASK_UID).findOne({
        where: { id: record.id },
        select: ['qty'],
      });
      return Math.max(1, Number(task?.qty ?? 1));
    }
  }

  if (typeof taskRef === 'string') {
    const task = await strapi.documents(TASK_UID).findOne({
      documentId: taskRef,
      fields: ['qty'],
    });
    return Math.max(1, Number(task?.qty ?? 1));
  }

  if (typeof taskRef === 'number') {
    const task = await strapi.db.query(TASK_UID).findOne({
      where: { id: taskRef },
      select: ['qty'],
    });
    return Math.max(1, Number(task?.qty ?? 1));
  }

  return 1;
}

export default {
  async beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    const data = event.params.data;
    assertDisablingReason(data);
    if (!data) return;

    const taskQty = await resolveTaskQtyFromRelation(data.task);
    data.expectedTime = scaleExpectedTimeByTaskQty(
      Number(data.expectedTime ?? 0),
      taskQty,
    );
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
