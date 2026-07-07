import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::task-automation-setting.task-automation-setting',
  {
    only: ['find', 'update'],
  },
);
