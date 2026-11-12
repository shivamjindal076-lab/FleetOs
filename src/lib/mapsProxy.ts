// Pure helpers for the maps-proxy function and the drop-a-pin picker. No network, no DOM.

export interface ProxyPlace {
  id: string;
  label: string;
  main: string;
  secondary: string;
  lat: number | null;
  lng: number | null;
}

export interface ProxyRoute {
  polyline: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Fallback shown when every lookup fails. */
export const LOOKUP_FAILED_MESSAGE =
  "Couldn't find that address. Try a nearby landmark or drop a pin on the map.";

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseProxyPlaces(payload: unknown): ProxyPlace[] {
  const list = (payload as { places?: unknown } | null)?.places;
  if (!Array.isArray(list)) return [];
  const places: ProxyPlace[] = [];
  list.forEach((item, index) => {
    const p = item as Record<string, unknown> | null;
    const label = text(p?.label);
    if (!label) return;
    const lat = num(p?.lat);
    const lng = num(p?.lng);
    const hasPoint = lat !== null && lng !== null && isValidLatLng(lat, lng);
    places.push({
      id: text(p?.id) || `proxy:${index}`,
      label,
      main: text(p?.main) || label.split(',')[0],
      secondary: text(p?.secondary),
      lat: hasPoint ? lat : null,
      lng: hasPoint ? lng : null,
    });
  });
  return places;
}

export function parseProxyPlace(payload: unknown): ProxyPlace | null {
  const place = (payload as { place?: unknown } | null)?.place;
  if (!place) return null;
  const [first] = parseProxyPlaces({ places: [place] });
  return first && first.lat !== null && first.lng !== null ? first : null;
}

export function parseProxyAddress(payload: unknown): string | null {
  return text((payload as { address?: unknown } | null)?.address) || null;
}

export function parseProxyRoute(payload: unknown): ProxyRoute | null {
  const route = (payload as { route?: Record<string, unknown> | null } | null)?.route;
  const polyline = text(route?.polyline);
  if (!route || !polyline) return null;
  return {
    polyline,
    distanceMeters: num(route.distanceMeters),
    durationSeconds: num(route.durationSeconds),
  };
}

/** Plain "lat, lng" text, used when a pin has no street address. */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function addressKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Remembers the coordinates behind an address that came from a pin or a suggestion,
 * so the route preview does not have to look the same text up again.
 */
export function createCoordCache(limit = 100) {
  const map = new Map<string, LatLng>();
  return {
    remember(address: string, lat: number, lng: number) {
      const key = addressKey(address);
      if (!key || !isValidLatLng(lat, lng)) return;
      map.delete(key);
      map.set(key, { lat, lng });
      if (map.size > limit) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
    },
    get(address: string): LatLng | null {
      return map.get(addressKey(address)) ?? null;
    },
  };
}
