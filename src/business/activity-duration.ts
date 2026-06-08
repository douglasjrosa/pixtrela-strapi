const MS_PER_SECOND = 1000;

export function calculateActivityDurationSeconds(
  startedAt: Date,
  endedAt: Date,
): number {
  const diffMs = endedAt.getTime() - startedAt.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / MS_PER_SECOND);
}
