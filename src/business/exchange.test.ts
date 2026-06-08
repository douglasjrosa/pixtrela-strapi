import { describe, it, expect } from 'vitest';
import {
  awardPricesFromValues,
  isExchangeWindowOpen,
  exchangeCost,
  canAfford,
} from './exchange';

const team = { exchangesFirstDay: 5, exchangesLastDay: 15 };

describe('isExchangeWindowOpen', () => {
  it('is open on the first day', () => {
    expect(isExchangeWindowOpen(team, new Date('2026-06-05T00:00:00Z'))).toBe(true);
  });

  it('is open on the last day', () => {
    expect(isExchangeWindowOpen(team, new Date('2026-06-15T00:00:00Z'))).toBe(true);
  });

  it('is closed before the window', () => {
    expect(isExchangeWindowOpen(team, new Date('2026-06-04T00:00:00Z'))).toBe(false);
  });

  it('is closed after the window', () => {
    expect(isExchangeWindowOpen(team, new Date('2026-06-16T00:00:00Z'))).toBe(false);
  });
});

describe('awardPricesFromValues', () => {
  it('maps Value component rows using currency name and numberOf', () => {
    const prices = awardPricesFromValues([
      { currency: { name: 'star' }, numberOf: 100 },
      { currency: { name: 'gem' }, numberOf: 5 },
    ]);
    expect(prices).toEqual([
      { currency: 'star', qty: 100 },
      { currency: 'gem', qty: 5 },
    ]);
  });

  it('returns empty array when values is missing', () => {
    expect(awardPricesFromValues(null)).toEqual([]);
  });
});

describe('exchangeCost', () => {
  const priceTable = [
    { currency: 'star', qty: 100 },
    { currency: 'gem', qty: 5 },
  ];

  it('multiplies the unit price by quantity', () => {
    expect(exchangeCost(priceTable, 'star', 3)).toBe(300);
  });

  it('returns 0 for an unknown currency', () => {
    expect(exchangeCost(priceTable, 'unknown', 3)).toBe(0);
  });
});

describe('canAfford', () => {
  it('allows when balance covers the cost', () => {
    expect(canAfford(300, 300)).toBe(true);
  });

  it('rejects when balance is insufficient', () => {
    expect(canAfford(299, 300)).toBe(false);
  });

  it('rejects a zero cost', () => {
    expect(canAfford(100, 0)).toBe(false);
  });
});
