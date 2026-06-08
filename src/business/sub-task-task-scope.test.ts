import { describe, expect, it } from 'vitest';

import {
  filterSubTasksCountedForTask,
  isSubTaskCountedForTask,
} from './sub-task-task-scope';

describe('isSubTaskCountedForTask', () => {
  it('counts locked and unlocked sub-tasks', () => {
    expect(isSubTaskCountedForTask('locked')).toBe(true);
    expect(isSubTaskCountedForTask('unlocked')).toBe(true);
    expect(isSubTaskCountedForTask(undefined)).toBe(true);
  });

  it('excludes disabled sub-tasks', () => {
    expect(isSubTaskCountedForTask('disabled')).toBe(false);
  });
});

describe('filterSubTasksCountedForTask', () => {
  it('removes disabled rows like a deletion', () => {
    const rows = filterSubTasksCountedForTask([
      { documentId: 'a', activationStatus: 'locked' },
      { documentId: 'b', activationStatus: 'disabled' },
      { documentId: 'c', activationStatus: 'unlocked' },
    ]);

    expect(rows.map((row) => row.documentId)).toEqual(['a', 'c']);
  });
});
