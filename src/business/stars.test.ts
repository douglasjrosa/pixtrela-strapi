import { describe, expect, it } from 'vitest';

import {
  calculateDurationStarsCredits,
  calculateQtySessionStars,
  calculateStars,
  rescaleExpectedTimeForTaskQtyChange,
  resolveSecondsPerPiece,
  resolveSubTaskTargetQty,
  scaleExpectedTimeByTaskQty,
  shouldCreditDurationStars,
  shouldCreditStars,
} from './stars';

describe('scaleExpectedTimeByTaskQty', () => {
  it('multiplies base expected time by task qty', () => {
    expect(scaleExpectedTimeByTaskQty(30, 10)).toBe(300);
    expect(scaleExpectedTimeByTaskQty(120, 1)).toBe(120);
  });

  it('uses at least 1 for task qty', () => {
    expect(scaleExpectedTimeByTaskQty(30, 0)).toBe(30);
  });
});

describe('rescaleExpectedTimeForTaskQtyChange', () => {
  it('rescales stored expected time when task qty changes', () => {
    expect(rescaleExpectedTimeForTaskQtyChange(300, 10, 5)).toBe(150);
    expect(rescaleExpectedTimeForTaskQtyChange(120, 1, 10)).toBe(1200);
  });
});

describe('rescaleExpectedTimeForTaskQtyChange', () => {
  it('rescales stored expected time when task qty changes', () => {
    expect(rescaleExpectedTimeForTaskQtyChange(300, 10, 5)).toBe(150);
    expect(rescaleExpectedTimeForTaskQtyChange(120, 1, 10)).toBe(1200);
  });
});

describe('resolveSubTaskTargetQty', () => {
  it('multiplies sub-task qty by task qty', () => {
    expect(resolveSubTaskTargetQty(2, 10)).toBe(20);
    expect(resolveSubTaskTargetQty(2, 1)).toBe(2);
  });
});

describe('resolveSecondsPerPiece', () => {
  it('divides stored expectedTime by task.qty * subTask.qty', () => {
    expect(resolveSecondsPerPiece(300, 2, 10)).toBe(15);
    expect(resolveSecondsPerPiece(120, 2, 1)).toBe(60);
  });
});

describe('calculateQtySessionStars', () => {
  const currency = { currencyPerSecond: 1 };

  it('pays per piece using expected time share', () => {
    const context = {
      expectedTime: 300,
      qty: 2,
      taskQty: 10,
      sharingType: 'qty' as const,
    };
    expect(calculateQtySessionStars(context, { sessionQty: 5 }, currency)).toBe(
      75,
    );
    expect(calculateQtySessionStars(context, { sessionQty: 12 }, currency)).toBe(
      180,
    );
    expect(calculateQtySessionStars(context, { sessionQty: 3 }, currency)).toBe(
      45,
    );
  });

  it('pays 60 stars each when two workers finish one piece of two', () => {
    const context = {
      expectedTime: 120,
      qty: 2,
      taskQty: 1,
      sharingType: 'qty' as const,
    };
    expect(calculateQtySessionStars(context, { sessionQty: 1 }, currency)).toBe(
      60,
    );
  });

  it('returns 0 for duration sharing', () => {
    expect(
      calculateQtySessionStars(
        {
          expectedTime: 120,
          qty: 1,
          taskQty: 1,
          sharingType: 'duration',
        },
        { sessionQty: 1 },
        currency,
      ),
    ).toBe(0);
  });
});

describe('calculateDurationStarsCredits', () => {
  const currency = { currencyPerSecond: 1 };
  const context = {
    expectedTime: 300,
    qty: 2,
    taskQty: 10,
    sharingType: 'duration' as const,
  };

  it('splits expected pool by time-spent share with ceil', () => {
    expect(
      calculateDurationStarsCredits(
        context,
        [
          { colaboratorId: 1, timeSpentSeconds: 150 },
          { colaboratorId: 2, timeSpentSeconds: 100 },
          { colaboratorId: 3, timeSpentSeconds: 200 },
        ],
        currency,
      ),
    ).toEqual([
      { colaboratorId: 1, stars: 100 },
      { colaboratorId: 2, stars: 67 },
      { colaboratorId: 3, stars: 134 },
    ]);
  });

  it('returns empty when no positive participation', () => {
    expect(
      calculateDurationStarsCredits(
        context,
        [{ colaboratorId: 1, timeSpentSeconds: 0 }],
        currency,
      ),
    ).toEqual([]);
  });
});

describe('calculateStars (legacy helper)', () => {
  it('multiplies expectedTime by currencyPerSecond', () => {
    expect(calculateStars({ expectedTime: 60 }, { currencyPerSecond: 2 })).toBe(
      120,
    );
  });
});

describe('shouldCreditDurationStars', () => {
  it('credits when stopped and sub-task is finished', () => {
    expect(
      shouldCreditDurationStars({ action: 'stoped', subTaskStatus: 'finished' }),
    ).toBe(true);
  });

  it('does not credit when only started', () => {
    expect(
      shouldCreditDurationStars({
        action: 'started',
        subTaskStatus: 'finished',
      }),
    ).toBe(false);
  });

  it('does not credit when stopped but sub-task is not finished', () => {
    expect(
      shouldCreditDurationStars({ action: 'stoped', subTaskStatus: 'waiting' }),
    ).toBe(false);
  });

  it('keeps shouldCreditStars as alias', () => {
    expect(
      shouldCreditStars({ action: 'stoped', subTaskStatus: 'finished' }),
    ).toBe(true);
  });
});
