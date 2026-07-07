import { describe, expect, it } from 'vitest';

import {
  filterKioskDailyQueue,
  isVisibleInKioskDailyQueue,
  sortKioskDailyQueue,
  type KioskQueueRow,
} from './kiosk-daily-queue';

const NOW = new Date('2026-07-07T15:00:00.000Z');

function row(
  overrides: Partial<KioskQueueRow> & Pick<KioskQueueRow, 'documentId'>,
): KioskQueueRow {
  return {
    documentId: overrides.documentId,
    name: overrides.name ?? 'Sub',
    index: overrides.index ?? 0,
    status: overrides.status ?? 'waiting',
    activationStatus: overrides.activationStatus ?? 'unlocked',
    taskIndex: overrides.taskIndex ?? 0,
    finishedAt: overrides.finishedAt ?? null,
  };
}

describe('isVisibleInKioskDailyQueue', () => {
  it('keeps non-finished subtasks regardless of finishedAt', () => {
    expect(
      isVisibleInKioskDailyQueue(
        { status: 'waiting' },
        null,
        NOW,
      ),
    ).toBe(true);
    expect(
      isVisibleInKioskDailyQueue(
        { status: 'producing' },
        null,
        NOW,
      ),
    ).toBe(true);
  });

  it('keeps finished subtasks completed today', () => {
    expect(
      isVisibleInKioskDailyQueue(
        { status: 'finished' },
        new Date('2026-07-07T10:00:00.000Z'),
        NOW,
      ),
    ).toBe(true);
  });

  it('hides finished subtasks completed on a previous day', () => {
    expect(
      isVisibleInKioskDailyQueue(
        { status: 'finished' },
        new Date('2026-07-06T23:00:00.000Z'),
        NOW,
      ),
    ).toBe(false);
  });

  it('hides finished subtasks without finishedAt', () => {
    expect(
      isVisibleInKioskDailyQueue({ status: 'finished' }, null, NOW),
    ).toBe(false);
  });
});

describe('filterKioskDailyQueue', () => {
  it('removes finished subtasks from previous days', () => {
    const rows = filterKioskDailyQueue(
      [
        row({ documentId: 'a', status: 'waiting' }),
        row({
          documentId: 'b',
          status: 'finished',
          finishedAt: '2026-07-06T12:00:00.000Z',
        }),
        row({
          documentId: 'c',
          status: 'finished',
          finishedAt: '2026-07-07T12:00:00.000Z',
        }),
      ],
      NOW,
    );
    expect(rows.map((item) => item.documentId)).toEqual(['a', 'c']);
  });
});

describe('sortKioskDailyQueue', () => {
  it('orders producing first, then pending, then finished', () => {
    const sorted = sortKioskDailyQueue([
      row({ documentId: 'done', status: 'finished', index: 0 }),
      row({ documentId: 'wait', status: 'waiting', index: 1 }),
      row({ documentId: 'run', status: 'producing', index: 2 }),
    ]);
    expect(sorted.map((item) => item.documentId)).toEqual([
      'run',
      'wait',
      'done',
    ]);
  });

  it('orders by task index then subtask index within pending group', () => {
    const sorted = sortKioskDailyQueue([
      row({
        documentId: 'b2',
        status: 'waiting',
        taskIndex: 1,
        index: 1,
      }),
      row({
        documentId: 'a1',
        status: 'waiting',
        taskIndex: 0,
        index: 0,
      }),
      row({
        documentId: 'b1',
        status: 'waiting',
        taskIndex: 1,
        index: 0,
      }),
    ]);
    expect(sorted.map((item) => item.documentId)).toEqual(['a1', 'b1', 'b2']);
  });
});
