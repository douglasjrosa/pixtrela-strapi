import type { Core } from '@strapi/strapi';

import { migrateQueuedStatusToWaiting } from './business/migrate-task-status';
import { registerTaskStepAutomation } from './business/task-step-automation';

import { LOCAL_AUTH_PROVIDER } from './business/user-auth';
import { UPLOAD_CONTENT_API_ACTIONS } from './business/upload-permissions';
import { DEFAULT_KIOSK_SESSION_IDLE_SECONDS } from './business/kiosk-session-idle';

const KIOSK_SETTING_UID = 'api::kiosk-setting.kiosk-setting';
const TASK_AUTOMATION_SETTING_UID =
  'api::task-automation-setting.task-automation-setting';

type ActionName = 'find' | 'findOne' | 'create' | 'update' | 'delete';
type ApiName =
  | 'currency'
  | 'step'
  | 'award'
  | 'team'
  | 'template-task'
  | 'task'
  | 'sub-task'
  | 'sub-task-preset'
  | 'activity'
  | 'balance'
  | 'exchange';

const ALL_APIS: ApiName[] = [
  'currency',
  'step',
  'award',
  'team',
  'template-task',
  'task',
  'sub-task',
  'sub-task-preset',
  'activity',
  'balance',
  'exchange',
];
const ALL_ACTIONS: ActionName[] = ['find', 'findOne', 'create', 'update', 'delete'];
const READ: ActionName[] = ['find', 'findOne'];
const WRITE: ActionName[] = ['find', 'findOne', 'create', 'update'];

const ROLES: { type: string; name: string; description: string }[] = [
  { type: 'admin', name: 'Admin', description: 'Full control over the platform' },
  { type: 'manager', name: 'Manager', description: 'Manages leaders, colaborators and work' },
  { type: 'leader', name: 'Leader', description: 'Leads teams and their colaborators' },
  { type: 'colaborator', name: 'Colaborator', description: 'Produces and exchanges Stars' },
  {
    type: 'kiosk',
    name: 'Kiosk',
    description: 'Fixed access point for colaborator identification',
  },
];

const READ_ALL: Partial<Record<ApiName, ActionName[]>> = Object.fromEntries(
  ALL_APIS.map((api) => [api, READ]),
);

const PERMISSIONS: Record<string, Partial<Record<ApiName, ActionName[]>>> = {
  admin: Object.fromEntries(ALL_APIS.map((api) => [api, ALL_ACTIONS])),
  manager: {
    ...READ_ALL,
    step: WRITE,
    team: WRITE,
    'template-task': [...WRITE, 'delete'],
    task: WRITE,
    'sub-task': WRITE,
    'sub-task-preset': [...WRITE, 'delete'],
    activity: WRITE,
  },
  leader: {
    ...READ_ALL,
    step: WRITE,
    task: WRITE,
    'sub-task': WRITE,
    activity: WRITE,
  },
  colaborator: {
    ...READ_ALL,
    'sub-task': ['find', 'findOne', 'update'],
    activity: ['find', 'findOne', 'create'],
    exchange: ['find', 'findOne', 'create'],
  },
};

async function ensureRole(strapi: Core.Strapi, role: (typeof ROLES)[number]) {
  const repo = strapi.query('plugin::users-permissions.role');
  const existing = await repo.findOne({ where: { type: role.type } });
  if (existing) return existing;
  return repo.create({ data: role });
}

async function ensurePermission(strapi: Core.Strapi, roleId: number, action: string) {
  const repo = strapi.query('plugin::users-permissions.permission');
  const existing = await repo.findOne({ where: { action, role: roleId } });
  if (existing) return;
  await repo.create({ data: { action, role: roleId } });
}

const CM_READ = 'plugin::content-manager.explorer.read';
const UP_ROLE_SUBJECT = 'plugin::users-permissions.role';
const UP_ROLE_READ_FIELDS = ['name', 'description', 'type'];

async function ensureSuperAdminCanReadUpRoles(strapi: Core.Strapi) {
  const superAdmin = await strapi.service('admin::role').getSuperAdmin();
  if (!superAdmin) return;

  const permissionService = strapi.service('admin::permission');
  const existing = await permissionService.findMany({
    where: {
      role: { id: superAdmin.id },
      action: CM_READ,
      subject: UP_ROLE_SUBJECT,
    },
  });
  if (existing.length > 0) return;

  await permissionService.createMany([
    {
      action: CM_READ,
      subject: UP_ROLE_SUBJECT,
      role: superAdmin.id,
      properties: { fields: UP_ROLE_READ_FIELDS },
      conditions: [],
    },
  ]);
}

/** CM-created users often have provider NULL; /auth/local requires "local". */
async function ensureExistingUsersHaveLocalProvider(strapi: Core.Strapi) {
  await strapi.db.query('plugin::users-permissions.user').updateMany({
    where: {
      $or: [{ provider: { $null: true } }, { provider: '' }],
    },
    data: { provider: LOCAL_AUTH_PROVIDER },
  });
}

const UP_AUTH_ACTIONS = [
  'plugin::users-permissions.user.me',
  'plugin::users-permissions.auth.changePassword',
  'plugin::users-permissions.auth.logout',
];

/** App roles (manager, etc.) need user.me — only "authenticated" had it by default. */
async function ensureAuthPermissions(strapi: Core.Strapi, roleId: number) {
  for (const action of UP_AUTH_ACTIONS) {
    await ensurePermission(strapi, roleId, action);
  }
}

const UP_ROLE_READ_ACTIONS = [
  'plugin::users-permissions.role.find',
  'plugin::users-permissions.role.findOne',
];

async function ensureRoleReadPermissions(strapi: Core.Strapi, roleType: string, roleId: number) {
  if (!['admin', 'manager', 'leader'].includes(roleType)) return;
  for (const action of UP_ROLE_READ_ACTIONS) {
    await ensurePermission(strapi, roleId, action);
  }
}

async function ensureUploadPermissions(strapi: Core.Strapi, roleType: string, roleId: number) {
  if (roleType !== 'admin') return;
  for (const action of UPLOAD_CONTENT_API_ACTIONS) {
    await ensurePermission(strapi, roleId, action);
  }
}

async function ensureUserPermissions(strapi: Core.Strapi, roleType: string, roleId: number) {
  const map: Record<string, string[]> = {
    admin: ['find', 'findOne', 'create', 'update', 'destroy', 'count'],
    manager: ['find', 'findOne', 'create', 'update', 'count'],
    leader: ['find', 'findOne', 'create', 'update', 'count'],
    colaborator: [],
  };
  for (const action of map[roleType] ?? []) {
    await ensurePermission(strapi, roleId, `plugin::users-permissions.user.${action}`);
  }
}

async function ensureKioskSettingRecord(strapi: Core.Strapi) {
  const existing = await strapi.documents(KIOSK_SETTING_UID).findFirst();
  if (existing) return;
  await strapi.documents(KIOSK_SETTING_UID).create({
    data: { sessionIdleSeconds: DEFAULT_KIOSK_SESSION_IDLE_SECONDS },
  });
}

async function ensureKioskSettingPermissions(strapi: Core.Strapi) {
  const adminRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'admin' } });
  const kioskRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'kiosk' } });

  if (adminRole) {
    await ensurePermission(
      strapi,
      adminRole.id,
      'api::kiosk-setting.kiosk-setting.find',
    );
    await ensurePermission(
      strapi,
      adminRole.id,
      'api::kiosk-setting.kiosk-setting.update',
    );
  }
  if (kioskRole) {
    await ensurePermission(
      strapi,
      kioskRole.id,
      'api::kiosk-setting.kiosk-setting.find',
    );
  }
}

async function ensureTaskAutomationSettingRecord(strapi: Core.Strapi) {
  const existing = await strapi.documents(TASK_AUTOMATION_SETTING_UID).findFirst();
  if (existing) return;
  await strapi.documents(TASK_AUTOMATION_SETTING_UID).create({ data: {} });
}

async function ensureTaskAutomationSettingPermissions(strapi: Core.Strapi) {
  const adminRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'admin' } });

  if (!adminRole) return;

  await ensurePermission(
    strapi,
    adminRole.id,
    'api::task-automation-setting.task-automation-setting.find',
  );
  await ensurePermission(
    strapi,
    adminRole.id,
    'api::task-automation-setting.task-automation-setting.update',
  );
}

async function ensureDashboardPermissions(strapi: Core.Strapi, roleType: string, roleId: number) {
  if (roleType === 'kiosk') return;

  const actions = [
    'api::dashboard.dashboard.monthlyRanking',
    'api::dashboard.dashboard.listColaborators',
    'api::dashboard.dashboard.colaboratorInsights',
  ];

  for (const action of actions) {
    await ensurePermission(strapi, roleId, action);
  }
}

async function backfillUserRoleTypes(strapi: Core.Strapi) {
  const users = await strapi.db.query('plugin::users-permissions.user').findMany({
    populate: ['role'],
  });

  for (const user of users) {
    const roleType = user.role?.type;
    if (!roleType || user.roleType === roleType) continue;
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: user.id },
      data: { roleType },
    });
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerTaskStepAutomation(strapi.documents);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const roleDef of ROLES) {
      const role = await ensureRole(strapi, roleDef);
      await ensureAuthPermissions(strapi, role.id);
      const map = PERMISSIONS[roleDef.type] ?? {};
      for (const api of Object.keys(map) as ApiName[]) {
        for (const action of map[api] ?? []) {
          await ensurePermission(strapi, role.id, `api::${api}.${api}.${action}`);
        }
      }
      await ensureUserPermissions(strapi, roleDef.type, role.id);
      await ensureUploadPermissions(strapi, roleDef.type, role.id);
      await ensureRoleReadPermissions(strapi, roleDef.type, role.id);
      await ensureDashboardPermissions(strapi, roleDef.type, role.id);
    }
    await ensureSuperAdminCanReadUpRoles(strapi);
    await ensureExistingUsersHaveLocalProvider(strapi);
    await ensureKioskSettingRecord(strapi);
    await ensureKioskSettingPermissions(strapi);
    await ensureTaskAutomationSettingRecord(strapi);
    await ensureTaskAutomationSettingPermissions(strapi);
    await backfillUserRoleTypes(strapi);
    await migrateQueuedStatusToWaiting(strapi.db.connection);
    strapi.log.info('[pixtrela] roles and permissions ensured');
  },
};
