import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOne = vi.fn();
const findFirst = vi.fn();

vi.stubGlobal('strapi', {
  documents: () => ({
    findOne,
    findFirst,
  }),
});

import {
  applyTaskStepForCreate,
  applyTaskStepForStatusChange,
  handleTaskStepAutomationMiddleware,
  hasTaskStatusChanged,
  mapAutomationSettingToStatusSteps,
  resolveStepDocumentIdForStatus,
} from './task-step-automation';

describe('hasTaskStatusChanged', () => {
  it('detects status changes', () => {
    expect(hasTaskStatusChanged('waiting', 'producing')).toBe(true);
    expect(hasTaskStatusChanged('waiting', 'waiting')).toBe(false);
    expect(hasTaskStatusChanged('waiting', undefined)).toBe(false);
  });
});

describe('mapAutomationSettingToStatusSteps', () => {
  it('maps step relations by task status', () => {
    expect(
      mapAutomationSettingToStatusSteps({
        waitingStep: { documentId: 'step-wait' },
        producingStep: { documentId: 'step-run' },
        pausedStep: null,
        finishedStep: { documentId: 'step-done' },
      }),
    ).toEqual({
      waiting: 'step-wait',
      producing: 'step-run',
      finished: 'step-done',
    });
  });
});

describe('resolveStepDocumentIdForStatus', () => {
  it('returns mapped step for known statuses', () => {
    expect(
      resolveStepDocumentIdForStatus('producing', {
        producing: 'step-run',
      }),
    ).toBe('step-run');
  });

  it('returns null when mapping is missing', () => {
    expect(resolveStepDocumentIdForStatus('paused', {})).toBeNull();
    expect(resolveStepDocumentIdForStatus('invalid', { waiting: 's1' })).toBeNull();
  });
});

describe('applyTaskStepForStatusChange', () => {
  beforeEach(() => {
    findOne.mockReset();
    findFirst.mockReset();
  });

  it('overwrites an existing step when status changes', async () => {
    findOne.mockResolvedValue({ status: 'waiting' });
    findFirst.mockResolvedValue({
      producingStep: { documentId: 'step-producing' },
    });

    const data: Record<string, unknown> = {
      status: 'producing',
      step: 'step-waiting-old',
    };

    await applyTaskStepForStatusChange('task-1', data);

    expect(data.step).toBe('step-producing');
  });

  it('does not change step when status is unchanged', async () => {
    findOne.mockResolvedValue({ status: 'producing' });

    const data: Record<string, unknown> = {
      status: 'producing',
      step: 'step-waiting-old',
    };

    await applyTaskStepForStatusChange('task-1', data);

    expect(data.step).toBe('step-waiting-old');
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('skips when status is absent from the payload', async () => {
    const data: Record<string, unknown> = { step: 'step-a' };

    await applyTaskStepForStatusChange('task-1', data);

    expect(data.step).toBe('step-a');
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('applyTaskStepForCreate', () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it('assigns mapped step from status on create', async () => {
    findFirst.mockResolvedValue({
      waitingStep: { documentId: 'step-wait' },
    });

    const data: Record<string, unknown> = {
      status: 'waiting',
      step: 'step-default',
    };

    await applyTaskStepForCreate(data);

    expect(data.step).toBe('step-wait');
  });
});

describe('handleTaskStepAutomationMiddleware', () => {
  beforeEach(() => {
    findOne.mockReset();
    findFirst.mockReset();
  });

  it('applies status→step on document update with documentId', async () => {
    findOne.mockResolvedValue({ status: 'waiting' });
    findFirst.mockResolvedValue({
      producingStep: { documentId: 'step-producing' },
    });

    const data: Record<string, unknown> = {
      status: 'producing',
      step: 'step-old',
    };
    const next = vi.fn(async () => 'ok');

    const result = await handleTaskStepAutomationMiddleware(
      {
        uid: 'api::task.task',
        action: 'update',
        params: { documentId: 'task-1', data },
      },
      next,
    );

    expect(data.step).toBe('step-producing');
    expect(next).toHaveBeenCalledOnce();
    expect(result).toBe('ok');
  });

  it('ignores non-task documents', async () => {
    const data: Record<string, unknown> = { status: 'producing', step: 'old' };
    const next = vi.fn(async () => 'ok');

    await handleTaskStepAutomationMiddleware(
      {
        uid: 'api::step.step',
        action: 'update',
        params: { documentId: 's1', data },
      },
      next,
    );

    expect(data.step).toBe('old');
    expect(findOne).not.toHaveBeenCalled();
  });
});
