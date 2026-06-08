import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';

import type { TaskService } from '../services/task';

const TASK_UID = 'api::task.task';

async function applyLiveTotalTimeSpent(
  strapi: Core.Strapi,
  tasks: { documentId?: string; totalTimeSpent?: number }[],
): Promise<void> {
  const now = new Date();
  const service = strapi.service(TASK_UID) as TaskService;

  await Promise.all(
    tasks.map(async (task) => {
      if (!task.documentId) return;
      task.totalTimeSpent = await service.computeTotalTimeSpent(task.documentId, now);
    }),
  );
}

export default factories.createCoreController(TASK_UID, ({ strapi }) => ({
  async find(ctx) {
    const response = await super.find(ctx);
    const tasks = Array.isArray(response?.data) ? response.data : [];
    await applyLiveTotalTimeSpent(strapi, tasks);
    return response;
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    const task = response?.data;
    if (task) {
      await applyLiveTotalTimeSpent(strapi, [task]);
    }
    return response;
  },
}));
