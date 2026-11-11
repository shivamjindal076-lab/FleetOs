import { addIstDays, istDateString } from './istDay';

export interface RideLike {
  id: number;
  status?: string | null;
  trip_completed_at?: string | null;
  payment_confirmed_at?: string | null;
  scheduled_at?: string | null;
}

/** When a completed ride was done (falls back to payment, then schedule, for old rows). */
export function rideDoneAt<T extends RideLike>(r: T): string | null {
  return r.trip_completed_at ?? r.payment_confirmed_at ?? r.scheduled_at ?? null;
}

/** Completed rides only, newest first. */
export function completedNewestFirst<T extends RideLike>(rides: T[]): T[] {
  return rides
    .filter(r => r.status === 'completed')
    .sort((a, b) => (rideDoneAt(b) ?? '').localeCompare(rideDoneAt(a) ?? ''));
}

export interface RideCounts {
  today: number;
  week: number;
  month: number;
  total: number;
}

/** Completed rides today, in the last 7 days (today included), this calendar month, and in all. */
export function countCompleted(rides: RideLike[], now: Date = new Date()): RideCounts {
  const today = istDateString(now);
  const weekStart = addIstDays(today, -6);
  const month = today.slice(0, 7);
  const counts: RideCounts = { today: 0, week: 0, month: 0, total: 0 };
  for (const r of rides) {
    if (r.status && r.status !== 'completed') continue;
    counts.total += 1;
    const at = rideDoneAt(r);
    if (!at) continue;
    const day = istDateString(at);
    if (day === today) counts.today += 1;
    if (day >= weekStart && day <= today) counts.week += 1;
    if (day.startsWith(month)) counts.month += 1;
  }
  return counts;
}

/** Counts for each driver id. */
export function countCompletedByDriver<T extends RideLike & { driver_id: number | null }>(
  rides: T[],
  now: Date = new Date(),
): Map<number, RideCounts> {
  const groups = new Map<number, T[]>();
  for (const r of rides) {
    if (r.driver_id == null) continue;
    const list = groups.get(r.driver_id);
    if (list) list.push(r); else groups.set(r.driver_id, [r]);
  }
  const out = new Map<number, RideCounts>();
  groups.forEach((list, id) => out.set(id, countCompleted(list, now)));
  return out;
}

/** Money collected today, this week and this month, by the day it was paid (IST). */
export function collectedTotals(
  rides: (RideLike & { amount_collected?: number | null; fare?: number | null })[],
  now: Date = new Date(),
) {
  const today = istDateString(now);
  const weekStart = addIstDays(today, -6);
  const month = today.slice(0, 7);
  const totals = { today: 0, week: 0, month: 0 };
  for (const r of rides) {
    if (!r.payment_confirmed_at) continue;
    const day = istDateString(r.payment_confirmed_at);
    const amount = r.amount_collected ?? r.fare ?? 0;
    if (day === today) totals.today += amount;
    if (day >= weekStart && day <= today) totals.week += amount;
    if (day.startsWith(month)) totals.month += amount;
  }
  return totals;
}
