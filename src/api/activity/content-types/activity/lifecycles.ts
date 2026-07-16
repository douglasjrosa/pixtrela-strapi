import {
  calculateDurationCurrencyCredits,
  calculateQtySessionCurrency,
  shouldCreditDurationCurrency,
} from '../../../../business/work-currency';
import { selectPaymentCurrency } from '../../../../business/payment-currency';
import { runTaskSubTaskSyncRoutine } from '../../../../business/subtask-activation-sync';
import {
  listTimeSpentByColaborator,
  type ActivityTimeRow,
} from '../../../../business/task-time-spent';

const ACTIVITY_UID = 'api::activity.activity';
const CURRENCY_FOR_SUBTASKS_UID =
  'api::currency-for-subtasks.currency-for-subtasks';
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
 * Payment currency must be configured on Currency for Subtasks.
 * No silent fallback to an arbitrary Currency row.
 */
async function resolvePaymentCurrency(): Promise<{
  id: number;
  currencyPerSecond: number;
} | null> {
  const setting = await strapi.documents(CURRENCY_FOR_SUBTASKS_UID).findFirst({
    populate: { currency: { fields: ['currencyPerSecond'] } },
  });
  const linked = setting?.currency as
    | { id?: number; currencyPerSecond?: number }
    | null
    | undefined;
  return selectPaymentCurrency(linked);
}

async function setActivityCurrencyAwarded(
  activityDocumentId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  await strapi.documents(ACTIVITY_UID).update({
    documentId: activityDocumentId,
    data: { currencyAwarded: amount },
  });
}

async function creditQtyCurrency(input: {
  activityDocumentId: string;
  colaboratorId: number;
  expectedTime: number;
  subTaskQty: number;
  taskQty: number;
  sessionQty: number;
  currency: { id: number; currencyPerSecond: number };
}): Promise<void> {
  const amount = calculateQtySessionCurrency(
    {
      expectedTime: input.expectedTime,
      qty: input.subTaskQty,
      taskQty: input.taskQty,
      sharingType: 'qty',
    },
    { sessionQty: input.sessionQty },
    { currencyPerSecond: input.currency.currencyPerSecond },
  );
  if (amount <= 0) return;

  await strapi
    .service(BALANCE_UID)
    .creditIncome(input.colaboratorId, input.currency.id, amount);
  await setActivityCurrencyAwarded(input.activityDocumentId, amount);
}

async function creditDurationCurrency(input: {
  subTaskId: number;
  expectedTime: number;
  subTaskQty: number;
  taskQty: number;
  finishingActivityDocumentId: string;
  finishingColaboratorId: number;
  currency: { id: number; currencyPerSecond: number };
}): Promise<void> {
  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      subTask: input.subTaskId,
      action: { $in: ['started', 'stoped'] },
    },
    orderBy: { timestamp: 'asc' },
    populate: { colaborator: { select: ['id'] } },
  });

  const rows: ActivityTimeRow[] = [];
  for (const activity of activities) {
    const colaborator = activity.colaborator as { id?: number } | null;
    const timestamp = activity.timestamp;
    if (!colaborator?.id || !timestamp) continue;
    if (activity.action !== 'started' && activity.action !== 'stoped') continue;
    rows.push({
      action: activity.action,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      colaboratorId: colaborator.id,
    });
  }

  const participations = listTimeSpentByColaborator(rows, new Date());
  const credits = calculateDurationCurrencyCredits(
    {
      expectedTime: input.expectedTime,
      qty: input.subTaskQty,
      taskQty: input.taskQty,
      sharingType: 'duration',
    },
    participations,
    { currencyPerSecond: input.currency.currencyPerSecond },
  );

  for (const credit of credits) {
    if (credit.amount <= 0) continue;
    await strapi
      .service(BALANCE_UID)
      .creditIncome(credit.colaboratorId, input.currency.id, credit.amount);

    if (credit.colaboratorId === input.finishingColaboratorId) {
      await setActivityCurrencyAwarded(
        input.finishingActivityDocumentId,
        credit.amount,
      );
    }
  }
}

/**
 * Credit work currency on stop according to sharingType rules.
 * Keep parent task totalTimeSpent in sync with activities.
 */
export default {
  async afterCreate(event: { result: { documentId?: string } }) {
    const documentId = event.result?.documentId;
    if (!documentId) return;

    const activity = await strapi.documents(ACTIVITY_UID).findOne({
      documentId,
      populate: {
        subTask: {
          populate: { task: { fields: ['qty'] } },
        },
        colaborator: true,
      },
    });
    if (!activity) return;

    const subTask = activity.subTask as {
      id?: number;
      expectedTime?: number;
      qty?: number;
      status?: string;
      sharingType?: string;
      task?: { qty?: number } | null;
    } | null;
    const colaborator = activity.colaborator as { id?: number } | null;

    if (
      activity.action === 'stoped' &&
      subTask &&
      colaborator?.id &&
      subTask.id
    ) {
      const currency = await resolvePaymentCurrency();
      if (currency) {
        const context = {
          expectedTime: Number(subTask.expectedTime ?? 0),
          subTaskQty: Number(subTask.qty ?? 1),
          taskQty: Number(subTask.task?.qty ?? 1),
        };
        const sharingType =
          subTask.sharingType === 'qty' ? 'qty' : 'duration';

        if (sharingType === 'qty') {
          await creditQtyCurrency({
            activityDocumentId: documentId,
            colaboratorId: colaborator.id,
            expectedTime: context.expectedTime,
            subTaskQty: context.subTaskQty,
            taskQty: context.taskQty,
            sessionQty: Number(activity.qty ?? 0),
            currency,
          });
        } else if (
          shouldCreditDurationCurrency({
            action: 'stoped',
            subTaskStatus: String(subTask.status ?? ''),
          })
        ) {
          await creditDurationCurrency({
            subTaskId: subTask.id,
            expectedTime: context.expectedTime,
            subTaskQty: context.subTaskQty,
            taskQty: context.taskQty,
            finishingActivityDocumentId: documentId,
            finishingColaboratorId: colaborator.id,
            currency,
          });
        }
      }
    }

    await syncParentTaskTimeSpent(documentId);
    await syncParentTaskSubTasks(documentId);
  },
};
