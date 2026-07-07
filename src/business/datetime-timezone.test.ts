import { describe, expect, it } from 'vitest';

import {
  isSameCalendarDay,
  toCalendarDateKey,
} from './datetime-timezone';

describe('toCalendarDateKey', () => {
  it('formats dates in America/Sao_Paulo', () => {
    const key = toCalendarDateKey(
      new Date('2026-07-07T02:30:00.000Z'),
      'America/Sao_Paulo',
    );
    expect(key).toBe('2026-07-06');
  });
});

describe('isSameCalendarDay', () => {
  it('returns true for same local calendar day', () => {
    expect(
      isSameCalendarDay(
        new Date('2026-07-07T12:00:00.000Z'),
        new Date('2026-07-07T20:00:00.000Z'),
        'America/Sao_Paulo',
      ),
    ).toBe(true);
  });

  it('returns false for different local calendar days', () => {
    expect(
      isSameCalendarDay(
        new Date('2026-07-06T23:00:00.000Z'),
        new Date('2026-07-07T10:00:00.000Z'),
        'America/Sao_Paulo',
      ),
    ).toBe(false);
  });
});
