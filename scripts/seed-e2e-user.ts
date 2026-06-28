import { compileStrapi, createStrapi } from '@strapi/strapi';

/** Local-only credentials for Playwright E2E (see next/.env.example). */
export const E2E_MANAGER_USERNAME = 'e2e-manager';
export const E2E_MANAGER_PASSWORD = 'PixtrelaE2e1';

async function seedE2eManager() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const managerRole = await app.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'manager' },
  });
  if (!managerRole) {
    throw new Error('Manager role not found. Start Strapi once so bootstrap runs.');
  }

  const existing = await app.db.query('plugin::users-permissions.user').findOne({
    where: { username: E2E_MANAGER_USERNAME },
  });
  if (existing) {
    app.log.info(`[pixtrela] E2E manager "${E2E_MANAGER_USERNAME}" already exists`);
    await app.destroy();
    return;
  }

  const userService = app.plugin('users-permissions').service('user');
  await userService.add({
    username: E2E_MANAGER_USERNAME,
    email: 'e2e-manager@pixtrela.local',
    password: E2E_MANAGER_PASSWORD,
    confirmed: true,
    blocked: false,
    provider: 'local',
    role: managerRole.id,
    name: 'E2E Manager',
    roleType: 'manager',
  });

  app.log.info(`[pixtrela] E2E manager "${E2E_MANAGER_USERNAME}" created`);
  await app.destroy();
}

seedE2eManager().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
