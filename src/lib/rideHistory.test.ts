import { describe, it, expect } from 'vitest';
import { collectedTotals, completedNewestFirst, countCompleted, countCompletedByDriver } from './rideHistory';

const NOW = new Date('2026-11-12T06:00:00Z'); // 11:30 am IST, 12 Nov

const rides = [
  { id: 1, driver_id: 8, status: 'completed', trip_completed_at: '2026-11-12T02:00:00Z', payment_confirmed_at: '2026-11-12T02:10:00Z', amount_collected: 500, fare: 500 },
  { id: 2, driver_id: 8, status: 'completed', trip_completed_at: '2026-11-08T02:00:00Z', payment_confirmed_at: '2026-11-08T02:10:00Z', amount_collected: 300, fare: 350 },
  { id: 3, driver_id: 8, status: 'completed', trip_completed_at: '2026-10-26T02:00:00Z', payment_confirmed_at: '2026-10-26T02:10:00Z', amount_collected: 700, fare: 700 },
  { id: 4, driver_id: 9, status: 'completed', trip_completed_at: '2026-11-11T20:00:00Z', payment_confirmed_at: null, amount_collected: null, fare: 200 }, // 1:30 am IST on the 12th
  { id: 5, driver_id: 9, status: 'confirmed', trip_completed_at: null },
];

describe('ride history', () => {
  it('counts today, week, month and total in IST', () => {
    expect(countCompleted(rides.filter(r => r.driver_id === 8), NOW)).toEqual({ today: 1, week: 2, month: 2, total: 3 });
    expect(countCompleted(rides.filter(r => r.driver_id === 9), NOW)).toEqual({ today: 1, week: 1, month: 1, total: 1 });
  });

  it('groups counts by driver', () => {
    const m = countCompletedByDriver(rides, NOW);
    expect(m.get(8)?.total).toBe(3);
    expect(m.get(9)?.total).toBe(1);
    expect(m.get(1)).toBeUndefined();
  });

  it('lists completed rides newest first', () => {
    expect(completedNewestFirst(rides).map(r => r.id)).toEqual([1, 4, 2, 3]);
  });

  it('totals money by payment day', () => {
    expect(collectedTotals(rides, NOW)).toEqual({ today: 500, week: 800, month: 800 });
  });
});
