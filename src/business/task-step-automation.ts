import { TASK_STATUSES, type TaskStatus } from './task-completion';

const TASK_UID = 'api::task.task';
const TASK_AUTOMATION_SETTING_UID =
  'api::task-automation-setting.task-automation-setting';

export type TaskStatusStepMapping = Partial<Record<TaskStatus, string>>;

type StepRef = { documentId?: string } | null | undefined;

type AutomationSettingRecord = {
  waitingStep?: StepRef;
  producingStep?: StepRef;
  pausedStep?: StepRef;
  finishedStep?: StepRef;
  reviewedStep?: StepRef;
  deliveredStep?: StepRef;
} | null;

export type TaskDocumentMiddlewareContext = {
  uid: string;
  action: string;
  params: {
    documentId?: string;
    data?: Record<string, unknown>;
  };
};

/**
 * Registration facade for `strapi.documents`.
 * Strapi's Middleware `Context` is a wide UID union; requiring our narrow
 * TaskDocumentMiddlewareContext here makes `strapi.documents` unassignable
 * (TS2345) and breaks `strapi develop` recompiles → API down → Next 500s.
 */
export type TaskStepAutomationDocuments = {
  // Intentionally loose to match Modules.Documents.Service['use'].
  use: (middleware: (context: any, next: () => any) => any) => unknown;
};

function readStepDocumentId(step: StepRef): string | undefined {
  const documentId = step?.documentId;
  return typeof documentId === 'string' && documentId.length > 0
    ? documentId
    : undefined;
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function hasTaskStatusChanged(
  currentStatus: string | null | undefined,
  nextStatus: unknown,
): boolean {
  if (nextStatus === undefined || nextStatus === null) return false;
  return String(currentStatus ?? '') !== String(nextStatus);
}

export function mapAutomationSettingToStatusSteps(
  setting: AutomationSettingRecord,
): TaskStatusStepMapping {
  if (!setting) return {};

  return {
    waiting: readStepDocumentId(setting.waitingStep),
    producing: readStepDocumentId(setting.producingStep),
    paused: readStepDocumentId(setting.pausedStep),
    finished: readStepDocumentId(setting.finishedStep),
    reviewed: readStepDocumentId(setting.reviewedStep),
    delivered: readStepDocumentId(setting.deliveredStep),
  };
}

export function resolveStepDocumentIdForStatus(
  status: string,
  mapping: TaskStatusStepMapping,
): string | null {
  if (!isTaskStatus(status)) return null;
  const stepDocumentId = mapping[status];
  return stepDocumentId && stepDocumentId.length > 0 ? stepDocumentId : null;
}

export async function loadTaskStatusStepMapping(): Promise<TaskStatusStepMapping> {
  const setting = await strapi.documents(TASK_AUTOMATION_SETTING_UID).findFirst({
    populate: {
      waitingStep: { fields: ['documentId'] },
      producingStep: { fields: ['documentId'] },
      pausedStep: { fields: ['documentId'] },
      finishedStep: { fields: ['documentId'] },
      reviewedStep: { fields: ['documentId'] },
      deliveredStep: { fields: ['documentId'] },
    },
  });

  return mapAutomationSettingToStatusSteps(setting);
}

export async function applyTaskStepForStatusChange(
  documentId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(data, 'status')) return;

  const task = await strapi.documents(TASK_UID).findOne({
    documentId,
    fields: ['status'],
  });
  if (!task) return;
  if (!hasTaskStatusChanged(String(task.status ?? ''), data.status)) return;

  await assignStepFromStatus(data);
}

export async function applyTaskStepForCreate(
  data: Record<string, unknown>,
): Promise<void> {
  if (!Object.prototype.hasOwnProperty.call(data, 'status')) return;
  await assignStepFromStatus(data);
}

/**
 * Document Service middleware handler. Prefer this over DB lifecycles:
 * Strapi 5 beforeUpdate only receives `where.id`, not `documentId`, so the
 * previous lifecycle path never applied step automation on REST updates.
 */
export async function handleTaskStepAutomationMiddleware(
  context: TaskDocumentMiddlewareContext,
  next: () => Promise<unknown> | unknown,
): Promise<unknown> {
  if (context.uid !== TASK_UID) {
    return next();
  }

  const data = context.params.data;
  if (!data) {
    return next();
  }

  if (context.action === 'create') {
    await applyTaskStepForCreate(data);
  } else if (context.action === 'update') {
    const documentId = context.params.documentId;
    if (documentId) {
      await applyTaskStepForStatusChange(documentId, data);
    }
  }

  return next();
}

export function registerTaskStepAutomation(
  documents: TaskStepAutomationDocuments,
): void {
  documents.use(handleTaskStepAutomationMiddleware);
}

async function assignStepFromStatus(data: Record<string, unknown>): Promise<void> {
  const mapping = await loadTaskStatusStepMapping();
  const stepDocumentId = resolveStepDocumentIdForStatus(
    String(data.status),
    mapping,
  );
  if (!stepDocumentId) return;

  data.step = stepDocumentId;
}
