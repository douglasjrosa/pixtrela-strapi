type KnexLike = {
  (table: string): {
    where: (filter: Record<string, unknown>) => {
      update: (data: Record<string, unknown>) => Promise<number>;
    };
  };
};

const LEGACY_QUEUED_STATUS = 'queued';
const WAITING_STATUS = 'waiting';

/** Renames legacy task/sub-task status values after enum migration. */
export async function migrateQueuedStatusToWaiting(knex: KnexLike): Promise<void> {
  await knex('tasks')
    .where({ status: LEGACY_QUEUED_STATUS })
    .update({ status: WAITING_STATUS });
  await knex('sub_tasks')
    .where({ status: LEGACY_QUEUED_STATUS })
    .update({ status: WAITING_STATUS });
}
