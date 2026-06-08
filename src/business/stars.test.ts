import { describe, it, expect } from 'vitest';
import { calculateStars, shouldCreditStars } from './stars';

describe('calculateStars', () => {
  it('multiplies expectedTime by currencyPerSecond', () => {
    expect(calculateStars({ expectedTime: 60 }, { currencyPerSecond: 2 })).toBe(120);
  });

  it('returns 0 for non-positive expectedTime', () => {
    expect(calculateStars({ expectedTime: -10 }, { currencyPerSecond: 2 })).toBe(0);
  });

  it('returns 0 when the rate is missing', () => {
    expect(calculateStars({ expectedTime: 60 }, { currencyPerSecond: 0 })).toBe(0);
  });
});

describe('shouldCreditStars', () => {
  it('credits when stopped and sub-task is finished', () => {
    expect(shouldCreditStars({ action: 'stoped', subTaskStatus: 'finished' })).toBe(true);
  });

  it('does not credit when only started', () => {
    expect(shouldCreditStars({ action: 'started', subTaskStatus: 'finished' })).toBe(
      false,
    );
  });

  it('does not credit when stopped but sub-task is not finished', () => {
    expect(shouldCreditStars({ action: 'stoped', subTaskStatus: 'queued' })).toBe(false);
  });
});
