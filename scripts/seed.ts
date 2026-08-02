import { compileStrapi, createStrapi } from '@strapi/strapi';

import { firstDayOfMonth } from '../src/business/balance';
import { DEFAULT_ASSIGN_WARN_MAX } from '../src/business/assign-warn-max';
import { DEFAULT_KIOSK_SESSION_IDLE_SECONDS } from '../src/business/kiosk-session-idle';
import { ROUTE_THEME_SEED } from '../src/business/route-theme';
import {
  DEMO_AWARDS,
  DEMO_BALANCES,
  DEMO_CURRENCY,
  DEMO_PASSWORD,
  DEMO_PRESETS,
  DEMO_ROUTE_THEME_COLORS,
  DEMO_STEPS,
  DEMO_TASKS,
  DEMO_TEAMS,
  DEMO_TEMPLATES,
  DEMO_USERS,
  buildDemoCredentialsSummary,
  findStepNameForStatus,
  recomputeDemoBalance,
  type DemoRoleType,
} from '../src/business/demo-seed';

const CURRENCY_UID = 'api::currency.currency';
const CURRENCY_FOR_SUBTASKS_UID =
  'api::currency-for-subtasks.currency-for-subtasks';
const STEP_UID = 'api::step.step';
const KIOSK_SETTING_UID = 'api::kiosk-setting.kiosk-setting';
const TASK_AUTOMATION_SETTING_UID =
  'api::task-automation-setting.task-automation-setting';
const ROUTE_THEME_UID = 'api::route-theme.route-theme';
const TEAM_UID = 'api::team.team';
const AWARD_UID = 'api::award.award';
const TEMPLATE_UID = 'api::template-task.template-task';
const PRESET_UID = 'api::sub-task-preset.sub-task-preset';
const TASK_UID = 'api::task.task';
const SUB_TASK_UID = 'api::sub-task.sub-task';
const BALANCE_UID = 'api::balance.balance';
const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';

type StrapiApp = Awaited<ReturnType<ReturnType<typeof createStrapi>['load']>>;

async function ensureCurrency(app: StrapiApp): Promise<string> {
  const existing = await app.documents(CURRENCY_UID).findMany({
    filters: { name: DEMO_CURRENCY.name },
    limit: 1,
  });
  if (existing[0]?.documentId) {
    return existing[0].documentId as string;
  }
  const created = await app.documents(CURRENCY_UID).create({
    data: { ...DEMO_CURRENCY },
  });
  return created.documentId as string;
}

async function ensureCurrencyForSubtasks(
  app: StrapiApp,
  currencyDocumentId: string,
): Promise<void> {
  const current = await app.documents(CURRENCY_FOR_SUBTASKS_UID).findFirst({
    populate: { currency: { fields: ['documentId'] } },
  });
  const linked = current?.currency as { documentId?: string } | null | undefined;
  if (!current) {
    await app.documents(CURRENCY_FOR_SUBTASKS_UID).create({
      data: { currency: currencyDocumentId },
    });
    return;
  }
  if (!linked?.documentId) {
    await app.documents(CURRENCY_FOR_SUBTASKS_UID).update({
      documentId: current.documentId,
      data: { currency: currencyDocumentId },
    });
  }
}

async function ensureSteps(app: StrapiApp): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (const step of DEMO_STEPS) {
    const existing = await app.documents(STEP_UID).findMany({
      filters: { name: step.name },
      limit: 1,
    });
    if (existing[0]?.documentId) {
      const currentIndex = (existing[0] as { index?: number }).index;
      if (currentIndex !== step.index) {
        await app.documents(STEP_UID).update({
          documentId: existing[0].documentId,
          data: { index: step.index },
        });
      }
      byName.set(step.name, existing[0].documentId as string);
      continue;
    }
    const created = await app.documents(STEP_UID).create({
      data: { name: step.name, index: step.index },
    });
    byName.set(step.name, created.documentId as string);
  }
  return byName;
}

async function ensureKioskSetting(app: StrapiApp): Promise<void> {
  const existing = await app.documents(KIOSK_SETTING_UID).findFirst();
  if (existing) return;
  await app.documents(KIOSK_SETTING_UID).create({
    data: { sessionIdleSeconds: DEFAULT_KIOSK_SESSION_IDLE_SECONDS },
  });
}

async function ensureTaskAutomation(
  app: StrapiApp,
  stepsByName: Map<string, string>,
): Promise<void> {
  const relationKeys = [
    'waiting',
    'producing',
    'paused',
    'finished',
    'reviewed',
    'delivered',
  ] as const;

  const stepLinks: Record<string, string> = {};
  for (const key of relationKeys) {
    const stepName = findStepNameForStatus(key);
    const documentId = stepName ? stepsByName.get(stepName) : undefined;
    if (documentId) {
      stepLinks[`${key}Step`] = documentId;
    }
  }

  const existing = await app.documents(TASK_AUTOMATION_SETTING_UID).findFirst({
    populate: {
      waitingStep: { fields: ['documentId'] },
      producingStep: { fields: ['documentId'] },
      pausedStep: { fields: ['documentId'] },
      finishedStep: { fields: ['documentId'] },
      reviewedStep: { fields: ['documentId'] },
      deliveredStep: { fields: ['documentId'] },
    },
  });

  if (!existing) {
    await app.documents(TASK_AUTOMATION_SETTING_UID).create({
      data: {
        assignWarnMax: DEFAULT_ASSIGN_WARN_MAX,
        ...stepLinks,
      },
    });
    return;
  }

  const patch: Record<string, unknown> = {};
  if (
    typeof (existing as { assignWarnMax?: number | null }).assignWarnMax !==
    'number'
  ) {
    patch.assignWarnMax = DEFAULT_ASSIGN_WARN_MAX;
  }

  for (const [field, documentId] of Object.entries(stepLinks)) {
    const current = (existing as Record<string, { documentId?: string } | null>)[
      field
    ];
    if (!current?.documentId) {
      patch[field] = documentId;
    }
  }

  if (Object.keys(patch).length === 0) return;
  await app.documents(TASK_AUTOMATION_SETTING_UID).update({
    documentId: existing.documentId,
    data: patch,
  });
}

async function ensureRouteThemes(app: StrapiApp): Promise<void> {
  const existing = await app.documents(ROUTE_THEME_UID).findMany({
    fields: ['routeKey', 'documentId'],
    limit: 50,
  });
  const byKey = new Map(
    existing.map((row) => [
      (row as { routeKey?: string }).routeKey ?? '',
      row.documentId as string,
    ]),
  );

  for (const seed of ROUTE_THEME_SEED) {
    if (byKey.has(seed.routeKey)) continue;
    const colors = DEMO_ROUTE_THEME_COLORS[seed.routeKey];
    await app.documents(ROUTE_THEME_UID).create({
      data: {
        routeKey: seed.routeKey,
        label: seed.label,
        ...(colors ?? {}),
      },
    });
  }
}

async function findRoleId(
  app: StrapiApp,
  roleType: DemoRoleType,
): Promise<number> {
  const role = await app.db.query(ROLE_UID).findOne({
    where: { type: roleType },
  });
  if (!role?.id) {
    throw new Error(
      `Role "${roleType}" not found. Start Strapi once so bootstrap creates roles.`,
    );
  }
  return role.id as number;
}

async function ensureUsers(
  app: StrapiApp,
): Promise<Map<string, { id: number; documentId: string }>> {
  const userService = app.plugin('users-permissions').service('user');
  const byUsername = new Map<string, { id: number; documentId: string }>();

  for (const user of DEMO_USERS) {
    const existing = await app.db.query(USER_UID).findOne({
      where: { username: user.username },
    });
    if (existing) {
      byUsername.set(user.username, {
        id: existing.id as number,
        documentId: String(existing.documentId ?? existing.id),
      });
      continue;
    }

    const roleId = await findRoleId(app, user.roleType);
    const created = await userService.add({
      username: user.username,
      email: user.email,
      password: DEMO_PASSWORD,
      confirmed: true,
      blocked: false,
      provider: 'local',
      role: roleId,
      name: user.name,
      roleType: user.roleType,
      ...(user.code != null ? { code: user.code } : {}),
      ...(user.greetingGender ? { greetingGender: user.greetingGender } : {}),
    });
    byUsername.set(user.username, {
      id: created.id as number,
      documentId: String(created.documentId ?? created.id),
    });
  }

  return byUsername;
}

async function ensureTeams(
  app: StrapiApp,
  usersByUsername: Map<string, { id: number; documentId: string }>,
): Promise<void> {
  for (const team of DEMO_TEAMS) {
    const existing = await app.documents(TEAM_UID).findMany({
      filters: { name: team.name },
      limit: 1,
    });
    if (existing.length > 0) continue;

    const leader = usersByUsername.get(team.leaderUsername);
    if (!leader) {
      throw new Error(`Missing leader user ${team.leaderUsername}`);
    }
    const colaboratorIds = team.colaboratorUsernames.map((username) => {
      const user = usersByUsername.get(username);
      if (!user) throw new Error(`Missing colaborator ${username}`);
      return user.documentId;
    });

    await app.documents(TEAM_UID).create({
      data: {
        name: team.name,
        leader: leader.documentId,
        colaborators: colaboratorIds,
        exchangesFirstDay: team.exchangesFirstDay,
        exchangesLastDay: team.exchangesLastDay,
        since: firstDayOfMonth(new Date()),
      },
    });
  }
}

async function ensurePresets(app: StrapiApp): Promise<void> {
  for (const preset of DEMO_PRESETS) {
    const existing = await app.documents(PRESET_UID).findMany({
      filters: { name: preset.name },
      limit: 1,
    });
    if (existing.length > 0) continue;
    await app.documents(PRESET_UID).create({ data: { ...preset } });
  }
}

async function ensureTemplates(app: StrapiApp): Promise<void> {
  for (const template of DEMO_TEMPLATES) {
    const existing = await app.documents(TEMPLATE_UID).findMany({
      filters: { code: template.code },
      limit: 1,
    });
    if (existing.length > 0) continue;
    await app.documents(TEMPLATE_UID).create({
      data: {
        name: template.name,
        code: template.code,
        subTask: template.subTasks,
      },
    });
  }
}

async function ensureAwards(
  app: StrapiApp,
  currencyDocumentId: string,
): Promise<void> {
  for (const award of DEMO_AWARDS) {
    const existing = await app.documents(AWARD_UID).findMany({
      filters: { name: award.name },
      limit: 1,
    });
    if (existing.length > 0) continue;
    await app.documents(AWARD_UID).create({
      data: {
        name: award.name,
        title: award.title,
        description: award.description,
        Value: [
          {
            currency: currencyDocumentId,
            numberOf: award.stars,
          },
        ],
      },
    });
  }
}

async function ensureTasks(
  app: StrapiApp,
  stepsByName: Map<string, string>,
  usersByUsername: Map<string, { id: number; documentId: string }>,
): Promise<void> {
  for (const task of DEMO_TASKS) {
    const existing = await app.documents(TASK_UID).findMany({
      filters: { name: task.name },
      limit: 1,
    });
    if (existing.length > 0) continue;

    const stepName = findStepNameForStatus(task.status);
    const stepDocumentId = stepName ? stepsByName.get(stepName) : undefined;
    const totalExpectedTime = task.subTasks.reduce(
      (sum, subTask) => sum + subTask.expectedTime,
      0,
    );

    const created = await app.documents(TASK_UID).create({
      data: {
        name: task.name,
        qty: task.qty,
        status: task.status,
        index: task.index,
        active: true,
        totalExpectedTime,
        totalTimeSpent: 0,
        ...(stepDocumentId ? { step: stepDocumentId } : {}),
      },
    });

    for (const subTask of task.subTasks) {
      const assigneeIds = subTask.assigneeUsernames.map((username) => {
        const user = usersByUsername.get(username);
        if (!user) throw new Error(`Missing assignee ${username}`);
        return user.documentId;
      });
      await app.documents(SUB_TASK_UID).create({
        data: {
          name: subTask.name,
          task: created.documentId,
          index: subTask.index,
          qty: subTask.qty,
          sharingType: subTask.sharingType,
          maxSameTimeWorkers: subTask.maxSameTimeWorkers,
          expectedTime: subTask.expectedTime,
          status: subTask.status,
          activationStatus: subTask.activationStatus,
          timeSpent: 0,
          assignedTo: assigneeIds,
        },
      });
    }
  }
}

async function ensureBalances(
  app: StrapiApp,
  currencyDocumentId: string,
  usersByUsername: Map<string, { id: number; documentId: string }>,
): Promise<void> {
  const monthDate = firstDayOfMonth(new Date());
  const currency = await app.documents(CURRENCY_UID).findOne({
    documentId: currencyDocumentId,
  });
  const currencyId = currency?.id as number | undefined;
  if (!currencyId) {
    throw new Error('Currency numeric id missing for balance seed');
  }

  for (const balance of DEMO_BALANCES) {
    const user = usersByUsername.get(balance.username);
    if (!user) continue;

    const existing = await app.db.query(BALANCE_UID).findMany({
      where: {
        date: monthDate,
        user: user.id,
        currency: currencyId,
      },
      limit: 1,
    });
    if (existing.length > 0) continue;

    await app.documents(BALANCE_UID).create({
      data: {
        user: user.documentId,
        currency: currencyDocumentId,
        date: monthDate,
        previousBalance: balance.previousBalance,
        totalIncome: balance.totalIncome,
        totalOutcome: balance.totalOutcome,
        balance: recomputeDemoBalance(balance),
      },
    });
  }
}

async function seed() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  let failed = false;

  try {
    app.log.info('[pixtrela] seeding currency and payment settings…');
    const currencyDocumentId = await ensureCurrency(app);
    await ensureCurrencyForSubtasks(app, currencyDocumentId);

    app.log.info('[pixtrela] seeding steps, kiosk and task automation…');
    const stepsByName = await ensureSteps(app);
    await ensureKioskSetting(app);
    await ensureTaskAutomation(app, stepsByName);
    await ensureRouteThemes(app);

    app.log.info('[pixtrela] seeding demo users, teams and catalogs…');
    const usersByUsername = await ensureUsers(app);
    await ensureTeams(app, usersByUsername);
    await ensurePresets(app);
    await ensureTemplates(app);
    await ensureAwards(app, currencyDocumentId);

    app.log.info('[pixtrela] seeding sample board tasks and balances…');
    await ensureTasks(app, stepsByName, usersByUsername);
    await ensureBalances(app, currencyDocumentId, usersByUsername);

    app.log.info('[pixtrela] seed complete');
    app.log.info(`\n${buildDemoCredentialsSummary()}\n`);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      await app.destroy();
    } catch {
      // Strapi/Knex can time out on shutdown after a large seed; data is already written.
    }
  }

  if (failed) process.exitCode = 1;
  else process.exit(0);
}

seed().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
