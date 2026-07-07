const PRODUCING_STATUS = 'producing';

export function shouldSetTaskStartedAt(
  nextStatus: string,
  currentStartedAt: Date | string | null | undefined,
): boolean {
  if (nextStatus !== PRODUCING_STATUS) return false;
  if (!currentStartedAt) return true;
  if (currentStartedAt instanceof Date) {
    return Number.isNaN(currentStartedAt.getTime());
  }
  return String(currentStartedAt).trim().length === 0;
}
