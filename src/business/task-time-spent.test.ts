import { describe, expect, it } from 'vitest';

import {
  calculateSubTaskLiveTimeSpent,
  calculateTaskTotalTimeSpent,
  calculateTimeSpentFromActivities,
  type ActivityTimeRow,
} from './task-time-spent';

const now = new Date('2026-06-05T10:05:00.000Z');

function row(
  action: ActivityTimeRow['action'],
  iso: string,
  colaboratorId: number,
): ActivityTimeRow {
  return { action, timestamp: new Date(iso), colaboratorId };
}

describe('calculateTimeSpentFromActivities', () => {
  it('sums completed started/stoped pairs', () => {
    const total = calculateTimeSpentFromActivities(
      [
        row('started', '2026-06-05T10:00:00.000Z', 1),
        row('stoped', '2026-06-05T10:02:00.000Z', 1),
      ],
      now,
    );
    expect(total).toBe(120);
  });

  it('adds elapsed time for open started activities', () => {
    const total = calculateTimeSpentFromActivities(
      [row('started', '2026-06-05T10:00:00.000Z', 1)],
      now,
    );
    expect(total).toBe(300);
  });
});

describe('calculateSubTaskLiveTimeSpent', () => {
  it('uses stored timeSpent for finished sub-tasks', () => {
    expect(
      calculateSubTaskLiveTimeSpent(
        { timeSpent: 5213, status: 'finished', activities: [] },
        now,
      ),
    ).toBe(5213);
  });

  it('uses activities for producing sub-tasks', () => {
    expect(
      calculateSubTaskLiveTimeSpent(
        {
          timeSpent: 30,
          status: 'producing',
          activities: [row('started', '2026-06-05T10:00:00.000Z', 1)],
        },
        now,
      ),
    ).toBe(300);
  });
});

describe('calculateTaskTotalTimeSpent', () => {
  it('sums finished stored time and producing activity time', () => {
    const total = calculateTaskTotalTimeSpent(
      [
        { timeSpent: 5213, status: 'finished', activities: [] },
        { timeSpent: 138, status: 'finished', activities: [] },
        {
          timeSpent: 0,
          status: 'producing',
          activities: [row('started', '2026-06-05T10:04:00.000Z', 2)],
        },
      ],
      now,
    );
    expect(total).toBe(5411);
  });
});
