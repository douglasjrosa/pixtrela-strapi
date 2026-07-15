import type { TaskStatus } from './task-completion';

const TASK_UID = 'api::task.task';
const TASK_AUTOMATION_SETTING_UID =
  'api::task-automation-setting.task-automation-setting';

const TASK_STATUSES: TaskStatus[] = [
  'waiting',
  'producing',
  'paused',
  'finished',
];

export type TaskStatusStepMapping = Partial<Record<TaskStatus, string>>;

type StepRef = { documentId?: string } | null | undefined;

type AutomationSettingRecord = {
  waitingStep?: StepRef;
  producingStep?: StepRef;
  pausedStep?: StepRef;
  finishedStep?: StepRef;
} | null;

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

async function assignStepFromStatus(data: Record<string, unknown>): Promise<void> {
  const mapping = await loadTaskStatusStepMapping();
  const stepDocumentId = resolveStepDocumentIdForStatus(
    String(data.status),
    mapping,
  );
  if (!stepDocumentId) return;

  data.step = stepDocumentId;
}
