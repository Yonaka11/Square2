// Date helpers for report ranges. Dates are handled in local server time.

/** Return YYYY-MM-DD for a Date. */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** First day of the month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Last day of the month containing `d`. */
export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Build an inclusive ISO timestamp range from YYYY-MM-DD strings.
 * The end date is expanded to the final millisecond of that day.
 */
export function dateRangeBounds(startDate: string, endDate: string): { startIso: string; endIso: string } {
  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T23:59:59.999`);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Default range = current calendar month. */
export function defaultMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return { startDate: toDateString(startOfMonth(now)), endDate: toDateString(endOfMonth(now)) };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayOfWeekName(d: Date): string {
  return DAY_NAMES[d.getDay()];
}
