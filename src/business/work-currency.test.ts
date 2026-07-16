import { describe, expect, it } from 'vitest';

import {
  calculateCurrencyAmount,
  calculateDurationCurrencyCredits,
  calculateQtySessionCurrency,
  rescaleExpectedTimeForTaskQtyChange,
  resolveSecondsPerPiece,
  resolveSubTaskTargetQty,
  scaleExpectedTimeByTaskQty,
  shouldCreditCurrency,
  shouldCreditDurationCurrency,
} from './work-currency';

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

describe('calculateQtySessionCurrency', () => {
  const currency = { currencyPerSecond: 1 };

  it('pays per piece using expected time share', () => {
    const context = {
      expectedTime: 300,
      qty: 2,
      taskQty: 10,
      sharingType: 'qty' as const,
    };
    expect(
      calculateQtySessionCurrency(context, { sessionQty: 5 }, currency),
    ).toBe(75);
    expect(
      calculateQtySessionCurrency(context, { sessionQty: 12 }, currency),
    ).toBe(180);
    expect(
      calculateQtySessionCurrency(context, { sessionQty: 3 }, currency),
    ).toBe(45);
  });

  it('pays 60 each when two workers finish one piece of two', () => {
    const context = {
      expectedTime: 120,
      qty: 2,
      taskQty: 1,
      sharingType: 'qty' as const,
    };
    expect(
      calculateQtySessionCurrency(context, { sessionQty: 1 }, currency),
    ).toBe(60);
  });

  it('returns 0 for duration sharing', () => {
    expect(
      calculateQtySessionCurrency(
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

describe('calculateDurationCurrencyCredits', () => {
  const currency = { currencyPerSecond: 1 };
  const context = {
    expectedTime: 300,
    qty: 2,
    taskQty: 10,
    sharingType: 'duration' as const,
  };

  it('splits expected pool by time-spent share with ceil', () => {
    expect(
      calculateDurationCurrencyCredits(
        context,
        [
          { colaboratorId: 1, timeSpentSeconds: 150 },
          { colaboratorId: 2, timeSpentSeconds: 100 },
          { colaboratorId: 3, timeSpentSeconds: 200 },
        ],
        currency,
      ),
    ).toEqual([
      { colaboratorId: 1, amount: 100 },
      { colaboratorId: 2, amount: 67 },
      { colaboratorId: 3, amount: 134 },
    ]);
  });

  it('returns empty when no positive participation', () => {
    expect(
      calculateDurationCurrencyCredits(
        context,
        [{ colaboratorId: 1, timeSpentSeconds: 0 }],
        currency,
      ),
    ).toEqual([]);
  });
});

describe('calculateCurrencyAmount (legacy helper)', () => {
  it('multiplies expectedTime by currencyPerSecond', () => {
    expect(
      calculateCurrencyAmount({ expectedTime: 60 }, { currencyPerSecond: 2 }),
    ).toBe(120);
  });
});

describe('shouldCreditDurationCurrency', () => {
  it('credits when stopped and sub-task is finished', () => {
    expect(
      shouldCreditDurationCurrency({
        action: 'stoped',
        subTaskStatus: 'finished',
      }),
    ).toBe(true);
  });

  it('does not credit when only started', () => {
    expect(
      shouldCreditDurationCurrency({
        action: 'started',
        subTaskStatus: 'finished',
      }),
    ).toBe(false);
  });

  it('does not credit when stopped but sub-task is not finished', () => {
    expect(
      shouldCreditDurationCurrency({
        action: 'stoped',
        subTaskStatus: 'waiting',
      }),
    ).toBe(false);
  });

  it('keeps shouldCreditCurrency as alias', () => {
    expect(
      shouldCreditCurrency({ action: 'stoped', subTaskStatus: 'finished' }),
    ).toBe(true);
  });
});
