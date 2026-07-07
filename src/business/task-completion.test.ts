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
        { status: 'waiting' },
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
        { status: 'waiting', activationStatus: 'disabled' },
      ]),
    ).toBe(true);
  });

  it('returns false when only disabled sub-tasks remain', () => {
    expect(
      areAllSubTasksFinished([
        { status: 'waiting', activationStatus: 'disabled' },
      ]),
    ).toBe(false);
  });
});

describe('resolveTaskStatusFromSubTasks', () => {
  it('reopens a finished task when a disabled sub-task is counted again', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished', activationStatus: 'unlocked' },
        { status: 'waiting', activationStatus: 'locked' },
      ]),
    ).toBe('waiting');
  });
});