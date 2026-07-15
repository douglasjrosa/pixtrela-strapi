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
  it('returns waiting when every counted sub-task is waiting', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'waiting' },
        { status: 'waiting' },
      ]),
    ).toBe('waiting');
  });

  it('returns waiting when there are no counted sub-tasks', () => {
    expect(resolveTaskStatusFromSubTasks([])).toBe('waiting');
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'producing', activationStatus: 'disabled' },
      ]),
    ).toBe('waiting');
  });

  it('returns producing when at least one sub-task is producing', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished' },
        { status: 'producing' },
        { status: 'waiting' },
      ]),
    ).toBe('producing');
  });

  it('returns finished when every counted sub-task is finished', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished' },
        { status: 'finished' },
      ]),
    ).toBe('finished');
  });

  it('returns paused for a mix of finished and waiting with none producing', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished', activationStatus: 'unlocked' },
        { status: 'waiting', activationStatus: 'locked' },
      ]),
    ).toBe('paused');
  });

  it('returns paused when some are paused and none are producing', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'paused' },
        { status: 'waiting' },
      ]),
    ).toBe('paused');
  });

  it('ignores disabled sub-tasks when deriving status', () => {
    expect(
      resolveTaskStatusFromSubTasks([
        { status: 'finished', activationStatus: 'unlocked' },
        { status: 'producing', activationStatus: 'disabled' },
      ]),
    ).toBe('finished');
  });
});
