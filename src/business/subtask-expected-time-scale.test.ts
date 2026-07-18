import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyExpectedTimeScaleOnSubTaskCreate,
  extractInlineTaskQty,
  extractTaskRelationDocumentId,
  extractTaskRelationNumericId,
  handleSubTaskExpectedTimeMiddleware,
  SUB_TASK_UID,
} from './subtask-expected-time-scale';

describe('extractTaskRelationDocumentId', () => {
  it('reads a bare documentId string', () => {
    expect(extractTaskRelationDocumentId('task-1')).toBe('task-1');
  });

  it('reads connect/set arrays used by Document Service', () => {
    expect(
      extractTaskRelationDocumentId({ connect: ['task-2'] }),
    ).toBe('task-2');
    expect(
      extractTaskRelationDocumentId({ set: [{ documentId: 'task-3' }] }),
    ).toBe('task-3');
  });
});

describe('extractInlineTaskQty', () => {
  it('reads qty when the relation object embeds it', () => {
    expect(extractInlineTaskQty({ documentId: 't1', qty: 7 })).toBe(7);
  });

  it('returns null when qty is absent', () => {
    expect(extractInlineTaskQty({ documentId: 't1' })).toBeNull();
  });
});

describe('extractTaskRelationNumericId', () => {
  it('reads numeric id refs', () => {
    expect(extractTaskRelationNumericId(42)).toBe(42);
    expect(extractTaskRelationNumericId({ id: 9 })).toBe(9);
  });
});

describe('applyExpectedTimeScaleOnSubTaskCreate', () => {
  beforeEach(() => {
    vi.stubGlobal('strapi', {
      documents: vi.fn(),
      db: { query: vi.fn() },
    });
  });

  it('scales expectedTime by inline task.qty', async () => {
    const data: Record<string, unknown> = {
      expectedTime: 10,
      task: { documentId: 't1', qty: 3 },
    };

    await applyExpectedTimeScaleOnSubTaskCreate(data);

    expect(data.expectedTime).toBe(30);
    expect(strapi.documents).not.toHaveBeenCalled();
  });

  it('falls back to qty 1 when task relation is missing', async () => {
    const data: Record<string, unknown> = { expectedTime: 15 };

    await applyExpectedTimeScaleOnSubTaskCreate(data);

    expect(data.expectedTime).toBe(15);
  });
});

describe('handleSubTaskExpectedTimeMiddleware', () => {
  it('skips when uid or action is not SubTask create', async () => {
    const next = vi.fn().mockResolvedValue('ok');
    const data = { expectedTime: 10, task: { qty: 4 } };

    await handleSubTaskExpectedTimeMiddleware(
      { uid: SUB_TASK_UID, action: 'update', params: { data } },
      next,
    );

    expect(data.expectedTime).toBe(10);
    expect(next).toHaveBeenCalledOnce();
  });

  it('scales on SubTask create before calling next', async () => {
    const next = vi.fn().mockResolvedValue('created');
    const data = { expectedTime: 10, task: { qty: 2 } };

    const result = await handleSubTaskExpectedTimeMiddleware(
      { uid: SUB_TASK_UID, action: 'create', params: { data } },
      next,
    );

    expect(data.expectedTime).toBe(20);
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe('created');
  });
});
