import { describe, expect, it } from 'vitest';

import {
  buildStartedAtBySubTaskId,
  filterKioskVisibleSubTasks,
  isVisibleOnKiosk,
  mapSubTaskDbRow,
  readUserDocumentId,
} from './kiosk-subtasks';

describe('readUserDocumentId', () => {
  it('reads documentId or document_id', () => {
    expect(readUserDocumentId({ documentId: 'doc-a' })).toBe('doc-a');
    expect(readUserDocumentId({ document_id: 'doc-b' })).toBe('doc-b');
    expect(readUserDocumentId(null)).toBeNull();
  });
});

describe('mapSubTaskDbRow', () => {
  it('maps snake_case db columns to kiosk rows', () => {
    expect(
      mapSubTaskDbRow({
        document_id: 'st-doc',
        name: 'Soldar',
        index: 2,
        status: 'queued',
      }),
    ).toEqual({
      documentId: 'st-doc',
      name: 'Soldar',
      index: 2,
      status: 'queued',
      activationStatus: 'locked',
      qty: 1,
      completedQty: 0,
      sharingType: 'duration',
      timeSpent: 0,
      startedAt: null,
    });
  });

  it('maps activation_status from db columns', () => {
    expect(
      mapSubTaskDbRow({
        document_id: 'st-doc',
        name: 'Soldar',
        index: 2,
        status: 'queued',
        activation_status: 'unlocked',
      }).activationStatus,
    ).toBe('unlocked');
  });
});

describe('isVisibleOnKiosk', () => {
  it('hides disabled subtasks', () => {
    expect(isVisibleOnKiosk('disabled')).toBe(false);
    expect(isVisibleOnKiosk('locked')).toBe(true);
    expect(isVisibleOnKiosk('unlocked')).toBe(true);
  });
});

describe('filterKioskVisibleSubTasks', () => {
  it('removes disabled rows', () => {
    const rows = filterKioskVisibleSubTasks([
      { documentId: 'a', activationStatus: 'locked' },
      { documentId: 'b', activationStatus: 'disabled' },
      { documentId: 'c', activationStatus: 'unlocked' },
    ]);
    expect(rows.map((row) => row.documentId)).toEqual(['a', 'c']);
  });
});

describe('buildStartedAtBySubTaskId', () => {
  it('maps the first timestamp per subtask id', () => {
    const map = buildStartedAtBySubTaskId([
      { subTaskId: 1, timestamp: '2026-06-05T10:00:00.000Z' },
      { subTaskId: 2, timestamp: '2026-06-05T11:00:00.000Z' },
    ]);
    expect(map.get(1)).toBe('2026-06-05T10:00:00.000Z');
    expect(map.get(2)).toBe('2026-06-05T11:00:00.000Z');
  });
});
