import { describe, expect, it } from 'vitest';
import {
  createCoordCache,
  formatCoords,
  isValidLatLng,
  parseProxyAddress,
  parseProxyPlace,
  parseProxyPlaces,
  parseProxyRoute,
} from './mapsProxy';

describe('isValidLatLng', () => {
  it('accepts real coordinates and rejects bad ones', () => {
    expect(isValidLatLng(26.9, 75.8)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
    expect(isValidLatLng(NaN, 0)).toBe(false);
    expect(isValidLatLng('1' as unknown, 2)).toBe(false);
  });
});

describe('parseProxyPlaces', () => {
  it('keeps usable places and drops empty or malformed ones', () => {
    const places = parseProxyPlaces({
      places: [
        { id: 'a', label: 'MI Road, Jaipur', main: 'MI Road', secondary: 'Jaipur', lat: 26.9, lng: 75.8 },
        { id: 'b', label: '' },
        null,
        { label: 'Amer Fort, Jaipur', lat: 500, lng: 1 },
      ],
    });
    expect(places).toHaveLength(2);
    expect(places[0].lat).toBe(26.9);
    expect(places[1].lat).toBeNull();
    expect(places[1].main).toBe('Amer Fort');
  });

  it('returns an empty list for odd payloads', () => {
    expect(parseProxyPlaces(null)).toEqual([]);
    expect(parseProxyPlaces({ places: 'x' })).toEqual([]);
  });
});

describe('parseProxyPlace', () => {
  it('needs coordinates', () => {
    expect(parseProxyPlace({ place: { label: 'X', lat: 1, lng: 2 } })?.label).toBe('X');
    expect(parseProxyPlace({ place: { label: 'X' } })).toBeNull();
    expect(parseProxyPlace({ place: null })).toBeNull();
  });
});

describe('parseProxyAddress and parseProxyRoute', () => {
  it('reads an address', () => {
    expect(parseProxyAddress({ address: ' Hawa Mahal ' })).toBe('Hawa Mahal');
    expect(parseProxyAddress({ address: null })).toBeNull();
  });

  it('reads a route and tolerates missing numbers', () => {
    expect(parseProxyRoute({ route: { polyline: 'abc', distanceMeters: 1200, durationSeconds: 'x' } })).toEqual({
      polyline: 'abc',
      distanceMeters: 1200,
      durationSeconds: null,
    });
    expect(parseProxyRoute({ route: null })).toBeNull();
    expect(parseProxyRoute({ route: { polyline: '' } })).toBeNull();
  });
});

describe('createCoordCache', () => {
  it('matches addresses ignoring case and spacing', () => {
    const cache = createCoordCache();
    cache.remember('  MI Road,  Jaipur ', 26.9, 75.8);
    expect(cache.get('mi road, jaipur')).toEqual({ lat: 26.9, lng: 75.8 });
    expect(cache.get('other')).toBeNull();
  });

  it('ignores bad coordinates and evicts the oldest', () => {
    const cache = createCoordCache(2);
    cache.remember('a', 999, 0);
    expect(cache.get('a')).toBeNull();
    cache.remember('a', 1, 1);
    cache.remember('b', 2, 2);
    cache.remember('c', 3, 3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('c')).toEqual({ lat: 3, lng: 3 });
  });
});

describe('formatCoords', () => {
  it('prints five decimals', () => {
    expect(formatCoords(26.912345678, 75.7873)).toBe('26.91235, 75.78730');
  });
});
