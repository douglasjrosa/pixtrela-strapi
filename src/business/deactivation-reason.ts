export const DEACTIVATION_REASON_MIN_LENGTH = 100;

export function isDeactivationReasonValid(reason: unknown): boolean {
  if (typeof reason !== "string") return false;
  return reason.trim().length >= DEACTIVATION_REASON_MIN_LENGTH;
}

/** Throws when a deactivation/disabling update lacks a valid reason. */
export function assertReasonWhenDeactivating(
  isDeactivating: boolean,
  reason: unknown,
): void {
  if (!isDeactivating) return;
  if (isDeactivationReasonValid(reason)) return;
  throw new Error("invalidDeactivationReason");
}
