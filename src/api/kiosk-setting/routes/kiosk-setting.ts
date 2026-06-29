import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::kiosk-setting.kiosk-setting', {
  only: ['find', 'update'],
});
