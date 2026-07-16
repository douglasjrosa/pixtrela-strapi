import { calculateCurrencyAmount, shouldCreditCurrency } from './work-currency';
import { firstDayOfMonth } from './balance';

export interface RankingUser {
  documentId: string;
  name: string;
}

export interface RankingBalance {
  userDocumentId: string;
  currencyId: number;
  totalIncome: number;
}

export interface RankingRow {
  rank: number;
  userDocumentId: string;
  name: string;
  totalIncome: number;
}

export interface CurrencyInfo {
  id: number;
  name: string;
  title: string;
  pluralTitle: string;
}

export interface CurrencyRanking {
  id: number;
  name: string;
  title: string;
  pluralTitle: string;
  rows: RankingRow[];
}

export interface ActivityIncomeRow {
  timestamp: string;
  action: 'started' | 'stoped';
  subTaskStatus: string;
  expectedTime: number;
  currencyAwarded: number;
  currencyId: number;
}

export interface CurrencyRate {
  id: number;
  currencyPerSecond: number;
}

export interface DayIncome {
  date: string;
  amount: number;
}

export interface DailyIncomeByCurrency {
  currencyId: number;
  days: DayIncome[];
}

export interface MonthBalanceRow {
  month: string;
  currencyId: number;
  totalIncome: number;
  totalOutcome: number;
}

export interface MonthSummary {
  month: string;
  totalIncome: number;
  totalOutcome: number;
  net: number;
}

export interface PreviousMonthsByCurrency {
  currencyId: number;
  months: MonthSummary[];
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function toUtcDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildMonthDayKeys(referenceMonth: Date): string[] {
  const year = referenceMonth.getUTCFullYear();
  const monthIndex = referenceMonth.getUTCMonth();
  const month = String(monthIndex + 1).padStart(2, '0');
  const dayCount = daysInUtcMonth(year, monthIndex);

  return Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

export function previousMonthDates(reference: Date, count: number): string[] {
  const dates: string[] = [];
  for (let offset = count; offset >= 1; offset -= 1) {
    const monthDate = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1),
    );
    dates.push(firstDayOfMonth(monthDate));
  }
  return dates;
}

export function buildMonthlyRankingRows(
  users: RankingUser[],
  balances: RankingBalance[],
  currencies: CurrencyInfo[],
): CurrencyRanking[] {
  return currencies.map((currency) => {
    const incomeByUser = new Map<string, number>();
    for (const balance of balances) {
      if (balance.currencyId !== currency.id) continue;
      incomeByUser.set(balance.userDocumentId, balance.totalIncome);
    }

    const sorted = [...users]
      .map((user) => ({
        userDocumentId: user.documentId,
        name: user.name,
        totalIncome: incomeByUser.get(user.documentId) ?? 0,
      }))
      .sort((left, right) => {
        if (right.totalIncome !== left.totalIncome) {
          return right.totalIncome - left.totalIncome;
        }
        return left.name.localeCompare(right.name, 'pt-BR');
      });

    const rows: RankingRow[] = [];
    for (const [index, entry] of sorted.entries()) {
      const previous = sorted[index - 1];
      const rank =
        index > 0 && previous.totalIncome === entry.totalIncome
          ? rows[index - 1].rank
          : index + 1;

      rows.push({
        rank,
        userDocumentId: entry.userDocumentId,
        name: entry.name,
        totalIncome: entry.totalIncome,
      });
    }

    return {
      id: currency.id,
      name: currency.name,
      title: currency.title,
      pluralTitle: currency.pluralTitle,
      rows,
    };
  });
}

export function aggregateDailyIncomeFromActivities(
  activities: ActivityIncomeRow[],
  currencies: CurrencyRate[],
  referenceMonth: Date,
): DailyIncomeByCurrency[] {
  const monthPrefix = firstDayOfMonth(referenceMonth).slice(0, 7);
  const dayKeys = buildMonthDayKeys(referenceMonth);
  const rates = new Map(currencies.map((currency) => [currency.id, currency]));

  return currencies.map((currency) => {
    const amounts = new Map<string, number>();
    for (const day of dayKeys) {
      amounts.set(day, 0);
    }

    const rate = rates.get(currency.id);
    if (!rate) {
      return {
        currencyId: currency.id,
        days: dayKeys.map((date) => ({ date, amount: 0 })),
      };
    }

    for (const activity of activities) {
      if (activity.currencyId !== currency.id) continue;

      const dayKey = toUtcDateKey(activity.timestamp);
      if (!dayKey.startsWith(monthPrefix)) continue;

      let amount = Math.max(0, Number(activity.currencyAwarded) || 0);
      if (
        amount <= 0 &&
        shouldCreditCurrency({
          action: activity.action,
          subTaskStatus: activity.subTaskStatus,
        })
      ) {
        amount = calculateCurrencyAmount(
          { expectedTime: activity.expectedTime },
          { currencyPerSecond: rate.currencyPerSecond },
        );
      }
      if (amount <= 0) continue;

      amounts.set(dayKey, (amounts.get(dayKey) ?? 0) + amount);
    }

    return {
      currencyId: currency.id,
      days: dayKeys.map((date) => ({
        date,
        amount: amounts.get(date) ?? 0,
      })),
    };
  });
}

export function buildPreviousMonthsSummary(
  balances: MonthBalanceRow[],
  currencies: { id: number }[],
  referenceMonth: Date,
  count = 3,
): PreviousMonthsByCurrency[] {
  const monthDates = previousMonthDates(referenceMonth, count);

  return currencies.map((currency) => ({
    currencyId: currency.id,
    months: monthDates.map((month) => {
      const row = balances.find(
        (balance) => balance.currencyId === currency.id && balance.month === month,
      );
      const totalIncome = row?.totalIncome ?? 0;
      const totalOutcome = row?.totalOutcome ?? 0;
      return {
        month,
        totalIncome,
        totalOutcome,
        net: totalIncome - totalOutcome,
      };
    }),
  }));
}
