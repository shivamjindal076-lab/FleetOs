// Turns a live change to a booking into plain sentences for the owner. Pure, so it is tested.
// Needs the old row too (REPLICA IDENTITY FULL on bookings): a key missing from `old` means
// the old value is unknown, and then that change is not announced rather than guessed.

export interface LiveBooking {
  id?: number;
  status?: string | null;
  driver_id?: number | null;
  customer_name?: string | null;
  pickup?: string | null;
  drop?: string | null;
  driver_confirmed_at?: string | null;
  trip_started_at?: string | null;
  payment_confirmed_at?: string | null;
  amount_collected?: number | null;
}

export type LiveChangeKind = 'new-booking' | 'confirmed' | 'started' | 'completed' | 'payment';

export interface LiveNotice {
  kind: LiveChangeKind;
  message: string;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const known = (old: LiveBooking, key: keyof LiveBooking) => Object.prototype.hasOwnProperty.call(old, key);

export function describeBookingChange(
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  next: LiveBooking | null,
  old: LiveBooking | null,
  driverName: string | null,
): LiveNotice[] {
  if (!next || next.id == null) return [];
  const id = next.id;

  if (eventType === 'INSERT') {
    if (next.status !== 'pending') return [];
    const who = next.customer_name?.trim() || 'a customer';
    const route = next.pickup && next.drop ? `, ${next.pickup} to ${next.drop}` : '';
    return [{ kind: 'new-booking', message: `New booking #${id} from ${who}${route}` }];
  }
  if (eventType !== 'UPDATE' || !old) return [];

  const driver = driverName?.trim() || 'The driver';
  const notices: LiveNotice[] = [];

  if (known(old, 'driver_confirmed_at') && !old.driver_confirmed_at && next.driver_confirmed_at) {
    notices.push({ kind: 'confirmed', message: `${driver} confirmed trip #${id}` });
  }
  const startedByTime = known(old, 'trip_started_at') && !old.trip_started_at && !!next.trip_started_at;
  const startedByStatus = known(old, 'status') && old.status !== 'in-progress' && next.status === 'in-progress';
  if (startedByTime || startedByStatus) {
    notices.push({ kind: 'started', message: `${driver} started trip #${id}` });
  }
  if (known(old, 'status') && old.status !== 'completed' && next.status === 'completed') {
    notices.push({ kind: 'completed', message: `${driver} completed trip #${id}` });
  }
  if (known(old, 'payment_confirmed_at') && !old.payment_confirmed_at && next.payment_confirmed_at) {
    const amount = next.amount_collected != null ? ` of ${rupees(next.amount_collected)}` : '';
    notices.push({ kind: 'payment', message: `${driver} logged payment${amount} for trip #${id}` });
  }
  return notices;
}

// Bookings the owner just changed from this screen: no need to announce them back.
const ownEdits = new Map<number, number>();
const OWN_EDIT_MS = 8000;

export function markOwnBookingEdit(id: number | null | undefined, now: number = Date.now()) {
  if (id == null) return;
  ownEdits.set(id, now);
}

export function isOwnBookingEdit(id: number, now: number = Date.now()): boolean {
  const at = ownEdits.get(id);
  if (at == null) return false;
  if (now - at > OWN_EDIT_MS) {
    ownEdits.delete(id);
    return false;
  }
  return true;
}
