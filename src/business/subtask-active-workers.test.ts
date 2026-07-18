import { describe, expect, it } from 'vitest';

import {
  countActiveWorkersFromActivities,
  hasOpenStartedSessionFromActions,
  isSubTaskAtWorkerCapacity,
  listActiveColaboratorIdsFromActivities,
  shouldHideSubTaskFromKioskQueue,
} from './subtask-active-workers';
import type { ActivityTimeRow } from './task-time-spent';

function activity(
  colaboratorId: number,
  action: ActivityTimeRow['action'],
  timestamp: string,
): ActivityTimeRow {
  return {
    colaboratorId,
    action,
    timestamp: new Date(timestamp),
  };
}

describe('hasOpenStartedSessionFromActions', () => {
  it('is true only while the latest open action is started', () => {
    expect(hasOpenStartedSessionFromActions(['started'])).toBe(true);
    expect(hasOpenStartedSessionFromActions(['started', 'stoped'])).toBe(false);
    expect(
      hasOpenStartedSessionFromActions(['started', 'stoped', 'started']),
    ).toBe(true);
  });
});

describe('countActiveWorkersFromActivities', () => {
  it('counts colaborators with an open started session', () => {
    const count = countActiveWorkersFromActivities([
      activity(1, 'started', '2026-06-05T10:00:00.000Z'),
      activity(2, 'started', '2026-06-05T10:01:00.000Z'),
      activity(3, 'started', '2026-06-05T10:02:00.000Z'),
      activity(3, 'stoped', '2026-06-05T10:10:00.000Z'),
    ]);

    expect(count).toBe(2);
  });

  it('returns zero when every session was stopped', () => {
    const count = countActiveWorkersFromActivities([
      activity(1, 'started', '2026-06-05T10:00:00.000Z'),
      activity(1, 'stoped', '2026-06-05T10:05:00.000Z'),
    ]);

    expect(count).toBe(0);
  });
});

describe('listActiveColaboratorIdsFromActivities', () => {
  it('returns only colaborators with an open started session', () => {
    expect(
      listActiveColaboratorIdsFromActivities([
        activity(1, 'started', '2026-06-05T10:00:00.000Z'),
        activity(2, 'started', '2026-06-05T10:01:00.000Z'),
        activity(3, 'started', '2026-06-05T10:02:00.000Z'),
        activity(3, 'stoped', '2026-06-05T10:10:00.000Z'),
      ]).sort(),
    ).toEqual([1, 2]);
  });
});

describe('isSubTaskAtWorkerCapacity', () => {
  it('is true when active workers reach maxSameTimeWorkers', () => {
    expect(isSubTaskAtWorkerCapacity(2, 2)).toBe(true);
    expect(isSubTaskAtWorkerCapacity(2, 1)).toBe(false);
    expect(isSubTaskAtWorkerCapacity(1, 1)).toBe(true);
    expect(isSubTaskAtWorkerCapacity(1, 0)).toBe(false);
  });
});

describe('shouldHideSubTaskFromKioskQueue', () => {
  it('hides dual-worker subtasks at capacity from non-active viewers', () => {
    expect(
      shouldHideSubTaskFromKioskQueue({
        maxSameTimeWorkers: 2,
        activeColaboratorIds: [10, 20],
        viewerColaboratorId: 30,
      }),
    ).toBe(true);
  });

  it('keeps dual-worker subtasks visible to active workers at capacity', () => {
    expect(
      shouldHideSubTaskFromKioskQueue({
        maxSameTimeWorkers: 2,
        activeColaboratorIds: [10, 20],
        viewerColaboratorId: 20,
      }),
    ).toBe(false);
  });

  it('does not hide when capacity is not full', () => {
    expect(
      shouldHideSubTaskFromKioskQueue({
        maxSameTimeWorkers: 2,
        activeColaboratorIds: [10],
        viewerColaboratorId: 30,
      }),
    ).toBe(false);
  });
});
