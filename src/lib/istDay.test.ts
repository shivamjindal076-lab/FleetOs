import { describe, it, expect } from 'vitest';
import { addIstDays, collectionDay, collectionsOrFilter, istDateString, istDayRange, istMonthStart } from './istDay';

describe('IST days', () => {
  it('reads the IST date, not the UTC one', () => {
    expect(istDateString('2026-11-11T20:00:00Z')).toBe('2026-11-12'); // 1:30 am IST
    expect(istDateString('2026-11-12T18:29:59Z')).toBe('2026-11-12');
    expect(istDateString('2026-11-12T18:30:00Z')).toBe('2026-11-13');
  });

  it('covers one IST day with an exclusive end', () => {
    expect(istDayRange('2026-11-12')).toEqual({
      startISO: '2026-11-11T18:30:00.000Z',
      endISO: '2026-11-12T18:30:00.000Z',
    });
  });

  it('covers a range of days including the last one', () => {
    expect(istDayRange('2026-11-01', '2026-11-30')).toEqual({
      startISO: '2026-10-31T18:30:00.000Z',
      endISO: '2026-11-30T18:30:00.000Z',
    });
  });

  it('adds days across month ends', () => {
    expect(addIstDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addIstDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rejects text that is not a date', () => {
    expect(() => istDayRange('12/11/2026')).toThrow();
  });

  it('finds the month start', () => {
    expect(istMonthStart('2026-11-12')).toBe('2026-11-01');
  });

  it('counts a trip on the day the money came in', () => {
    expect(collectionDay({
      scheduled_at: '2026-04-02T05:00:00Z',
      trip_completed_at: '2026-10-26T10:00:00Z',
      payment_confirmed_at: '2026-11-11T09:00:00Z',
    })).toBe('2026-11-11');
  });

  it('falls back to completion, then to the schedule', () => {
    expect(collectionDay({ scheduled_at: '2026-04-02T05:00:00Z', trip_completed_at: '2026-10-26T10:00:00Z' })).toBe('2026-10-26');
    expect(collectionDay({ scheduled_at: '2026-04-02T05:00:00Z' })).toBe('2026-04-02');
    expect(collectionDay({})).toBeNull();
  });

  it('builds the filter for a window and for open-ended', () => {
    const f = collectionsOrFilter('A', 'B');
    expect(f).toBe(
      'and(payment_confirmed_at.gte.A,payment_confirmed_at.lt.B),'
      + 'and(payment_confirmed_at.is.null,trip_completed_at.gte.A,trip_completed_at.lt.B),'
      + 'and(payment_confirmed_at.is.null,trip_completed_at.is.null,scheduled_at.gte.A,scheduled_at.lt.B)',
    );
    expect(collectionsOrFilter('A')).toContain('scheduled_at.gte.A)');
    expect(collectionsOrFilter('A')).not.toContain('.lt.');
  });
});
