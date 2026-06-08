import { factories } from '@strapi/strapi';
import {
  awardPricesFromValues,
  canAfford,
  exchangeCost,
  isExchangeWindowOpen,
  type AwardValueEntry,
} from '../../../business/exchange';
import { firstDayOfMonth } from '../../../business/balance';
import { ACTIVE_TEAM_FILTER } from '../../../business/team-active';

const TEAM_UID = 'api::team.team';
const AWARD_UID = 'api::award.award';
const CURRENCY_UID = 'api::currency.currency';
const BALANCE_UID = 'api::balance.balance';
const EXCHANGE_UID = 'api::exchange.exchange';

/**
 * Exchange creation enforces the team window, award price and balance,
 * then debits the colaborator's monthly balance.
 */
export default factories.createCoreController(EXCHANGE_UID, ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { awardId, currency, qty = 1 } = ctx.request.body?.data ?? {};
    if (!awardId || !currency) return ctx.badRequest('awardId and currency are required');

    const [team] = await strapi.documents(TEAM_UID).findMany({
      filters: { ...ACTIVE_TEAM_FILTER, colaborators: user.id },
      limit: 1,
    });
    if (!team) return ctx.badRequest('user has no team');
    const window = {
      exchangesFirstDay: team.exchangesFirstDay ?? 3,
      exchangesLastDay: team.exchangesLastDay ?? 15,
    };
    if (!isExchangeWindowOpen(window, new Date())) {
      return ctx.forbidden('exchange window is closed');
    }

    const award = await strapi.documents(AWARD_UID).findOne({
      documentId: awardId,
      populate: { Value: { populate: { currency: true } } },
    });
    if (!award) return ctx.badRequest('award not found');

    const [currencyEntity] = await strapi.documents(CURRENCY_UID).findMany({
      filters: { name: currency },
      limit: 1,
    });
    if (!currencyEntity) return ctx.badRequest('currency not found');

    const values = (award as { Value?: AwardValueEntry[] }).Value;
    const priceTable = awardPricesFromValues(values);
    const cost = exchangeCost(priceTable, currency, qty);

    const date = firstDayOfMonth(new Date());
    const [monthly] = await strapi.documents(BALANCE_UID).findMany({
      filters: {
        user: { id: user.id },
        currency: { id: currencyEntity.id },
        date,
      },
      limit: 1,
    });
    const balance = monthly ? Number(monthly.balance ?? 0) : 0;
    if (!canAfford(balance, cost)) return ctx.badRequest('insufficient balance');

    await strapi.service(BALANCE_UID).debitOutcome(user.id, currencyEntity.id, cost);

    const created = await strapi.documents(EXCHANGE_UID).create({
      data: {
        user: user.id,
        award: awardId,
        numberOf: cost,
        qty,
        timestamp: new Date(),
      },
    });
    return { data: created };
  },
}));
