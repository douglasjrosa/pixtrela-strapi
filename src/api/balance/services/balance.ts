import { factories } from '@strapi/strapi';
import { buildNewMonthlyBalance, firstDayOfMonth, recomputeBalance } from '../../../business/balance';

const BALANCE_UID = 'api::balance.balance';

/**
 * Balance service with Strapi-aware helpers built on top of the pure
 * monthly-balance rules in src/business/balance.ts.
 */
export default factories.createCoreService(BALANCE_UID, ({ strapi }) => ({
  /**
   * Ensure a monthly balance exists for the user/currency and return it.
   * Creates one (carrying over the previous month) when missing.
   */
  async getOrCreateMonthlyBalance(
    userId: string | number,
    currencyId: string | number,
    now: Date = new Date(),
  ) {
    const date = firstDayOfMonth(now);

    const existing = await strapi.documents(BALANCE_UID).findMany({
      filters: {
        user: { id: userId },
        currency: { id: currencyId },
        date,
      },
      limit: 1,
    });
    if (existing.length > 0) return existing[0];

    const previous = await strapi.documents(BALANCE_UID).findMany({
      filters: { user: { id: userId }, currency: { id: currencyId } },
      sort: { date: 'desc' },
      limit: 1,
    });
    const previousBalance = previous.length > 0 ? Number(previous[0].balance ?? 0) : 0;

    const payload = buildNewMonthlyBalance(now, previousBalance);
    return strapi.documents(BALANCE_UID).create({
      data: { ...payload, user: userId, currency: currencyId },
    });
  },

  /**
   * Add income (e.g. earned Stars) to the user's current monthly balance.
   */
  async creditIncome(
    userId: string | number,
    currencyId: string | number,
    amount: number,
    now: Date = new Date(),
  ) {
    const current = await this.getOrCreateMonthlyBalance(userId, currencyId, now);
    const totalIncome = Number(current.totalIncome ?? 0) + amount;
    const amounts = {
      previousBalance: Number(current.previousBalance ?? 0),
      totalIncome,
      totalOutcome: Number(current.totalOutcome ?? 0),
    };
    return strapi.documents(BALANCE_UID).update({
      documentId: current.documentId,
      data: { totalIncome, balance: recomputeBalance(amounts) },
    });
  },

  /**
   * Subtract outcome (e.g. an exchange) from the user's monthly balance.
   */
  async debitOutcome(
    userId: string | number,
    currencyId: string | number,
    amount: number,
    now: Date = new Date(),
  ) {
    const current = await this.getOrCreateMonthlyBalance(userId, currencyId, now);
    const totalOutcome = Number(current.totalOutcome ?? 0) + amount;
    const amounts = {
      previousBalance: Number(current.previousBalance ?? 0),
      totalIncome: Number(current.totalIncome ?? 0),
      totalOutcome,
    };
    return strapi.documents(BALANCE_UID).update({
      documentId: current.documentId,
      data: { totalOutcome, balance: recomputeBalance(amounts) },
    });
  },
}));
