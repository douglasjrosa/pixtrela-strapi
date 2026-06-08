/**
 * Pure, framework-agnostic Stars (currency) rules.
 * Unit-tested without booting Strapi.
 */

export interface StarsSubTask {
  expectedTime: number;
}

export interface StarsCurrency {
  currencyPerSecond: number;
}

export interface CompletingActivity {
  action: 'started' | 'stoped';
  subTaskStatus: string;
}

/**
 * Stars earned for a subtask = expectedTime (seconds) * currencyPerSecond.
 */
export function calculateStars(subTask: StarsSubTask, currency: StarsCurrency): number {
  const seconds = Math.max(0, subTask.expectedTime ?? 0);
  const rate = Math.max(0, currency.currencyPerSecond ?? 0);
  return seconds * rate;
}

/**
 * Stars are credited when a stop activity is recorded and the sub-task is finished.
 */
export function shouldCreditStars(activity: CompletingActivity): boolean {
  return activity.action === 'stoped' && activity.subTaskStatus === 'finished';
}
