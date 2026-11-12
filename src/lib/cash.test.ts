import { describe, it, expect } from 'vitest';
import { summarizeCash, formatSignedRupees, entriesSince, cashDueSince } from './cash';
import { toBookingId, rowToCollection, rowToExpense } from '@/components/driver/useDriverCash';

describe('summarizeCash', () => {
  it('hands over cash only, minus what the driver spent', () => {
    const s = summarizeCash(
      [{ amount: 200 }, { amount: 50.5 }],
      [{ amount: 480, method: 'cash' }, { amount: 300, method: 'upi' }],
    );
    expect(s).toEqual({
      totalExpenses: 250.5,
      totalCollected: 780,
      totalCashCollected: 480,
      cashToHandOver: 229.5,
      netEarnings: 529.5,
    });
  });

  it('avoids floating-point drift on paise', () => {
    expect(summarizeCash([{ amount: 0.1 }, { amount: 0.2 }], []).totalExpenses).toBe(0.3);
  });

  it('shows a loss with a minus sign', () => {
    expect(formatSignedRupees(-1)).toBe('-₹1');
    expect(formatSignedRupees(1500)).toBe('₹1,500');
  });
});

describe('driver cash rows', () => {
  const base = { id: 7, kind: 'expense', category: 'toll', method: null, label: null, amount: 40, note: 'NH48', booking_id: 54, created_at: '2026-10-25T09:00:00Z' };

  it('maps a saved expense back to the app shape', () => {
    expect(rowToExpense(base)).toEqual({
      id: 'db_7', type: 'toll', amount: 40, note: 'NH48', tripId: '54', timestamp: '2026-10-25T09:00:00Z', isOffline: false,
    });
  });

  it('maps a saved collection, defaulting an unknown method to cash', () => {
    const row = { ...base, kind: 'collection', category: null, method: 'card', label: 'Priya', booking_id: null };
    expect(rowToCollection(row)).toMatchObject({ id: 'db_7', tripId: '', customerName: 'Priya', method: 'cash', amount: 40 });
  });

  it('only links numeric trip ids to bookings', () => {
    expect(toBookingId('54')).toBe(54);
    expect(toBookingId('demo')).toBeNull();
    expect(toBookingId(undefined)).toBeNull();
  });
});

describe('cash since the last handover', () => {
  const expenses = [
    { amount: 100, timestamp: '2026-11-11T09:00:00Z' },
    { amount: 40.1, timestamp: '2026-11-12T05:00:00Z' },
  ];
  const collections = [
    { amount: 500, method: 'cash' as const, timestamp: '2026-11-11T08:00:00Z' },
    { amount: 300.2, method: 'cash' as const, timestamp: '2026-11-12T04:00:00Z' },
    { amount: 900, method: 'upi' as const, timestamp: '2026-11-12T04:30:00Z' },
  ];

  it('counts everything when there has been no handover', () => {
    expect(cashDueSince(expenses, collections, null).cashToHandOver).toBe(660.1);
  });

  it('counts only entries after the last handover, even from an earlier day', () => {
    expect(entriesSince(collections, '2026-11-12T03:00:00Z')).toHaveLength(2);
    expect(cashDueSince(expenses, collections, '2026-11-11T12:00:00Z').cashToHandOver).toBe(260.1);
  });

  it('starts again at zero straight after a handover', () => {
    expect(cashDueSince(expenses, collections, '2026-11-12T06:00:00Z').cashToHandOver).toBe(0);
  });
});
