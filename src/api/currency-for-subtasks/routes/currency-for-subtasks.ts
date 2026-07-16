import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::currency-for-subtasks.currency-for-subtasks',
  {
    only: ['find', 'update'],
  },
);
