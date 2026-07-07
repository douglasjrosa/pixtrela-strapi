import { describe, expect, it } from 'vitest';

import {
  areSubTaskDependenciesSatisfied,
  findLockedSubTasksToUnlock,
  parseSubTaskDependencyIds,
} from './sub-task-dependencies';

describe('parseSubTaskDependencyIds', () => {
  it('reads an array of document ids', () => {
    expect(parseSubTaskDependencyIds(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns empty array for non-array values', () => {
    expect(parseSubTaskDependencyIds({ after: ['prep'] })).toEqual([]);
    expect(parseSubTaskDependencyIds(null)).toEqual([]);
  });
});

describe('areSubTaskDependenciesSatisfied', () => {
  const siblings = new Map([
    ['a', { status: 'finished' }],
    ['b', { status: 'waiting' }],
  ]);

  it('returns true when every dependency is finished', () => {
    expect(areSubTaskDependenciesSatisfied(['a'], siblings)).toBe(true);
  });

  it('returns false when a dependency is missing or not finished', () => {
    expect(areSubTaskDependenciesSatisfied(['b'], siblings)).toBe(false);
    expect(areSubTaskDependenciesSatisfied(['missing'], siblings)).toBe(false);
  });

  it('returns false for empty dependency list', () => {
    expect(areSubTaskDependenciesSatisfied([], siblings)).toBe(false);
  });
});

describe('findLockedSubTasksToUnlock', () => {
  it('unlocks locked sub-tasks whose dependencies are all finished', () => {
    const unlock = findLockedSubTasksToUnlock([
      {
        documentId: 'a',
        status: 'finished',
        activationStatus: 'unlocked',
        dependencies: [],
      },
      {
        documentId: 'b',
        status: 'waiting',
        activationStatus: 'locked',
        dependencies: ['a'],
      },
      {
        documentId: 'c',
        status: 'waiting',
        activationStatus: 'locked',
        dependencies: ['a', 'b'],
      },
    ]);

    expect(unlock).toEqual(['b']);
  });

  it('skips sub-tasks without dependencies or not locked', () => {
    const unlock = findLockedSubTasksToUnlock([
      {
        documentId: 'a',
        status: 'finished',
        activationStatus: 'locked',
        dependencies: [],
      },
      {
        documentId: 'b',
        status: 'waiting',
        activationStatus: 'unlocked',
        dependencies: ['a'],
      },
    ]);

    expect(unlock).toEqual([]);
  });
});
