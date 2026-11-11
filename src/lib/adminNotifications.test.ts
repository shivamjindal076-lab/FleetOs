import { describe, it, expect } from 'vitest';
import { describeBookingChange, isOwnBookingEdit, markOwnBookingEdit } from './adminNotifications';

describe('describeBookingChange', () => {
  it('announces a trip started', () => {
    const out = describeBookingChange('UPDATE',
      { id: 34, status: 'in-progress', trip_started_at: '2026-11-12T05:00:00Z' },
      { id: 34, status: 'confirmed', trip_started_at: null }, 'Palak Yadav');
    expect(out).toEqual([{ kind: 'started', message: 'Palak Yadav started trip #34' }]);
  });

  it('announces confirmation, completion and payment', () => {
    expect(describeBookingChange('UPDATE', { id: 5, driver_confirmed_at: 'x' }, { id: 5, driver_confirmed_at: null }, 'Ravi')[0].message)
      .toBe('Ravi confirmed trip #5');
    expect(describeBookingChange('UPDATE', { id: 5, status: 'completed' }, { id: 5, status: 'in-progress' }, 'Ravi')[0].message)
      .toBe('Ravi completed trip #5');
    expect(describeBookingChange('UPDATE', { id: 5, payment_confirmed_at: 'x', amount_collected: 1250.5 }, { id: 5, payment_confirmed_at: null }, 'Ravi')[0].message)
      .toBe('Ravi logged payment of ₹1,250.5 for trip #5');
  });

  it('says nothing for unrelated edits or when the old value is unknown', () => {
    expect(describeBookingChange('UPDATE', { id: 5, status: 'in-progress' }, { id: 5, status: 'in-progress' }, 'Ravi')).toEqual([]);
    expect(describeBookingChange('UPDATE', { id: 5, status: 'completed' }, { id: 5 }, 'Ravi')).toEqual([]);
    expect(describeBookingChange('UPDATE', { id: 5, status: 'completed' }, null, 'Ravi')).toEqual([]);
  });

  it('announces new pending bookings only', () => {
    expect(describeBookingChange('INSERT', { id: 9, status: 'pending', customer_name: 'Asha', pickup: 'A', drop: 'B' }, null, null)[0].message)
      .toBe('New booking #9 from Asha, A to B');
    expect(describeBookingChange('INSERT', { id: 9, status: 'confirmed' }, null, null)).toEqual([]);
  });

  it('falls back when the driver is unknown', () => {
    expect(describeBookingChange('UPDATE', { id: 1, status: 'completed' }, { id: 1, status: 'confirmed' }, null)[0].message)
      .toBe('The driver completed trip #1');
  });
});

describe('own edits', () => {
  it('are ignored for a few seconds only', () => {
    markOwnBookingEdit(77, 1000);
    expect(isOwnBookingEdit(77, 2000)).toBe(true);
    expect(isOwnBookingEdit(77, 20000)).toBe(false);
    expect(isOwnBookingEdit(78, 2000)).toBe(false);
  });
});
