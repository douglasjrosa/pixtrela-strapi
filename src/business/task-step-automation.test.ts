import { describe, expect, it } from 'vitest';

import {
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
