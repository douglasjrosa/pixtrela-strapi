import { factories } from '@strapi/strapi';

import {
  calculateTotalExpectedTime,
  collectSubTaskExpectedTimes,
} from '../../../business/task-expected-time';
import {
  calculateTaskTotalTimeSpent,
  type ActivityTimeRow,
  type SubTaskTimeSpentInput,
} from '../../../business/task-time-spent';

const TASK_UID = 'api::task.task';
const SUB_TASK_UID = 'api::sub-task.sub-task';
const ACTIVITY_UID = 'api::activity.activity';

export type TaskService = {
  syncTotalExpectedTime: (taskDocumentId: string) => Promise<void>;
  computeTotalTimeSpent: (taskDocumentId: string, now?: Date) => Promise<number>;
  syncTotalTimeSpent: (taskDocumentId: string) => Promise<void>;
};

function toActivityRows(
  activities: {
    action?: string;
    timestamp?: Date | string;
    colaborator?: { id?: number } | null;
    subTask?: { id?: number } | null;
  }[],
): Map<number, ActivityTimeRow[]> {
  const bySubTask = new Map<number, ActivityTimeRow[]>();

  for (const activity of activities) {
    const subTaskId = activity.subTask?.id;
    const colaboratorId = activity.colaborator?.id;
    const timestamp = activity.timestamp;
    if (!subTaskId || !colaboratorId || !timestamp) continue;
    if (activity.action !== 'started' && activity.action !== 'stoped') continue;

    const rows = bySubTask.get(subTaskId) ?? [];
    rows.push({
      action: activity.action,
      timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
      colaboratorId,
    });
    bySubTask.set(subTaskId, rows);
  }

  return bySubTask;
}

export default factories.createCoreService(TASK_UID, ({ strapi }) => {
  async function computeTotalTimeSpent(
    taskDocumentId: string,
    now = new Date(),
  ): Promise<number> {
    const task = await strapi.db.query(TASK_UID).findOne({
      where: { documentId: taskDocumentId },
    });
    if (!task?.id) return 0;

    const subTasks = await strapi.db.query(SUB_TASK_UID).findMany({
      where: { task: task.id },
      select: ['id', 'timeSpent', 'status'],
    });

    if (subTasks.length === 0) return 0;

    const subTaskIds = subTasks
      .map((subTask) => subTask.id)
      .filter((id): id is number => typeof id === 'number');

    const activities = await strapi.db.query(ACTIVITY_UID).findMany({
      where: { subTask: { id: { $in: subTaskIds } } },
      orderBy: { timestamp: 'asc' },
      populate: {
        colaborator: { select: ['id'] },
        subTask: { select: ['id'] },
      },
    });

    const activitiesBySubTask = toActivityRows(activities);
    const inputs: SubTaskTimeSpentInput[] = subTasks.map((subTask) => ({
      timeSpent: Number(subTask.timeSpent ?? 0),
      status: String(subTask.status ?? 'waiting'),
      activities: activitiesBySubTask.get(Number(subTask.id)) ?? [],
    }));

    return calculateTaskTotalTimeSpent(inputs, now);
  }

  return {
    async syncTotalExpectedTime(taskDocumentId: string): Promise<void> {
      const task = await strapi.documents(TASK_UID).findOne({
        documentId: taskDocumentId,
        fields: ['qty'],
      });
      if (!task) return;

      const subTasks = await strapi.documents(SUB_TASK_UID).findMany({
        filters: { task: { documentId: taskDocumentId } },
        fields: ['expectedTime', 'activationStatus'],
      });

      const totalExpectedTime = calculateTotalExpectedTime(
        collectSubTaskExpectedTimes(subTasks),
        Number(task.qty ?? 1),
      );

      // afterUpdate guards against computed-only updates, preventing the
      // sync -> update -> afterUpdate -> sync recursion.
      await strapi.db.query(TASK_UID).update({
        where: { documentId: taskDocumentId },
        data: { totalExpectedTime },
      });
    },

    computeTotalTimeSpent,

    async syncTotalTimeSpent(taskDocumentId: string): Promise<void> {
      const totalTimeSpent = await computeTotalTimeSpent(taskDocumentId);

      // afterUpdate guards against computed-only updates (see syncTotalExpectedTime).
      await strapi.db.query(TASK_UID).update({
        where: { documentId: taskDocumentId },
        data: { totalTimeSpent },
      });
    },
  };
});
