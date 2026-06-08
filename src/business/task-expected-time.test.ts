import { describe, expect, it } from 'vitest';

import {
  calculateTotalExpectedTime,
  collectSubTaskExpectedTimes,
} from './task-expected-time';

describe('collectSubTaskExpectedTimes', () => {
  it('excludes disabled sub-tasks from the sum', () => {
    expect(
      collectSubTaskExpectedTimes([
        { expectedTime: 60, activationStatus: 'unlocked' },
        { expectedTime: 120, activationStatus: 'disabled' },
        { expectedTime: 30, activationStatus: 'locked' },
      ]),
    ).toEqual([60, 30]);
  });
});

describe('calculateTotalExpectedTime', () => {
  it('sums sub-task expected times and multiplies by task qty', () => {
    expect(calculateTotalExpectedTime([60, 120], 2)).toBe(360);
  });

  it('returns zero when there are no sub-tasks', () => {
    expect(calculateTotalExpectedTime([], 5)).toBe(0);
  });

  it('uses at least 1 for task qty', () => {
    expect(calculateTotalExpectedTime([30], 0)).toBe(30);
  });
});