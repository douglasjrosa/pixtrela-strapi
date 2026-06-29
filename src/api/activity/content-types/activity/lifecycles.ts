import { calculateStars, shouldCreditStars } from '../../../../business/stars';

import { runTaskSubTaskSyncRoutine } from '../../../../business/subtask-activation-sync';

const ACTIVITY_UID = 'api::activity.activity';
const CURRENCY_UID = 'api::currency.currency';
const BALANCE_UID = 'api::balance.balance';
const TASK_SERVICE_UID = 'api::task.task';

async function readTaskDocumentId(activityDocumentId: string): Promise<string | null> {
  const activity = await strapi.documents(ACTIVITY_UID).findOne({
    documentId: activityDocumentId,
    populate: { subTask: { populate: { task: { fields: ['documentId'] } } } },
  });

  const subTask = activity?.subTask as { task?: { documentId?: string } | null } | null;
  return subTask?.task?.documentId ?? null;
}

async function syncParentTaskTimeSpent(activityDocumentId: string): Promise<void> {
  const taskDocumentId = await readTaskDocumentId(activityDocumentId);
  if (!taskDocumentId) return;

  await strapi.service(TASK_SERVICE_UID).syncTotalTimeSpent(taskDocumentId);
}

async function syncParentTaskSubTasks(activityDocumentId: string): Promise<void> {
  const taskDocumentId = await readTaskDocumentId(activityDocumentId);
  if (!taskDocumentId) return;

  await runTaskSubTaskSyncRoutine(taskDocumentId);
}

/**
 * Credit Stars to the colaborator when a subtask is stopped and finished.
 * Keep parent task totalTimeSpent in sync with activities.
 */
export default {
  async afterCreate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;

    const activity = await strapi.documents(ACTIVITY_UID).findOne({
      documentId,
      populate: { subTask: true, colaborator: true },
    });
    if (!activity) return;

    const subTask = activity.subTask as { expectedTime?: number; status?: string } | null;
    const colaborator = activity.colaborator as { id?: number } | null;

    if (
      subTask &&
      colaborator?.id &&
      shouldCreditStars({
        action: activity.action as 'started' | 'stoped',
        subTaskStatus: String(subTask.status ?? ''),
      })
    ) {
      const [currency] = await strapi.documents(CURRENCY_UID).findMany({ limit: 1 });
      if (currency) {
        const stars = calculateStars(
          { expectedTime: Number(subTask.expectedTime ?? 0) },
          { currencyPerSecond: Number(currency.currencyPerSecond ?? 0) },
        );
        if (stars > 0) {
          await strapi
            .service(BALANCE_UID)
            .creditIncome(colaborator.id, currency.id, stars);
        }
      }
    }

    await syncParentTaskTimeSpent(documentId);
    await syncParentTaskSubTasks(documentId);
  },
};
