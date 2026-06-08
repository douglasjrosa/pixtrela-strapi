import { describe, expect, it } from 'vitest';

import { calculateActivityDurationSeconds } from './activity-duration';

describe('calculateActivityDurationSeconds', () => {
  it('returns elapsed seconds between two dates', () => {
    const startedAt = new Date('2026-06-05T10:00:00.000Z');
    const endedAt = new Date('2026-06-05T10:01:30.000Z');
    expect(calculateActivityDurationSeconds(startedAt, endedAt)).toBe(90);
  });

  it('returns zero when endedAt is before startedAt', () => {
    const startedAt = new Date('2026-06-05T10:01:00.000Z');
    const endedAt = new Date('2026-06-05T10:00:00.000Z');
    expect(calculateActivityDurationSeconds(startedAt, endedAt)).toBe(0);
  });
});
