export const DEFAULT_KIOSK_SESSION_IDLE_SECONDS = 7;
export const MIN_KIOSK_SESSION_IDLE_SECONDS = 1;
export const MAX_KIOSK_SESSION_IDLE_SECONDS = 3600;

export function normalizeKioskSessionIdleSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_KIOSK_SESSION_IDLE_SECONDS;
  }
  const rounded = Math.round(value);
  return Math.min(
    MAX_KIOSK_SESSION_IDLE_SECONDS,
    Math.max(MIN_KIOSK_SESSION_IDLE_SECONDS, rounded),
  );
}

export function kioskSessionIdleSecondsToMs(seconds: number): number {
  return normalizeKioskSessionIdleSeconds(seconds) * 1000;
}
