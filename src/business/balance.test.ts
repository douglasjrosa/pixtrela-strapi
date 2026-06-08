import { describe, it, expect } from 'vitest';
import { firstDayOfMonth, recomputeBalance, buildNewMonthlyBalance } from './balance';

describe('firstDayOfMonth', () => {
  it('returns the first day of the month as ISO date', () => {
    expect(firstDayOfMonth(new Date('2026-06-15T10:00:00Z'))).toBe('2026-06-01');
  });

  it('pads single-digit months', () => {
    expect(firstDayOfMonth(new Date('2026-01-31T23:59:59Z'))).toBe('2026-01-01');
  });
});

describe('recomputeBalance', () => {
  it('is previous + income - outcome', () => {
    expect(
      recomputeBalance({ previousBalance: 100, totalIncome: 50, totalOutcome: 30 }),
    ).toBe(120);
  });
});

describe('buildNewMonthlyBalance', () => {
  it('carries over the previous balance and zeroes the month', () => {
    const result = buildNewMonthlyBalance(new Date('2026-06-10T00:00:00Z'), 80);
    expect(result).toEqual({
      date: '2026-06-01',
      previousBalance: 80,
      totalIncome: 0,
      totalOutcome: 0,
      balance: 80,
    });
  });
});
