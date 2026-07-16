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
  it('sums sub-task expected times without multiplying by task qty', () => {
    expect(calculateTotalExpectedTime([60, 120])).toBe(180);
    expect(calculateTotalExpectedTime([300, 150])).toBe(450);
  });

  it('returns zero when there are no sub-tasks', () => {
    expect(calculateTotalExpectedTime([])).toBe(0);
  });
});
