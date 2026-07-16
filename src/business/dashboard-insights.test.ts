import { describe, expect, it } from 'vitest';

import {
  aggregateDailyIncomeFromActivities,
  buildMonthlyRankingRows,
  buildMonthDayKeys,
  buildPreviousMonthsSummary,
  previousMonthDates,
} from './dashboard-insights';

describe('buildMonthDayKeys', () => {
  it('returns every day in the reference month', () => {
    expect(buildMonthDayKeys(new Date('2026-07-15T12:00:00Z'))).toHaveLength(31);
    expect(buildMonthDayKeys(new Date('2026-02-10T12:00:00Z'))[0]).toBe('2026-02-01');
  });
});

describe('previousMonthDates', () => {
  it('returns the three previous month starts oldest first', () => {
    expect(previousMonthDates(new Date('2026-07-10T00:00:00Z'), 3)).toEqual([
      '2026-04-01',
      '2026-05-01',
      '2026-06-01',
    ]);
  });
});

describe('buildMonthlyRankingRows', () => {
  const users = [
    { documentId: 'u1', name: 'Ana' },
    { documentId: 'u2', name: 'Bia' },
    { documentId: 'u3', name: 'Caio' },
  ];
  const currencies = [
    { id: 1, name: 'star', title: 'Estrela', pluralTitle: 'Estrelas' },
  ];

  it('sorts by totalIncome desc and assigns ranks with ties', () => {
    const result = buildMonthlyRankingRows(
      users,
      [
        { userDocumentId: 'u1', currencyId: 1, totalIncome: 100 },
        { userDocumentId: 'u2', currencyId: 1, totalIncome: 100 },
        { userDocumentId: 'u3', currencyId: 1, totalIncome: 50 },
      ],
      currencies,
    );

    expect(result[0].rows.map((row) => row.rank)).toEqual([1, 1, 3]);
    expect(result[0].rows[2].totalIncome).toBe(50);
  });

  it('defaults missing balances to zero income', () => {
    const result = buildMonthlyRankingRows(users, [], currencies);
    expect(result[0].rows.every((row) => row.totalIncome === 0)).toBe(true);
  });
});

describe('aggregateDailyIncomeFromActivities', () => {
  it('groups credited stars by UTC day and zero-fills the month', () => {
    const result = aggregateDailyIncomeFromActivities(
      [
        {
          timestamp: '2026-07-05T15:00:00Z',
          action: 'stoped',
          subTaskStatus: 'finished',
          expectedTime: 10,
          currencyAwarded: 0,
          currencyId: 1,
        },
        {
          timestamp: '2026-07-05T18:00:00Z',
          action: 'stoped',
          subTaskStatus: 'finished',
          expectedTime: 5,
          currencyAwarded: 0,
          currencyId: 1,
        },
        {
          timestamp: '2026-07-06T10:00:00Z',
          action: 'started',
          subTaskStatus: 'finished',
          expectedTime: 100,
          currencyAwarded: 0,
          currencyId: 1,
        },
      ],
      [{ id: 1, currencyPerSecond: 2 }],
      new Date('2026-07-10T00:00:00Z'),
    );

    const days = result[0].days;
    expect(days.find((day) => day.date === '2026-07-05')?.amount).toBe(30);
    expect(days.find((day) => day.date === '2026-07-06')?.amount).toBe(0);
    expect(days.find((day) => day.date === '2026-07-01')?.amount).toBe(0);
  });
});

describe('buildPreviousMonthsSummary', () => {
  it('builds net income/outcome for the previous three months', () => {
    const result = buildPreviousMonthsSummary(
      [
        {
          month: '2026-04-01',
          currencyId: 1,
          totalIncome: 100,
          totalOutcome: 20,
        },
        {
          month: '2026-06-01',
          currencyId: 1,
          totalIncome: 50,
          totalOutcome: 10,
        },
      ],
      [{ id: 1 }],
      new Date('2026-07-10T00:00:00Z'),
      3,
    );

    expect(result[0].months).toEqual([
      { month: '2026-04-01', totalIncome: 100, totalOutcome: 20, net: 80 },
      { month: '2026-05-01', totalIncome: 0, totalOutcome: 0, net: 0 },
      { month: '2026-06-01', totalIncome: 50, totalOutcome: 10, net: 40 },
    ]);
  });
});
