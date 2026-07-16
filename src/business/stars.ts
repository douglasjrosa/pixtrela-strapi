/**
 * Pure Stars (currency) rules for SubTask completion.
 * Unit-tested without booting Strapi.
 */

export interface StarsCurrency {
  currencyPerSecond: number;
}

export type StarsSharingType = 'qty' | 'duration';

export interface StarsSubTaskContext {
  expectedTime: number;
  qty: number;
  taskQty: number;
  sharingType: StarsSharingType;
}

export interface QtyStarsSession {
  sessionQty: number;
}

export interface DurationParticipation {
  colaboratorId: number;
  timeSpentSeconds: number;
}

export interface StarsCredit {
  colaboratorId: number;
  stars: number;
}

/**
 * Scales a template/form expectedTime (total for subTask.qty on one task unit)
 * by the production task quantity.
 */
export function scaleExpectedTimeByTaskQty(
  baseExpectedTime: number,
  taskQty: number,
): number {
  const base = Math.max(0, Number(baseExpectedTime) || 0);
  const qty = Math.max(1, Math.floor(Number(taskQty) || 0) || 1);
  return base * qty;
}

/**
 * When task.qty changes, rescale already-stored sub-task expectedTime values.
 */
export function rescaleExpectedTimeForTaskQtyChange(
  currentExpectedTime: number,
  previousTaskQty: number,
  nextTaskQty: number,
): number {
  const previousQty = Math.max(1, Math.floor(Number(previousTaskQty) || 0) || 1);
  const nextQty = Math.max(1, Math.floor(Number(nextTaskQty) || 0) || 1);
  const current = Math.max(0, Number(currentExpectedTime) || 0);
  if (previousQty === nextQty) return current;
  return Math.round((current / previousQty) * nextQty);
}

/**
 * Total pieces required to finish a qty-shared sub-task for the whole task.
 */
export function resolveSubTaskTargetQty(
  subTaskQty: number,
  taskQty: number,
): number {
  const pieces = Math.max(1, Math.floor(Number(subTaskQty) || 0) || 1);
  const tasks = Math.max(1, Math.floor(Number(taskQty) || 0) || 1);
  return pieces * tasks;
}

/**
 * Estimated seconds paid per produced piece (qty sharing).
 * stored expectedTime already includes task.qty scaling.
 */
export function resolveSecondsPerPiece(
  expectedTime: number,
  subTaskQty: number,
  taskQty: number,
): number {
  const targetQty = resolveSubTaskTargetQty(subTaskQty, taskQty);
  const expected = Math.max(0, Number(expectedTime) || 0);
  if (targetQty <= 0) return 0;
  return expected / targetQty;
}

/**
 * Stars for one qty stop session (pieces reported on exit).
 */
export function calculateQtySessionStars(
  context: StarsSubTaskContext,
  session: QtyStarsSession,
  currency: StarsCurrency,
): number {
  const rate = Math.max(0, currency.currencyPerSecond ?? 0);
  const pieces = Math.max(0, Math.floor(Number(session.sessionQty) || 0));
  if (rate <= 0 || pieces <= 0) return 0;
  if (context.sharingType !== 'qty') return 0;

  const secondsPerPiece = resolveSecondsPerPiece(
    context.expectedTime,
    context.qty,
    context.taskQty,
  );
  return pieces * secondsPerPiece * rate;
}

/**
 * Distributes expectedTime × rate across colaborators by time-spent share.
 * Uses Math.ceil per share (may sum slightly above the pool).
 */
export function calculateDurationStarsCredits(
  context: StarsSubTaskContext,
  participations: DurationParticipation[],
  currency: StarsCurrency,
): StarsCredit[] {
  const rate = Math.max(0, currency.currencyPerSecond ?? 0);
  const poolSeconds = Math.max(0, Number(context.expectedTime) || 0);
  if (context.sharingType !== 'duration' || rate <= 0 || poolSeconds <= 0) {
    return [];
  }

  const cleaned = participations
    .map((row) => ({
      colaboratorId: row.colaboratorId,
      timeSpentSeconds: Math.max(0, Number(row.timeSpentSeconds) || 0),
    }))
    .filter((row) => row.timeSpentSeconds > 0);

  const totalSpent = cleaned.reduce(
    (sum, row) => sum + row.timeSpentSeconds,
    0,
  );
  if (totalSpent <= 0) return [];

  const poolStars = poolSeconds * rate;

  return cleaned.map((row) => ({
    colaboratorId: row.colaboratorId,
    stars: Math.ceil((row.timeSpentSeconds / totalSpent) * poolStars),
  }));
}

/** @deprecated Prefer calculateQtySessionStars / calculateDurationStarsCredits. */
export function calculateStars(
  subTask: { expectedTime: number },
  currency: StarsCurrency,
): number {
  const seconds = Math.max(0, subTask.expectedTime ?? 0);
  const rate = Math.max(0, currency.currencyPerSecond ?? 0);
  return seconds * rate;
}

export interface CompletingActivity {
  action: 'started' | 'stoped';
  subTaskStatus: string;
}

/**
 * Duration-mode pool credits when the finishing stop lands.
 * Qty-mode credits on every stop with pieces (handled separately).
 */
export function shouldCreditDurationStars(activity: CompletingActivity): boolean {
  return activity.action === 'stoped' && activity.subTaskStatus === 'finished';
}

/** @deprecated Use shouldCreditDurationStars for duration finishes. */
export function shouldCreditStars(activity: CompletingActivity): boolean {
  return shouldCreditDurationStars(activity);
}
