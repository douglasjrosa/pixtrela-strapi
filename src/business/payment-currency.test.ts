import { describe, expect, it } from 'vitest';

import { selectPaymentCurrency } from './payment-currency';

describe('selectPaymentCurrency', () => {
  it('returns the linked currency when present', () => {
    expect(selectPaymentCurrency({ id: 7, currencyPerSecond: 1.5 })).toEqual({
      id: 7,
      currencyPerSecond: 1.5,
    });
  });

  it('returns null when Currency for Subtasks has no relation', () => {
    expect(selectPaymentCurrency(null)).toBeNull();
    expect(selectPaymentCurrency(undefined)).toBeNull();
    expect(selectPaymentCurrency({})).toBeNull();
  });
});
