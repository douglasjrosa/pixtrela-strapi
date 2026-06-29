import { runTaskSubTaskSyncRoutine } from '../../../../business/subtask-activation-sync';
import {
  mapTemplateSubTasksToCreatePayloads,
  resolveTemplateDependencyIds,
  shouldCopyTemplateSubtasks,
  type TemplateSubTaskComponent,
} from '../../../../business/copy-template-subtasks';

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

/**
 * When a task is created with templateTaskCode, copy template subTask components
 * into SubTask records linked to the new task.
 */
export default {
  async afterCreate(event: { result: { documentId?: string } }) {
    const taskDocumentId = event.result?.documentId;
    if (!taskDocumentId) return;

    const task = await strapi.documents(TASK_UID).findOne({
      documentId: taskDocumentId,
      fields: ['templateTaskCode'],
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

    for (const data of sortedPayloads) {
      const dependencies = resolveTemplateDependencyIds(
        data.dependencyRefs,
        documentIdsByIndex,
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
      if (subTaskDocumentId) {
        documentIdsByIndex.set(data.index, subTaskDocumentId);
      }
    }

    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
    await runTaskSubTaskSyncRoutine(taskDocumentId);
  },

  async afterUpdate(event: {
    result: { documentId?: string };
    params?: { data?: Record<string, unknown> };
  }) {
    if (isComputedOnlyUpdate(event.params?.data)) return;
    const taskDocumentId = event.result?.documentId;
    if (!taskDocumentId) return;
    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
    await runTaskSubTaskSyncRoutine(taskDocumentId);
  },
};
