import { describe, expect, it } from 'vitest';

import {
  areAllDependencySubTasksFinished,
  computeAutomaticActivationStatus,
  resolveSubTaskActivationStatusUpdates,
  type SubTaskActivationSyncRow,
} from './subtask-activation-sync';

const NO_ACTIVE_WORKERS: Pick<
  SubTaskActivationSyncRow,
  'maxSameTimeWorkers' | 'activeWorkerCount'
> = {
  maxSameTimeWorkers: 1,
  activeWorkerCount: 0,
};

describe('areAllDependencySubTasksFinished', () => {
  const siblings = new Map([
    ['a', { status: 'finished', documentId: 'a', dependencies: [] }],
    ['b', { status: 'queued', documentId: 'b', dependencies: [] }],
  ]);

  it('returns true when there are no dependencies', () => {
    expect(areAllDependencySubTasksFinished([], siblings)).toBe(true);
  });

  it('returns true only when every dependency is finished', () => {
    expect(areAllDependencySubTasksFinished(['a'], siblings)).toBe(true);
    expect(areAllDependencySubTasksFinished(['b'], siblings)).toBe(false);
  });
});

describe('computeAutomaticActivationStatus', () => {
  const siblings = new Map([
    [
      'cut',
      {
        documentId: 'cut',
        status: 'finished',
        activationStatus: 'locked',
        dependencies: [],
        ...NO_ACTIVE_WORKERS,
      },
    ],
    [
      'assembly',
      {
        documentId: 'assembly',
        status: 'queued',
        activationStatus: 'locked',
        dependencies: ['cut'],
        ...NO_ACTIVE_WORKERS,
      },
    ],
    [
      'disabled-row',
      {
        documentId: 'disabled-row',
        status: 'queued',
        activationStatus: 'disabled',
        dependencies: ['cut'],
        ...NO_ACTIVE_WORKERS,
      },
    ],
  ]);

  it('unlocks when not finished and all dependencies are finished', () => {
    expect(
      computeAutomaticActivationStatus(siblings.get('assembly')!, siblings),
    ).toBe('unlocked');
  });

  it('locks when a dependency is not finished', () => {
    const waiting: SubTaskActivationSyncRow = {
      documentId: 'wait',
      status: 'queued',
      activationStatus: 'locked',
      dependencies: ['assembly'],
      ...NO_ACTIVE_WORKERS,
    };
    const graph = new Map([...siblings, ['wait', waiting] as const]);

    expect(computeAutomaticActivationStatus(waiting, graph)).toBe('locked');
  });

  it('locks when the sub-task itself is finished', () => {
    expect(computeAutomaticActivationStatus(siblings.get('cut')!, siblings)).toBe(
      'locked',
    );
  });

  it('unlocks sub-tasks without dependencies when not finished', () => {
    const standalone: SubTaskActivationSyncRow = {
      documentId: 'solo',
      status: 'queued',
      activationStatus: 'locked',
      dependencies: [],
      ...NO_ACTIVE_WORKERS,
    };

    expect(computeAutomaticActivationStatus(standalone, siblings)).toBe('unlocked');
  });

  it('does not change disabled sub-tasks', () => {
    expect(
      computeAutomaticActivationStatus(siblings.get('disabled-row')!, siblings),
    ).toBeNull();
  });

  it('locks dual-worker sub-tasks when two colaborators are active', () => {
    const dualWorker: SubTaskActivationSyncRow = {
      documentId: 'dual',
      status: 'queued',
      activationStatus: 'unlocked',
      dependencies: [],
      maxSameTimeWorkers: 2,
      activeWorkerCount: 2,
    };

    expect(computeAutomaticActivationStatus(dualWorker, siblings)).toBe('locked');
  });

  it('unlocks dual-worker sub-tasks when one colaborator leaves', () => {
    const dualWorker: SubTaskActivationSyncRow = {
      documentId: 'dual',
      status: 'queued',
      activationStatus: 'locked',
      dependencies: [],
      maxSameTimeWorkers: 2,
      activeWorkerCount: 1,
    };

    expect(computeAutomaticActivationStatus(dualWorker, siblings)).toBe('unlocked');
  });
});

describe('resolveSubTaskActivationStatusUpdates', () => {
  it('returns only rows whose activation status must change', () => {
    const updates = resolveSubTaskActivationStatusUpdates([
      {
        documentId: 'a',
        status: 'finished',
        activationStatus: 'locked',
        dependencies: [],
        ...NO_ACTIVE_WORKERS,
      },
      {
        documentId: 'b',
        status: 'queued',
        activationStatus: 'locked',
        dependencies: ['a'],
        ...NO_ACTIVE_WORKERS,
      },
      {
        documentId: 'c',
        status: 'queued',
        activationStatus: 'disabled',
        dependencies: ['a'],
        ...NO_ACTIVE_WORKERS,
      },
    ]);

    expect([...updates.entries()]).toEqual([['b', 'unlocked']]);
  });

  it('re-locks sub-tasks when dependencies are no longer finished', () => {
    const updates = resolveSubTaskActivationStatusUpdates([
      {
        documentId: 'a',
        status: 'queued',
        activationStatus: 'unlocked',
        dependencies: ['b'],
        ...NO_ACTIVE_WORKERS,
      },
      {
        documentId: 'b',
        status: 'queued',
        activationStatus: 'locked',
        dependencies: [],
        ...NO_ACTIVE_WORKERS,
      },
    ]);

    expect([...updates.entries()]).toEqual([
      ['a', 'locked'],
      ['b', 'unlocked'],
    ]);
  });

  it('locks dual-worker sub-tasks at capacity even without dependencies', () => {
    const updates = resolveSubTaskActivationStatusUpdates([
      {
        documentId: 'dual',
        status: 'producing',
        activationStatus: 'unlocked',
        dependencies: [],
        maxSameTimeWorkers: 2,
        activeWorkerCount: 2,
      },
    ]);

    expect([...updates.entries()]).toEqual([['dual', 'locked']]);
  });
});
