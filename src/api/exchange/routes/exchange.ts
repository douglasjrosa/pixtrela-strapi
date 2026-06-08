import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::exchange.exchange', {
  config: {
    create: {
      policies: ['global::exchange-window-open'],
    },
  },
});
