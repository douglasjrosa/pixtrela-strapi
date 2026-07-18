import { assertReasonWhenDeactivating } from '../../../../business/deactivation-reason';
import { runTaskSubTaskSyncRoutine } from '../../../../business/subtask-activation-sync';
import {
  mapTemplateSubTasksToCreatePayloads,
  resolveTemplateDependencyIds,
  shouldCopyTemplateSubtasks,
  type TemplateSubTaskComponent,
} from '../../../../business/copy-template-subtasks';
import {
  rescaleExpectedTimeForTaskQtyChange,
  scaleExpectedTimeByTaskQty,
} from '../../../../business/work-currency';

const TASK_UID = 'api::task.task';
const TASK_SERVICE_UID = 'api::task.task';
const TEMPLATE_TASK_UID = 'api::template-task.template-task';
const SUB_TASK_UID = 'api::sub-task.sub-task';

/** Fields written by the sync services themselves (plus Strapi internals). */
const COMPUTED_FIELDS = new Set([
  'totalExpectedTime',
  'totalTimeSpent',
  'updatedAt',
  'publishedAt',
]);

/**
 * True when an update touched only computed/internal fields. Such updates are
 * triggered by syncTotalExpectedTime/syncTotalTimeSpent, so re-running the sync
 * would recurse into afterUpdate forever.
 */
function isComputedOnlyUpdate(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const keys = Object.keys(data);
  if (keys.length === 0) return false;
  return keys.every((key) => COMPUTED_FIELDS.has(key));
}

async function rescaleSubTasksForTaskQtyChange(
  taskDocumentId: string,
  previousTaskQty: number,
  nextTaskQty: number,
): Promise<void> {
  const previousQty = Math.max(1, previousTaskQty);
  const nextQty = Math.max(1, nextTaskQty);
  if (previousQty === nextQty) return;

  const subTasks = await strapi.documents(SUB_TASK_UID).findMany({
    filters: { task: { documentId: taskDocumentId } },
    fields: ['documentId', 'expectedTime'],
  });

  for (const subTask of subTasks) {
    if (!subTask.documentId) continue;
    const nextExpected = rescaleExpectedTimeForTaskQtyChange(
      Number(subTask.expectedTime ?? 0),
      previousQty,
      nextQty,
    );
    await strapi.db.query(SUB_TASK_UID).update({
      where: { documentId: subTask.documentId },
      data: { expectedTime: nextExpected },
    });
  }
}

/**
 * When a task is created with templateTaskCode, copy template subTask components
 * into SubTask records linked to the new task.
 */
export default {
  async beforeUpdate(event: {
    params: {
      data?: Record<string, unknown>;
      documentId?: string;
      where?: { documentId?: string };
    };
    state: { previousTaskQty?: number };
  }) {
    const data = event.params.data;
    if (!data) return;
    assertReasonWhenDeactivating(
      data.active === false,
      data.reasonForDeactivation,
    );

    if (!Object.prototype.hasOwnProperty.call(data, 'qty')) return;

    const documentId =
      event.params.documentId ?? event.params.where?.documentId;
    if (!documentId) return;

    const current = await strapi.documents(TASK_UID).findOne({
      documentId,
      fields: ['qty'],
    });
    event.state.previousTaskQty = Math.max(1, Number(current?.qty ?? 1));
  },

  async afterCreate(event: { result: { documentId?: string } }) {
    const taskDocumentId = event.result?.documentId;
    if (!taskDocumentId) return;

    const task = await strapi.documents(TASK_UID).findOne({
      documentId: taskDocumentId,
      fields: ['templateTaskCode', 'qty'],
    });
    if (!task) return;

    const templateTaskCode = task.templateTaskCode as string | null | undefined;
    if (!shouldCopyTemplateSubtasks(templateTaskCode)) return;

    const code = templateTaskCode!.trim();
    const [template] = await strapi.documents(TEMPLATE_TASK_UID).findMany({
      filters: { code },
      populate: { subTask: true },
      limit: 1,
    });
    if (!template) return;

    const payloads = mapTemplateSubTasksToCreatePayloads(
      template.subTask as TemplateSubTaskComponent[] | null | undefined,
      taskDocumentId,
    );

    const documentIdsByIndex = new Map<number, string>();
    const sortedPayloads = [...payloads].sort((a, b) => a.index - b.index);
    const taskQty = Math.max(1, Number(task.qty ?? 1));

    for (const data of sortedPayloads) {
      const dependencies = resolveTemplateDependencyIds(
        data.dependencyRefs,
        documentIdsByIndex,
      );
      // Pass template unit expectedTime on create. Document middleware may or may
      // not scale correctly; the update below always writes the canonical value.
      const scaledExpectedTime = scaleExpectedTimeByTaskQty(
        data.expectedTime,
        taskQty,
      );
      const created = await strapi.documents(SUB_TASK_UID).create({
        data: {
          name: data.name,
          task: data.task,
          qty: data.qty,
          sharingType: data.sharingType,
          maxSameTimeWorkers: data.maxSameTimeWorkers,
          index: data.index,
          dependencies,
          status: data.status,
          activationStatus: data.activationStatus,
          expectedTime: data.expectedTime,
          timeSpent: data.timeSpent,
        },
      });

      const subTaskDocumentId = created.documentId;
      if (!subTaskDocumentId) continue;

      documentIdsByIndex.set(data.index, subTaskDocumentId);

      // Must use documents().update — db.query({ where: { documentId } }) was a
      // silent no-op here, which left template unit times in production.
      await strapi.documents(SUB_TASK_UID).update({
        documentId: subTaskDocumentId,
        data: { expectedTime: scaledExpectedTime },
      });
    }

    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
    await runTaskSubTaskSyncRoutine(taskDocumentId);
  },

  async afterUpdate(event: {
    result: { documentId?: string; qty?: number };
    params?: { data?: Record<string, unknown> };
    state?: { previousTaskQty?: number };
  }) {
    if (isComputedOnlyUpdate(event.params?.data)) return;
    const taskDocumentId = event.result?.documentId;
    if (!taskDocumentId) return;

    const data = event.params?.data;
    if (
      data &&
      Object.prototype.hasOwnProperty.call(data, 'qty') &&
      typeof event.state?.previousTaskQty === 'number'
    ) {
      await rescaleSubTasksForTaskQtyChange(
        taskDocumentId,
        event.state.previousTaskQty,
        Number(event.result?.qty ?? data.qty ?? 1),
      );
    }

    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
    await runTaskSubTaskSyncRoutine(taskDocumentId);
  },
};
