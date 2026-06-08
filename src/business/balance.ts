/**
 * Pure, framework-agnostic monthly Balance rules.
 */

export interface BalanceAmounts {
  previousBalance: number;
  totalIncome: number;
  totalOutcome: number;
}

export interface NewMonthlyBalance extends BalanceAmounts {
  date: string;
  balance: number;
}

/**
 * First day of the month for a given date, as an ISO date string (YYYY-MM-DD).
 */
export function firstDayOfMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Recompute the closing balance from its parts.
 */
export function recomputeBalance(amounts: BalanceAmounts): number {
  return amounts.previousBalance + amounts.totalIncome - amounts.totalOutcome;
}

/**
 * Build the payload for a brand new monthly balance, carrying over the
 * previous month's closing balance.
 */
export function buildNewMonthlyBalance(date: Date, previousBalance: number): NewMonthlyBalance {
  const amounts: BalanceAmounts = {
    previousBalance,
    totalIncome: 0,
    totalOutcome: 0,
  };
  return {
    date: firstDayOfMonth(date),
    ...amounts,
    balance: recomputeBalance(amounts),
  };
}
