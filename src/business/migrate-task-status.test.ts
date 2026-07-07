import { describe, expect, it, vi } from 'vitest';

import { migrateQueuedStatusToWaiting } from './migrate-task-status';

describe('migrateQueuedStatusToWaiting', () => {
  it('updates legacy queued rows in tasks and sub_tasks', async () => {
    const tasksUpdate = vi.fn().mockResolvedValue(2);
    const subTasksUpdate = vi.fn().mockResolvedValue(5);
    const knex = (table: string) => ({
      where: () => ({
        update:
          table === 'tasks' ? tasksUpdate : subTasksUpdate,
      }),
    });

    await migrateQueuedStatusToWaiting(knex as never);

    expect(tasksUpdate).toHaveBeenCalledWith({ status: 'waiting' });
    expect(subTasksUpdate).toHaveBeenCalledWith({ status: 'waiting' });
  });
});
