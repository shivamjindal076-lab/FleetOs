import { describe, it, expect } from 'vitest';
import { fleetLoadState, plainDbError } from './fleetLoad';

describe('fleetLoadState', () => {
  it('is ready once the fleet is there, even if a later error is set', () => {
    expect(fleetLoadState({ hasOrg: true, loading: false, error: 'x' })).toEqual({ status: 'ready' });
  });
  it('asks to wait while loading', () => {
    expect(fleetLoadState({ hasOrg: false, loading: true, error: null })).toEqual({ status: 'loading', buttonLabel: 'Loading fleet details' });
  });
  it('shows the real error with a refresh hint after loading ends', () => {
    expect(fleetLoadState({ hasOrg: false, loading: false, error: 'Organisation not found' }))
      .toEqual({ status: 'error', message: 'Organisation not found. Refresh the page.' });
  });
  it('never says still loading when it has finished without a reason', () => {
    const s = fleetLoadState({ hasOrg: false, loading: false, error: null });
    expect(s.status).toBe('error');
    expect(JSON.stringify(s)).not.toMatch(/still loading/i);
  });
});

describe('plainDbError', () => {
  it('explains permission and network problems', () => {
    expect(plainDbError('new row violates row-level security policy for table "bookings"')).toMatch(/permission/);
    expect(plainDbError('TypeError: Failed to fetch')).toMatch(/connection/);
  });
  it('passes unknown messages through and handles empty', () => {
    expect(plainDbError('something odd')).toBe('something odd');
    expect(plainDbError(null)).toMatch(/wasn't saved/);
  });
});
