import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { calculateActivityDurationSeconds } from '../../../business/activity-duration';
import {
  validateKioskAvatarFile,
} from '../../../business/kiosk-avatar';
import {
  mapActiveDirectoryTeams,
  mapDirectoryColaborators,
  type KioskDirectoryColaboratorRow,
  type KioskDirectoryTeamRow,
} from '../../../business/kiosk-directory';
import {
  validateKioskFacePhotoFile,
} from '../../../business/kiosk-face-photo';
import {
  canStaffSetColaboratorPassword,
  filterColaboratorsForStaffRole,
  type KioskColaboratorRow,
  type KioskStaffActorRole,
} from '../../../business/kiosk-staff-colaborators';
import { ACTIVE_TEAM_FILTER, isTeamActive } from '../../../business/team-active';
import {
  assertKioskJwt,
  resolveColaboratorUserId,
} from '../../../business/kiosk-jwt';
import {
  canAuthorizeKioskStop,
  parseDurationStopBody,
  parseQtyStopBody,
  resolveDurationStop,
  resolveQtyStop,
  resolveStopStatusWithPeers,
  type KioskStopBody,
} from '../../../business/kiosk-stop';
import { resolveSubTaskTargetQty } from '../../../business/work-currency';
import {
  filterKioskDailyQueue,
  sortKioskDailyQueue,
} from '../../../business/kiosk-daily-queue';
import {
  buildFinishedAtBySubTaskId,
  buildOpenStartedAtBySubTaskId,
  filterKioskVisibleSubTasks,
  mapSubTaskDbRow,
  SUB_TASK_ASSIGNED_LINK_TABLE,
  SUB_TASK_TASK_LINK_TABLE,
  SUB_TASKS_TABLE,
  TASKS_TABLE,
  USERS_TABLE,
  type KioskSubTaskRow,
} from '../../../business/kiosk-subtasks';
import { readRelationId } from '../../../business/relation-id';
import {
  hasOpenStartedSessionFromActions,
  isSubTaskAtWorkerCapacity,
  listActiveColaboratorIdsFromActivities,
  shouldHideSubTaskFromKioskQueue,
} from '../../../business/subtask-active-workers';
import type { ActivityTimeRow } from '../../../business/task-time-spent';

const ACTIVITY_UID = 'api::activity.activity';
const SUB_TASK_UID = 'api::sub-task.sub-task';
const TEAM_UID = 'api::team.team';
const USER_UID = 'plugin::users-permissions.user';

type StaffActor = {
  id: number;
  documentId: string;
  role: KioskStaffActorRole;
};

/** Shared columns for assigned + orphan open-session kiosk queue rows. */
const KIOSK_QUEUE_SUBTASK_SELECT = [
  'sub_tasks.id',
  'sub_tasks.document_id',
  'sub_tasks.name',
  'sub_tasks.index',
  'sub_tasks.status',
  'sub_tasks.qty',
  'sub_tasks.sharing_type',
  'sub_tasks.time_spent',
  'sub_tasks.expected_time',
  'sub_tasks.activation_status',
  'sub_tasks.max_same_time_workers',
  'tasks.document_id as task_document_id',
  'tasks.name as task_name',
  'tasks.index as task_index',
  'tasks.qty as task_qty',
] as const;

function readDocumentId(row: {
  documentId?: string;
  document_id?: string;
}): string {
  return String(row.documentId ?? row.document_id ?? '');
}

async function fetchActiveColaboratorRows(): Promise<KioskColaboratorRow[]> {
  const knex = strapi.db.connection;
  const rows = (await knex(USERS_TABLE)
    .where({ role_type: 'colaborator' })
    .orderBy('name', 'asc')
    .select('document_id', 'name', 'username', 'code', 'blocked')) as Array<{
    document_id?: string;
    name?: string;
    username?: string;
    code?: number;
    blocked?: boolean | number;
  }>;

  return rows
    .filter((row) => row.blocked !== true && row.blocked !== 1)
    .map((row) => ({
      documentId: String(row.document_id ?? ''),
      name: String(row.name ?? row.username ?? ''),
      code: Number(row.code ?? 0),
    }))
    .filter((row) => row.documentId.length > 0);
}

async function assertStaffCanManageColaborator(
  staffDocumentId: string,
  colaboratorDocumentId: string,
): Promise<{ targetId: number; actor: StaffActor }> {
  const actor = await resolveStaffActor(staffDocumentId);
  if (!actor) throw new Error('forbidden');

  const knex = strapi.db.connection;
  const targetRows = (await knex(USERS_TABLE)
    .where({ document_id: colaboratorDocumentId, role_type: 'colaborator' })
    .select('id', 'blocked')
    .limit(1)) as Array<{ id?: number; blocked?: boolean | number }>;
  const target = targetRows[0];
  if (!target?.id) throw new Error('notFound');
  if (target.blocked === true || target.blocked === 1) {
    throw new Error('forbidden');
  }

  const teamIds =
    actor.role === 'leader'
      ? await fetchLeaderTeamColaboratorDocumentIds(actor.id)
      : new Set<string>();

  if (
    !canStaffSetColaboratorPassword(
      actor.role,
      true,
      teamIds,
      colaboratorDocumentId,
    )
  ) {
    throw new Error('forbidden');
  }

  return { targetId: Number(target.id), actor };
}

async function readColaboratorAvatarUrl(documentId: string): Promise<string | null> {
  const user = await strapi.documents(USER_UID).findOne({
    documentId,
    populate: { avatar: { fields: ['url'] } },
  });
  const avatar = user?.avatar as { url?: string } | null | undefined;
  return avatar?.url ? String(avatar.url) : null;
}

async function readColaboratorFacePhotoUrl(
  documentId: string,
): Promise<string | null> {
  const user = await strapi.documents(USER_UID).findOne({
    documentId,
    populate: { facePhoto: { fields: ['url'] } },
  });
  const facePhoto = user?.facePhoto as { url?: string } | null | undefined;
  return facePhoto?.url ? String(facePhoto.url) : null;
}

async function mapColaboratorsWithMedia(
  colaborators: KioskColaboratorRow[],
): Promise<KioskColaboratorRow[]> {
  return Promise.all(
    colaborators.map(async (colaborator) => ({
      ...colaborator,
      avatarUrl: await readColaboratorAvatarUrl(colaborator.documentId),
      facePhotoUrl: await readColaboratorFacePhotoUrl(colaborator.documentId),
    })),
  );
}

async function fetchLeaderTeamColaboratorDocumentIds(
  leaderUserId: number,
): Promise<Set<string>> {
  const teams = await strapi.db.query(TEAM_UID).findMany({
    where: { leader: leaderUserId },
    populate: { colaborators: true },
  });

  const ids = new Set<string>();
  for (const team of teams) {
    const colaborators = team.colaborators as Array<{
      documentId?: string;
      document_id?: string;
    }> | null;
    for (const colaborator of colaborators ?? []) {
      const documentId = readDocumentId(colaborator);
      if (documentId) ids.add(documentId);
    }
  }
  return ids;
}

async function resolveStaffActor(staffDocumentId: string): Promise<StaffActor | null> {
  const knex = strapi.db.connection;
  const rows = (await knex(USERS_TABLE)
    .where({ document_id: staffDocumentId })
    .select('id', 'document_id', 'role_type', 'blocked')
    .limit(1)) as Array<{
    id?: number;
    document_id?: string;
    role_type?: string;
    blocked?: boolean | number;
  }>;
  const row = rows[0];
  if (!row?.id) return null;
  if (row.blocked === true || row.blocked === 1) return null;

  const role = String(row.role_type ?? '');
  if (role !== 'admin' && role !== 'manager' && role !== 'leader') {
    return null;
  }

  return {
    id: Number(row.id),
    documentId: String(row.document_id ?? staffDocumentId),
    role: role as KioskStaffActorRole,
  };
}

type AssignedSubTaskDbRow = {
  id?: number;
  document_id?: string;
  documentId?: string;
  name?: string;
  index?: number;
  status?: string;
  qty?: number;
  sharing_type?: string;
  sharingType?: string;
  time_spent?: number;
  expected_time?: number;
  activation_status?: string;
  activationStatus?: string;
  max_same_time_workers?: number;
  maxSameTimeWorkers?: number;
  task_document_id?: string;
  task_name?: string;
  task_index?: number;
  task_qty?: number;
};

const PRODUCING_STATUS = 'producing';
const UNLOCKED_ACTIVATION_STATUS = 'unlocked';

async function assertSubTaskAssigned(
  colaboratorUserId: number,
  subTaskDocumentId: string,
): Promise<void> {
  const knex = strapi.db.connection;
  const assigned = await knex(`${SUB_TASK_ASSIGNED_LINK_TABLE} as assignment`)
    .join(`${SUB_TASKS_TABLE} as sub_tasks`, 'sub_tasks.id', 'assignment.sub_task_id')
    .where({
      'assignment.user_id': colaboratorUserId,
      'sub_tasks.document_id': subTaskDocumentId,
    })
    .first();

  if (!assigned) throw new Error('forbidden');
}

export default {
  async listAssignedSubTasks(
    colaboratorDocumentId: string,
  ): Promise<KioskSubTaskRow[]> {
    const knex = strapi.db.connection;
    const [colaborator] = await knex(USERS_TABLE)
      .where({ document_id: colaboratorDocumentId })
      .select('id');

    if (!colaborator?.id) return [];

    const openSessionSubTaskIds =
      await fetchOpenStartedSubTaskIdsForColaborator(Number(colaborator.id));

    const assignedRows = (await knex(`${SUB_TASKS_TABLE} as sub_tasks`)
      .join(
        `${SUB_TASK_ASSIGNED_LINK_TABLE} as assignment`,
        'assignment.sub_task_id',
        'sub_tasks.id',
      )
      .leftJoin(
        `${SUB_TASK_TASK_LINK_TABLE} as task_link`,
        'task_link.sub_task_id',
        'sub_tasks.id',
      )
      .leftJoin(`${TASKS_TABLE} as tasks`, 'tasks.id', 'task_link.task_id')
      .where('assignment.user_id', colaborator.id)
      .orderBy('sub_tasks.index', 'asc')
      .select(...KIOSK_QUEUE_SUBTASK_SELECT)) as AssignedSubTaskDbRow[];

    const assignedIds = new Set(
      assignedRows
        .map((row) => readRelationId(row.id))
        .filter((id): id is number => id !== null),
    );
    const orphanOpenIds = openSessionSubTaskIds.filter(
      (id) => !assignedIds.has(id),
    );

    let orphanRows: AssignedSubTaskDbRow[] = [];
    if (orphanOpenIds.length > 0) {
      orphanRows = (await knex(`${SUB_TASKS_TABLE} as sub_tasks`)
        .leftJoin(
          `${SUB_TASK_TASK_LINK_TABLE} as task_link`,
          'task_link.sub_task_id',
          'sub_tasks.id',
        )
        .leftJoin(`${TASKS_TABLE} as tasks`, 'tasks.id', 'task_link.task_id')
        .whereIn('sub_tasks.id', orphanOpenIds)
        .orderBy('sub_tasks.index', 'asc')
        .select(...KIOSK_QUEUE_SUBTASK_SELECT)) as AssignedSubTaskDbRow[];
    }

    const rows = [...assignedRows, ...orphanRows];

    const subTaskIds = rows
      .map((row) => row.id)
      .filter((id): id is number => typeof id === 'number');

    const producingIds = rows
      .filter((row) => row.status === PRODUCING_STATUS && row.id)
      .map((row) => Number(row.id));

    const [
      startedAtBySubTaskId,
      completedQtyBySubTaskId,
      finishedAtBySubTaskId,
      activeColaboratorIdsBySubTaskId,
    ] = await Promise.all([
      fetchOpenStartedAtBySubTaskId(colaborator.id, producingIds),
      fetchCompletedQtyBySubTaskId(subTaskIds),
      fetchFinishedAtBySubTaskId(subTaskIds),
      fetchActiveColaboratorIdsBySubTaskId(subTaskIds),
    ]);

    const now = new Date();
    const mapped = filterKioskVisibleSubTasks(
      rows
        .filter((row) => {
          if (!row.id) return true;
          const maxSameTimeWorkers = Number(
            row.maxSameTimeWorkers ?? row.max_same_time_workers ?? 1,
          );
          const activeColaboratorIds =
            activeColaboratorIdsBySubTaskId.get(Number(row.id)) ?? [];
          return !shouldHideSubTaskFromKioskQueue({
            maxSameTimeWorkers,
            activeColaboratorIds,
            viewerColaboratorId: Number(colaborator.id),
          });
        })
        .map((row) => {
          const activeColaboratorIds = row.id
            ? activeColaboratorIdsBySubTaskId.get(Number(row.id)) ?? []
            : [];
          return mapSubTaskDbRow(
            row,
            row.id ? startedAtBySubTaskId.get(Number(row.id)) ?? null : null,
            row.id ? completedQtyBySubTaskId.get(Number(row.id)) ?? 0 : 0,
            row.id ? finishedAtBySubTaskId.get(Number(row.id)) ?? null : null,
            activeColaboratorIds.length,
          );
        })
        .filter((row) => row.documentId.length > 0),
    );

    return sortKioskDailyQueue(filterKioskDailyQueue(mapped, now));
  },

  async startSubTask(
    colaboratorDocumentId: string,
    subTaskDocumentId: string,
    kioskJwtUserId: number,
  ): Promise<void> {
    const knex = strapi.db.connection;
    await assertKioskJwt(knex, kioskJwtUserId);
    const colaboratorUserId = await resolveColaboratorUserId(
      knex,
      colaboratorDocumentId,
    );
    await assertSubTaskAssigned(colaboratorUserId, subTaskDocumentId);

    const subTask = await strapi.db.query(SUB_TASK_UID).findOne({
      where: { documentId: subTaskDocumentId },
    });
    if (!subTask) throw new Error('notFound');

    const status = String(subTask.status ?? '');
    if (status !== 'waiting' && status !== PRODUCING_STATUS) {
      throw new Error('forbidden');
    }

    const activation = String(
      subTask.activationStatus ??
        (subTask as { activation_status?: string }).activation_status ??
        'locked',
    );
    if (activation === 'disabled') {
      throw new Error('forbidden');
    }
    // Waiting tasks must be unlocked (deps). Producing tasks may still be
    // joinable when capacity remains even if activation lags as locked.
    if (activation !== UNLOCKED_ACTIVATION_STATUS && status !== PRODUCING_STATUS) {
      throw new Error('forbidden');
    }

    const activeIds = await fetchActiveColaboratorIdsForSubTask(Number(subTask.id));
    if (activeIds.some((id) => Number(id) === Number(colaboratorUserId))) {
      throw new Error('forbidden');
    }
    const maxSameTimeWorkers = Number(
      subTask.maxSameTimeWorkers ??
        (subTask as { max_same_time_workers?: number }).max_same_time_workers ??
        1,
    );
    if (isSubTaskAtWorkerCapacity(maxSameTimeWorkers, activeIds.length)) {
      throw new Error('forbidden');
    }

    await strapi.db.query(ACTIVITY_UID).create({
      data: {
        subTask: subTask.id,
        colaborator: colaboratorUserId,
        action: 'started',
        timestamp: new Date(),
      },
    });

    // Always update so sub-task lifecycles re-run capacity / parent status sync.
    await strapi.documents(SUB_TASK_UID).update({
      documentId: subTaskDocumentId,
      data: { status: PRODUCING_STATUS },
    });
  },

  async stopSubTask(
    colaboratorDocumentId: string,
    subTaskDocumentId: string,
    kioskJwtUserId: number,
    body: KioskStopBody = {},
  ): Promise<{ remainingWorkerNames: string[] }> {
    const knex = strapi.db.connection;
    await assertKioskJwt(knex, kioskJwtUserId);
    const colaboratorUserId = await resolveColaboratorUserId(
      knex,
      colaboratorDocumentId,
    );
    // Assignment is only required to join. After start, stop is allowed while
    // the colaborator still has an open started session — even if unassigned.

    const subTask = await strapi.db.query(SUB_TASK_UID).findOne({
      where: { documentId: subTaskDocumentId },
      populate: { task: { select: ['id', 'qty'] } },
    });
    if (!subTask) throw new Error('notFound');

    const subTaskId = Number(subTask.id);
    const sessionActivities = await strapi.db.query(ACTIVITY_UID).findMany({
      where: {
        subTask: subTaskId,
        colaborator: colaboratorUserId,
        action: { $in: ['started', 'stoped'] },
      },
      orderBy: { timestamp: 'asc' },
    });
    const sessionActions = sessionActivities
      .map((activity) => activity.action)
      .filter(
        (action): action is 'started' | 'stoped' =>
          action === 'started' || action === 'stoped',
      );
    if (!canAuthorizeKioskStop(hasOpenStartedSessionFromActions(sessionActions))) {
      throw new Error('forbidden');
    }

    const activeIdsBefore = await fetchActiveColaboratorIdsForSubTask(subTaskId);
    const endedAt = new Date();
    const openStarted = [...sessionActivities]
      .reverse()
      .find((activity) => activity.action === 'started');

    const sessionSeconds =
      openStarted?.timestamp instanceof Date
        ? calculateActivityDurationSeconds(openStarted.timestamp, endedAt)
        : openStarted?.timestamp
          ? calculateActivityDurationSeconds(
              new Date(openStarted.timestamp),
              endedAt,
            )
          : 0;

    const sharingType =
      subTask.sharingType === 'qty' ? 'qty' : ('duration' as const);
    const taskQty = Number(
      (subTask.task as { qty?: number } | null)?.qty ?? 1,
    );

    const baseStopResult =
      sharingType === 'qty'
        ? resolveQtyStop(
            resolveSubTaskTargetQty(Number(subTask.qty ?? 1), taskQty),
            await sumStoppedQty(subTask.id),
            parseQtyStopBody(body),
          )
        : resolveDurationStop(parseDurationStopBody(body));

    const remainingActiveIds = activeIdsBefore.filter(
      (id) => Number(id) !== Number(colaboratorUserId),
    );
    const stopResult = resolveStopStatusWithPeers(
      baseStopResult,
      remainingActiveIds.length,
    );

    await strapi.documents(SUB_TASK_UID).update({
      documentId: subTaskDocumentId,
      data: {
        status: stopResult.subTaskStatus,
        timeSpent: Number(subTask.timeSpent ?? 0) + sessionSeconds,
      },
    });

    await strapi.db.query(ACTIVITY_UID).create({
      data: {
        subTask: subTask.id,
        colaborator: colaboratorUserId,
        action: 'stoped',
        timestamp: endedAt,
        qty: stopResult.qty,
      },
    });

    const remainingWorkerNames =
      remainingActiveIds.length > 0
        ? await fetchUserNamesByIds(remainingActiveIds)
        : [];

    return { remainingWorkerNames };
  },

  async listStaffColaborators(
    staffDocumentId: string,
  ): Promise<KioskColaboratorRow[]> {
    const actor = await resolveStaffActor(staffDocumentId);
    if (!actor) return [];

    const colaborators = await fetchActiveColaboratorRows();
    const teamIds =
      actor.role === 'leader'
        ? await fetchLeaderTeamColaboratorDocumentIds(actor.id)
        : new Set<string>();

    return mapColaboratorsWithMedia(
      filterColaboratorsForStaffRole(actor.role, colaborators, teamIds),
    );
  },

  async setColaboratorPassword(
    staffDocumentId: string,
    colaboratorDocumentId: string,
    password: string,
  ): Promise<void> {
    const { targetId } = await assertStaffCanManageColaborator(
      staffDocumentId,
      colaboratorDocumentId,
    );

    const userService = strapi.plugin('users-permissions').service('user');
    await userService.edit(targetId, { password });
  },

  async setColaboratorAvatar(
    staffDocumentId: string,
    colaboratorDocumentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ avatarUrl: string | null }> {
    await assertStaffCanManageColaborator(staffDocumentId, colaboratorDocumentId);

    const validation = validateKioskAvatarFile(
      fileBuffer,
      mimeType,
      fileBuffer.length,
    );
    if (validation.ok === false) {
      throw new Error(validation.error);
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiosk-avatar-'));
    const safeName =
      fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'avatar.jpg';
    const tmpPath = path.join(tmpDir, safeName);

    let uploaded: unknown;
    try {
      await fs.writeFile(tmpPath, fileBuffer);
      uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: fileName,
            alternativeText: 'Colaborator profile photo',
          },
        },
        files: {
          filepath: tmpPath,
          originalFilename: fileName,
          mimetype: mimeType,
          size: fileBuffer.length,
        },
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'uploadException';
      throw new Error(`uploadFailed:${message}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    const fileId = (file as { id?: number } | null)?.id;
    if (!fileId) throw new Error('uploadFailed');

    await strapi.documents(USER_UID).update({
      documentId: colaboratorDocumentId,
      data: { avatar: fileId },
    });

    const fileUrl = (file as { url?: string } | null)?.url;
    const avatarUrl = fileUrl
      ? String(fileUrl)
      : await readColaboratorAvatarUrl(colaboratorDocumentId);
    return { avatarUrl };
  },

  async setColaboratorFacePhoto(
    staffDocumentId: string,
    colaboratorDocumentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{ facePhotoUrl: string | null }> {
    await assertStaffCanManageColaborator(staffDocumentId, colaboratorDocumentId);

    const validation = validateKioskFacePhotoFile(
      fileBuffer,
      mimeType,
      fileBuffer.length,
    );
    if (validation.ok === false) {
      throw new Error(validation.error);
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kiosk-face-'));
    const safeName =
      fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'face-photo.jpg';
    const tmpPath = path.join(tmpDir, safeName);

    let uploaded: unknown;
    try {
      await fs.writeFile(tmpPath, fileBuffer);
      uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: fileName,
            alternativeText: 'Colaborator face recognition photo',
          },
        },
        files: {
          filepath: tmpPath,
          originalFilename: fileName,
          mimetype: mimeType,
          size: fileBuffer.length,
        },
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : 'uploadException';
      throw new Error(`uploadFailed:${message}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    const fileId = (file as { id?: number } | null)?.id;
    if (!fileId) throw new Error('uploadFailed');

    await strapi.documents(USER_UID).update({
      documentId: colaboratorDocumentId,
      data: { facePhoto: fileId },
    });

    const fileUrl = (file as { url?: string } | null)?.url;
    const facePhotoUrl = fileUrl
      ? String(fileUrl)
      : await readColaboratorFacePhotoUrl(colaboratorDocumentId);
    return { facePhotoUrl };
  },

  async listDirectoryTeams(): Promise<KioskDirectoryTeamRow[]> {
    const teams = await strapi.documents(TEAM_UID).findMany({
      filters: ACTIVE_TEAM_FILTER,
      fields: ['name', 'untill'],
      sort: ['name:asc'],
    });

    return mapActiveDirectoryTeams(
      (teams ?? []) as Array<{
        documentId?: string;
        name?: string;
        untill?: string | Date | null;
      }>,
    );
  },

  async listDirectoryTeamColaborators(
    teamDocumentId: string,
  ): Promise<KioskDirectoryColaboratorRow[]> {
    const team = await strapi.documents(TEAM_UID).findOne({
      documentId: teamDocumentId,
      fields: ['name', 'untill'],
      populate: {
        colaborators: {
          fields: ['name', 'username', 'roleType', 'blocked'],
          populate: { facePhoto: { fields: ['url'] } },
        },
      },
    });

    if (!team) throw new Error('notFound');

    const untill = (team as { untill?: string | Date | null }).untill;
    if (!isTeamActive(untill)) {
      throw new Error('notFound');
    }

    const colaborators =
      (team as { colaborators?: unknown }).colaborators ?? [];

    return mapDirectoryColaborators(
      (Array.isArray(colaborators) ? colaborators : []) as Array<{
        documentId?: string;
        name?: string;
        username?: string;
        roleType?: string;
        blocked?: boolean | number;
        facePhoto?: { url?: string } | null;
      }>,
    );
  },

  async getStaffUserByDocumentId(
    documentId: string,
  ): Promise<{ documentId: string; role: string } | null> {
    const knex = strapi.db.connection;
    const rows = (await knex(USERS_TABLE)
      .where({ document_id: documentId })
      .select('document_id', 'role_type', 'blocked')
      .limit(1)) as Array<{
      document_id?: string;
      role_type?: string;
      blocked?: boolean | number;
    }>;
    const row = rows[0];
    if (!row) return null;
    if (row.blocked === true || row.blocked === 1) return null;

    const role = String(row.role_type ?? '');
    if (role !== 'admin' && role !== 'manager' && role !== 'leader') {
      return null;
    }

    return {
      documentId: String(row.document_id ?? documentId),
      role,
    };
  },
};

async function sumStoppedQty(subTaskId: number): Promise<number> {
  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      subTask: subTaskId,
      action: 'stoped',
    },
  });

  return activities.reduce(
    (total, activity) => total + Number(activity.qty ?? 0),
    0,
  );
}

async function fetchCompletedQtyBySubTaskId(
  subTaskIds: number[],
): Promise<Map<number, number>> {
  if (subTaskIds.length === 0) return new Map();

  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      action: 'stoped',
      subTask: { id: { $in: subTaskIds } },
    },
    populate: { subTask: { select: ['id'] } },
  });

  const map = new Map<number, number>();
  for (const activity of activities) {
    const subTask = activity.subTask as { id?: number } | null;
    if (!subTask?.id) continue;
    map.set(subTask.id, (map.get(subTask.id) ?? 0) + Number(activity.qty ?? 0));
  }
  return map;
}

async function fetchFinishedAtBySubTaskId(
  subTaskIds: number[],
): Promise<Map<number, string>> {
  if (subTaskIds.length === 0) return new Map();

  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      action: 'stoped',
      subTask: { id: { $in: subTaskIds } },
    },
    populate: { subTask: { select: ['id'] } },
  });

  const refs = activities
    .map((activity) => {
      const subTask = activity.subTask as { id?: number } | null;
      const timestamp = activity.timestamp;
      if (!subTask?.id || !timestamp) return null;
      const iso =
        timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
      return { subTaskId: subTask.id, timestamp: iso };
    })
    .filter(
      (ref): ref is { subTaskId: number; timestamp: string } => ref !== null,
    );

  return buildFinishedAtBySubTaskId(refs);
}

async function fetchActiveColaboratorIdsForSubTask(
  subTaskId: number,
): Promise<number[]> {
  const map = await fetchActiveColaboratorIdsBySubTaskId([subTaskId]);
  return map.get(subTaskId) ?? [];
}

async function fetchUserNamesByIds(userIds: number[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const knex = strapi.db.connection;
  const rows = (await knex(USERS_TABLE)
    .whereIn('id', userIds)
    .select('id', 'name', 'username')) as Array<{
    id?: number;
    name?: string;
    username?: string;
  }>;
  const byId = new Map(
    rows.map((row) => [
      Number(row.id),
      String(row.name ?? row.username ?? '').trim(),
    ]),
  );
  return userIds
    .map((id) => byId.get(id) ?? '')
    .filter((name) => name.length > 0);
}

async function fetchActiveColaboratorIdsBySubTaskId(
  subTaskIds: number[],
): Promise<Map<number, number[]>> {
  if (subTaskIds.length === 0) return new Map();

  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      subTask: { id: { $in: subTaskIds } },
      action: { $in: ['started', 'stoped'] },
    },
    orderBy: { timestamp: 'asc' },
    populate: {
      colaborator: { select: ['id'] },
      subTask: { select: ['id'] },
    },
  });

  const bySubTask = new Map<number, ActivityTimeRow[]>();

  for (const activity of activities) {
    const subTaskId = readRelationId(activity.subTask);
    const colaboratorId = readRelationId(activity.colaborator);
    const timestamp = activity.timestamp;
    if (subTaskId === null || colaboratorId === null || !timestamp) continue;
    if (activity.action !== 'started' && activity.action !== 'stoped') continue;

    const rows = bySubTask.get(subTaskId) ?? [];
    rows.push({
      action: activity.action,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      colaboratorId,
    });
    bySubTask.set(subTaskId, rows);
  }

  const result = new Map<number, number[]>();
  for (const [subTaskId, rows] of bySubTask.entries()) {
    result.set(subTaskId, listActiveColaboratorIdsFromActivities(rows));
  }
  return result;
}

async function fetchOpenStartedSubTaskIdsForColaborator(
  colaboratorUserId: number,
): Promise<number[]> {
  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      colaborator: colaboratorUserId,
      action: { $in: ['started', 'stoped'] },
    },
    orderBy: { timestamp: 'asc' },
    populate: { subTask: { select: ['id'] } },
  });

  const openBySubTask = new Map<number, boolean>();
  for (const activity of activities) {
    const subTaskId = readRelationId(activity.subTask);
    if (subTaskId === null) continue;
    if (activity.action === 'started') {
      openBySubTask.set(subTaskId, true);
      continue;
    }
    if (activity.action === 'stoped') {
      openBySubTask.set(subTaskId, false);
    }
  }

  return [...openBySubTask.entries()]
    .filter(([, isOpen]) => isOpen)
    .map(([subTaskId]) => subTaskId);
}

async function fetchOpenStartedAtBySubTaskId(
  colaboratorUserId: number,
  subTaskIds: number[],
): Promise<Map<number, string>> {
  if (subTaskIds.length === 0) return new Map();

  const activities = await strapi.db.query(ACTIVITY_UID).findMany({
    where: {
      colaborator: colaboratorUserId,
      action: { $in: ['started', 'stoped'] },
      subTask: { id: { $in: subTaskIds } },
    },
    orderBy: { timestamp: 'asc' },
    populate: { subTask: { select: ['id'] } },
  });

  const refs = activities
    .map((activity) => {
      const subTaskId = readRelationId(activity.subTask);
      const timestamp = activity.timestamp;
      if (subTaskId === null || !timestamp) return null;
      if (activity.action !== 'started' && activity.action !== 'stoped') {
        return null;
      }
      const iso =
        timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
      return {
        subTaskId,
        action: activity.action as 'started' | 'stoped',
        timestamp: iso,
      };
    })
    .filter(
      (
        ref,
      ): ref is {
        subTaskId: number;
        action: 'started' | 'stoped';
        timestamp: string;
      } => ref !== null,
    );

  return buildOpenStartedAtBySubTaskId(refs);
}
