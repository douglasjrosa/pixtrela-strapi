export type SharingType = 'qty' | 'duration';

export type SubTaskStatus = 'finished' | 'waiting';

export interface KioskStopBody {
  completed?: boolean;
  isCompleted?: boolean;
  qty?: number;
}

export interface KioskStopResult {
  qty: number;
  subTaskStatus: SubTaskStatus;
}

export function parseDurationStopBody(body: KioskStopBody): boolean {
  const completed = body.completed ?? body.isCompleted;
  if (typeof completed !== 'boolean') {
    throw new Error('completed required');
  }
  return completed;
}

export function parseQtyStopBody(body: KioskStopBody): number {
  const qty = body.qty;
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
    throw new Error('qty required');
  }
  return qty;
}

export function resolveDurationStop(reportedCompleted: boolean): KioskStopResult {
  return {
    qty: 0,
    subTaskStatus: reportedCompleted ? 'finished' : 'waiting',
  };
}

/** totalCompletedQty sums stoped activity qty from all colaborators. */
export function resolveQtyStop(
  subTaskQty: number,
  totalCompletedQty: number,
  sessionQty: number,
): KioskStopResult {
  const targetQty = Math.max(1, subTaskQty);
  const remaining = targetQty - totalCompletedQty;

  if (sessionQty < 1 || sessionQty > remaining) {
    throw new Error('qty exceeds sub-task quantity');
  }

  const totalCompleted = totalCompletedQty + sessionQty;
  return {
    qty: sessionQty,
    subTaskStatus: totalCompleted >= targetQty ? 'finished' : 'waiting',
  };
}
