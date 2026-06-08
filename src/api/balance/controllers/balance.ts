import { factories } from '@strapi/strapi';

const BALANCE_UID = 'api::balance.balance';
const CURRENCY_UID = 'api::currency.currency';

export default factories.createCoreController(BALANCE_UID, ({ strapi }) => ({
  /**
   * Return the authenticated user's current monthly balance, creating it
   * (carrying over the previous month) when missing.
   */
  async currentForMe(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const [currency] = await strapi.documents(CURRENCY_UID).findMany({ limit: 1 });
    if (!currency) return ctx.badRequest('no currency configured');

    const balance = await strapi
      .service(BALANCE_UID)
      .getOrCreateMonthlyBalance(user.id, currency.id);
    return { data: balance };
  },
}));
