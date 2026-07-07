export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Calendar date key (YYYY-MM-DD) in the given IANA time zone. */
export function toCalendarDateKey(
  date: Date,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isSameCalendarDay(
  left: Date,
  right: Date,
  timeZone = DEFAULT_TIME_ZONE,
): boolean {
  return toCalendarDateKey(left, timeZone) === toCalendarDateKey(right, timeZone);
}
