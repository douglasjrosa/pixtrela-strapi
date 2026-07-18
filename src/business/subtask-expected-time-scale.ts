import { scaleExpectedTimeByTaskQty } from './work-currency';

const TASK_UID = 'api::task.task';
export const SUB_TASK_UID = 'api::sub-task.sub-task';

/**
 * Pulls a documentId from Strapi 5 Document Service relation shapes.
 */
export function extractTaskRelationDocumentId(taskRef: unknown): string | null {
  if (typeof taskRef === 'string') {
    const trimmed = taskRef.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!taskRef || typeof taskRef !== 'object') return null;

  const record = taskRef as Record<string, unknown>;
  if (typeof record.documentId === 'string' && record.documentId.trim()) {
    return record.documentId.trim();
  }

  for (const key of ['connect', 'set'] as const) {
    const list = record[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    const first = list[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first === 'object') {
      const nested = first as { documentId?: string };
      if (typeof nested.documentId === 'string' && nested.documentId.trim()) {
        return nested.documentId.trim();
      }
    }
  }

  return null;
}

export function extractInlineTaskQty(taskRef: unknown): number | null {
  if (!taskRef || typeof taskRef !== 'object') return null;
  const qty = (taskRef as { qty?: unknown }).qty;
  if (typeof qty !== 'number' || !Number.isFinite(qty)) return null;
  return Math.max(1, Math.floor(qty) || 1);
}

export function extractTaskRelationNumericId(taskRef: unknown): number | null {
  if (typeof taskRef === 'number' && Number.isFinite(taskRef)) {
    return taskRef;
  }
  if (!taskRef || typeof taskRef !== 'object') return null;
  const id = (taskRef as { id?: unknown }).id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  return null;
}

/**
 * Resolves parent task.qty for SubTask create-time expectedTime scaling.
 */
export async function resolveTaskQtyFromRelation(
  taskRef: unknown,
): Promise<number> {
  const inlineQty = extractInlineTaskQty(taskRef);
  if (inlineQty != null) return inlineQty;

  const documentId = extractTaskRelationDocumentId(taskRef);
  if (documentId) {
    const task = await strapi.documents(TASK_UID).findOne({
      documentId,
      fields: ['qty'],
    });
    return Math.max(1, Number(task?.qty ?? 1));
  }

  const numericId = extractTaskRelationNumericId(taskRef);
  if (numericId != null) {
    const task = await strapi.db.query(TASK_UID).findOne({
      where: { id: numericId },
      select: ['qty'],
    });
    return Math.max(1, Number(task?.qty ?? 1));
  }

  return 1;
}

/** Mutates create payload: expectedTime *= task.qty. */
export async function applyExpectedTimeScaleOnSubTaskCreate(
  data: Record<string, unknown>,
): Promise<void> {
  const taskQty = await resolveTaskQtyFromRelation(data.task);
  data.expectedTime = scaleExpectedTimeByTaskQty(
    Number(data.expectedTime ?? 0),
    taskQty,
  );
}

export type SubTaskDocumentMiddlewareContext = {
  uid: string;
  action: string;
  params: {
    data?: Record<string, unknown>;
  };
};

export type SubTaskExpectedTimeDocuments = {
  // Strapi Document Service.use accepts a wide Context; keep loose for register().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  use: (middleware: (context: any, next: () => any) => any) => unknown;
};

/**
 * Document Service middleware — Strapi 5 content-type beforeCreate is unreliable
 * for documents().create (same class of bug as task-step-automation).
 * Template-copy confirms the scaled value with documents().update after create.
 */
export async function handleSubTaskExpectedTimeMiddleware(
  context: SubTaskDocumentMiddlewareContext,
  next: () => Promise<unknown> | unknown,
): Promise<unknown> {
  if (context.uid !== SUB_TASK_UID || context.action !== 'create') {
    return next();
  }

  const data = context.params.data;
  if (data) {
    await applyExpectedTimeScaleOnSubTaskCreate(data);
  }

  return next();
}

export function registerSubTaskExpectedTimeScaling(
  documents: SubTaskExpectedTimeDocuments,
): void {
  documents.use(handleSubTaskExpectedTimeMiddleware);
}
