import { describe, expect, it } from 'vitest';

import {
  mapTemplateSubTasksToCreatePayloads,
  shouldCopyTemplateSubtasks,
} from './copy-template-subtasks';

describe('shouldCopyTemplateSubtasks', () => {
  it('returns true when code is a non-empty string', () => {
    expect(shouldCopyTemplateSubtasks('MNT-01')).toBe(true);
  });

  it('returns false for empty or whitespace-only code', () => {
    expect(shouldCopyTemplateSubtasks('')).toBe(false);
    expect(shouldCopyTemplateSubtasks('   ')).toBe(false);
  });

  it('returns false for nullish values', () => {
    expect(shouldCopyTemplateSubtasks(null)).toBe(false);
    expect(shouldCopyTemplateSubtasks(undefined)).toBe(false);
  });
});

describe('mapTemplateSubTasksToCreatePayloads', () => {
  it('maps each template component to a sub-task linked to the task', () => {
    const payloads = mapTemplateSubTasksToCreatePayloads(
      [
        {
          name: 'Soldar',
          qty: 2,
          sharingType: 'duration',
          maxSameTimeWorkers: 3,
          index: 1,
          expectedTime: 120,
          dependencies: ['dep-doc'],
        },
      ],
      'task-doc-1',
    );

    expect(payloads).toEqual([
      {
        name: 'Soldar',
        task: 'task-doc-1',
        qty: 2,
        sharingType: 'duration',
        maxSameTimeWorkers: 3,
        index: 1,
        dependencies: ['dep-doc'],
        status: 'queued',
        activationStatus: 'locked',
        expectedTime: 120,
        timeSpent: 0,
      },
    ]);
  });

  it('applies defaults for optional component fields', () => {
    const payloads = mapTemplateSubTasksToCreatePayloads(
      [{ name: 'Cortar' }],
      'task-doc-2',
    );

    expect(payloads[0]).toMatchObject({
      name: 'Cortar',
      task: 'task-doc-2',
      qty: 1,
      sharingType: 'duration',
      maxSameTimeWorkers: 1,
      index: 0,
      dependencies: [],
      status: 'queued',
      activationStatus: 'locked',
      expectedTime: 0,
      timeSpent: 0,
    });
  });

  it('skips components without a name', () => {
    const payloads = mapTemplateSubTasksToCreatePayloads(
      [{ name: '' }, { name: '   ' }, { name: 'Valid' }],
      'task-doc-3',
    );

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.name).toBe('Valid');
  });

  it('returns empty array for non-array input', () => {
    expect(mapTemplateSubTasksToCreatePayloads(null, 'task-doc-4')).toEqual([]);
    expect(mapTemplateSubTasksToCreatePayloads(undefined, 'task-doc-4')).toEqual(
      [],
    );
  });
});
