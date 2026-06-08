import { describe, expect, it } from 'vitest';

import {
  areAllSubTasksFinished,
  resolveTaskStatusFromSubTasks,
} from './task-completion';

describe('areAllSubTasksFinished', () => {
  it('returns false when there are no sub-tasks', () => {
    expect(areAllSubTasksFinished([])).toBe(false);
  });

  it('returns false when any counted sub-task is not finished', () => {
    expect(
      areAllSubTasksFinished([
        { status: 'finished' },
        { status: 'queued' },
      ]),
    ).toBe(false);
  });

  it('returns true when every counted sub-task is finished', () => {
    expect(
      areAllSubTasksFinished([
        { status: 'finished' },
        { status: 'finished' },
      ]),
    ).toBe(true);
  });

  it('ignores disabled sub-tasks like an exclusion', () => {
    expect(
      areAllSubTasksFinished([
        { status: 'finished', activationStatus: 'unlocked' },
        { status: 'queued', activationStatus: 'disabled' },
      ]),
    ).toBe(true);
  });

  it('returns false when only disabled sub-tasks remain', () => {
    expect(
      areAllSubTasksFinished([
        { status: 'queued', activationStatus: 'disabled' },
      ]),
    ).toBe(false);
  });
});

describe('resolveTaskStatusFromSubTasks', () => {
  it('reopens a finished task when a disabled sub-task is counted again', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished', activationStatus: 'unlocked' },
        { status: 'queued', activationStatus: 'locked' },
      ]),
    ).toBe('queued');
  });
});