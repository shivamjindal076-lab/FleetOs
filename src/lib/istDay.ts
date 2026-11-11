// Days in India Standard Time (UTC+5:30, no daylight saving). The fleet works in IST, so
// "today" and "this month" must not depend on the viewer's device clock or on UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The IST calendar date (YYYY-MM-DD) of a moment. */
export function istDateString(moment: Date | string | number): string {
  return new Date(new Date(moment).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The first instant of an IST date. */
export function istDayStart(date: string): Date {
  if (!DATE_RE.test(date)) throw new Error(`Not a date: ${date}`);
  return new Date(`${date}T00:00:00+05:30`);
}

/** Add whole days to an IST date string. */
export function addIstDays(date: string, days: number): string {
  return istDateString(istDayStart(date).getTime() + days * DAY_MS);
}

/**
 * The UTC instants covering IST days from startDate to endDate, both included.
 * `endISO` is exclusive: query with gte(startISO) and lt(endISO).
 */
export function istDayRange(startDate: string, endDate: string = startDate): { startISO: string; endISO: string } {
  return {
    startISO: istDayStart(startDate).toISOString(),
    endISO: new Date(istDayStart(endDate).getTime() + DAY_MS).toISOString(),
  };
}

/** First day of the IST month holding a date (YYYY-MM-01). */
export function istMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export interface MoneyDayFields {
  payment_confirmed_at?: string | null;
  trip_completed_at?: string | null;
  scheduled_at?: string | null;
}

/**
 * The moment a booking counts for in collections: when it was paid, else when the trip was
 * completed, else when it was scheduled (still unpaid and not done).
 */
export function collectionMoment(b: MoneyDayFields): string | null {
  return b.payment_confirmed_at ?? b.trip_completed_at ?? b.scheduled_at ?? null;
}

/** The IST date a booking counts for in collections. */
export function collectionDay(b: MoneyDayFields): string | null {
  const moment = collectionMoment(b);
  return moment ? istDateString(moment) : null;
}

/**
 * PostgREST `or` filter selecting bookings that count in [startISO, endISO):
 * paid in the window; else completed in the window; else not paid, not completed and
 * scheduled in the window. endISO may be omitted for "from startISO onwards".
 */
export function collectionsOrFilter(startISO: string, endISO?: string): string {
  const win = (col: string) => (endISO ? `${col}.gte.${startISO},${col}.lt.${endISO}` : `${col}.gte.${startISO}`);
  return [
    `and(${win('payment_confirmed_at')})`,
    `and(payment_confirmed_at.is.null,${win('trip_completed_at')})`,
    `and(payment_confirmed_at.is.null,trip_completed_at.is.null,${win('scheduled_at')})`,
  ].join(',');
}
