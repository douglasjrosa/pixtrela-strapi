import { compileStrapi, createStrapi } from '@strapi/strapi';

import { DEFAULT_KIOSK_SESSION_IDLE_SECONDS } from '../src/business/kiosk-session-idle';

const CURRENCY_UID = 'api::currency.currency';
const STEP_UID = 'api::step.step';
const KIOSK_SETTING_UID = 'api::kiosk-setting.kiosk-setting';
const TASK_AUTOMATION_SETTING_UID =
  'api::task-automation-setting.task-automation-setting';

const DEFAULT_CURRENCY = {
  name: 'star',
  icon: 'star',
  title: 'Estrela',
  pluralTitle: 'Estrelas',
  currencyPerSecond: 1,
};

const DEFAULT_STEPS = [
  { name: 'Fila de produção', index: 1 },
  { name: 'Produzindo', index: 2 },
  { name: 'Pausado', index: 3 },
  { name: 'Finalizado', index: 4 },
];

async function seed() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  const currencies = await app.documents(CURRENCY_UID).findMany({
    filters: { name: DEFAULT_CURRENCY.name },
    limit: 1,
  });
  if (currencies.length === 0) {
    await app.documents(CURRENCY_UID).create({ data: DEFAULT_CURRENCY });
  }

  for (const step of DEFAULT_STEPS) {
    const existing = await app.documents(STEP_UID).findMany({
      filters: { name: step.name },
      limit: 1,
    });
    if (existing.length === 0) {
      await app.documents(STEP_UID).create({ data: step });
    }
  }

  const kioskSetting = await app.documents(KIOSK_SETTING_UID).findFirst();
  if (!kioskSetting) {
    await app.documents(KIOSK_SETTING_UID).create({
      data: { sessionIdleSeconds: DEFAULT_KIOSK_SESSION_IDLE_SECONDS },
    });
  }

  const taskAutomationSetting = await app
    .documents(TASK_AUTOMATION_SETTING_UID)
    .findFirst();
  if (!taskAutomationSetting) {
    await app.documents(TASK_AUTOMATION_SETTING_UID).create({ data: {} });
  }

  app.log.info('[pixtrela] seed complete');
  await app.destroy();
}

seed().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
