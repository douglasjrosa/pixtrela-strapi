import {
  mapTemplateSubTasksToCreatePayloads,
  shouldCopyTemplateSubtasks,
  type TemplateSubTaskComponent,
} from '../../../../business/copy-template-subtasks';

const TASK_UID = 'api::task.task';
const TASK_SERVICE_UID = 'api::task.task';
const TEMPLATE_TASK_UID = 'api::template-task.template-task';
const SUB_TASK_UID = 'api::sub-task.sub-task';

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

    for (const data of payloads) {
      await strapi.documents(SUB_TASK_UID).create({ data });
    }

    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
  },

  async afterUpdate(event: { result: { documentId?: string } }) {
    const taskDocumentId = event.result?.documentId;
    if (!taskDocumentId) return;
    await strapi.service(TASK_SERVICE_UID).syncTotalExpectedTime(taskDocumentId);
  },
};
