/**
 * Pure, framework-agnostic exchange (redemption) rules.
 */

export interface ExchangeWindow {
  exchangesFirstDay: number;
  exchangesLastDay: number;
}

export interface AwardPrice {
  currency: string;
  qty: number;
}

/** One row of the Award `Value` component (currency-values.values). */
export interface AwardValueEntry {
  currency?: { name?: string } | null;
  numberOf?: number;
}

/**
 * Trades are only allowed between the team's first and last exchange day.
 */
export function isExchangeWindowOpen(team: ExchangeWindow, date: Date): boolean {
  const day = date.getUTCDate();
  return day >= team.exchangesFirstDay && day <= team.exchangesLastDay;
}

/**
 * Maps the Award `Value` component rows into a flat price table.
 */
export function awardPricesFromValues(
  values: AwardValueEntry[] | null | undefined,
): AwardPrice[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((entry) => entry.currency?.name != null)
    .map((entry) => ({
      currency: entry.currency!.name!,
      qty: Math.max(0, entry.numberOf ?? 0),
    }));
}

/**
 * Cost (in a given currency) to redeem `qty` units of an award.
 */
export function exchangeCost(prices: AwardPrice[], currency: string, qty: number): number {
  const entry = prices.find((price) => price.currency === currency);
  if (!entry) return 0;
  return entry.qty * Math.max(0, qty);
}

/**
 * Whether the current balance can pay the cost.
 */
export function canAfford(balance: number, cost: number): boolean {
  return cost > 0 && balance >= cost;
}
