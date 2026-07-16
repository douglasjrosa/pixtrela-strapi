/**
 * Selects the Currency for Subtasks payment rate.
 * Returns null when the setting has no linked currency (no silent fallback).
 */
export function selectPaymentCurrency(linked: {
  id?: number;
  currencyPerSecond?: number;
} | null | undefined): { id: number; currencyPerSecond: number } | null {
  if (!linked?.id) return null;
  return {
    id: linked.id,
    currencyPerSecond: Number(linked.currencyPerSecond ?? 0),
  };
}
