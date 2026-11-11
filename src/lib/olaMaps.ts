import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { addressFromReverse } from '@/lib/customerTrip';
import {
  createCoordCache,
  isValidLatLng,
  parseProxyAddress,
  parseProxyPlace,
  parseProxyPlaces,
  parseProxyRoute,
} from '@/lib/mapsProxy';

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
// Integrity hashes of the official 1.9.4 files: the browser refuses a changed copy from the CDN.
const LEAFLET_JS_SRI = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
const LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

let leafletLoadPromise: Promise<void> | null = null;

export type FleetMapProvider = 'proxy' | 'nominatim' | 'osrm' | 'leaflet';

export class OlaMapsApiError extends Error {
  status: number;
  provider: FleetMapProvider | 'unknown';

  constructor(message: string, status = 0, provider: FleetMapProvider | 'unknown' = 'unknown') {
    super(message);
    this.name = 'OlaMapsApiError';
    this.status = status;
    this.provider = provider;
  }
}

export interface OlaPlacePrediction {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
  provider?: Exclude<FleetMapProvider, 'osrm' | 'leaflet'>;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface OlaPlaceDetails {
  address: string;
  lat: number;
  lng: number;
  provider?: Exclude<FleetMapProvider, 'osrm' | 'leaflet'>;
}

export interface RouteResult {
  polyline: string;
  provider: Exclude<FleetMapProvider, 'leaflet'>;
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface RouteDrawOptions {
  color?: string;
  weight?: number;
  opacity?: number;
}

function appendStylesheet(href: string, integrity?: string) {
  const existing = document.querySelector(`link[data-fleetos-href="${href}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-fleetos-href', href);
  if (integrity) {
    link.integrity = integrity;
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

export function loadLeaflet(): Promise<void> {
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }

    appendStylesheet(LEAFLET_CSS_URL, LEAFLET_CSS_SRI);

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.integrity = LEAFLET_JS_SRI;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load the map runtime'));
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
}

function asNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function buildPrediction(
  provider: Exclude<FleetMapProvider, 'osrm' | 'leaflet'>,
  description: string,
  placeId: string,
  options: {
    lat?: number | null;
    lng?: number | null;
    mainText?: string;
    secondaryText?: string;
  } = {}
): OlaPlacePrediction {
  return {
    place_id: placeId,
    description,
    provider,
    lat: options.lat ?? undefined,
    lng: options.lng ?? undefined,
    structured_formatting: {
      main_text: options.mainText,
      secondary_text: options.secondaryText,
    },
  };
}

async function fetchJson<T>(
  url: string,
  provider: FleetMapProvider,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (error) {
    throw new OlaMapsApiError(
      error instanceof Error ? error.message : `Unable to reach ${provider} right now.`,
      0,
      provider
    );
  }

  if (!response.ok) {
    throw new OlaMapsApiError(`${provider} request failed (${response.status})`, response.status, provider);
  }

  return response.json() as Promise<T>;
}

interface NominatimHit {
  place_id: number | string;
  display_name: string;
  name?: string;
  lat?: string;
  lon?: string;
}

// ---- Lookups through the maps-proxy function (keys stay on the server) ----

const PROXY_TIMEOUT_MS = 10000;
const PROXY_RETRY_AFTER_MS = 60000;
let proxyDownUntil = 0;

// Addresses that came from a pin or a suggestion, so the route preview needs no second lookup.
const knownPlaces = createCoordCache();

/** Answer from the proxy, or null when it is missing, failing or slow. The caller then uses the open services. */
async function callProxy(body: Record<string, unknown>): Promise<unknown | null> {
  if (Date.now() < proxyDownUntil) return null;

  let timer: number | undefined;
  try {
    const result = await Promise.race([
      supabase.functions.invoke('maps-proxy', { body }),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('timeout')), PROXY_TIMEOUT_MS);
      }),
    ]);

    if (result.error) {
      // Not deployed, not configured or rejected: stop asking for a minute. A bad query alone does not count.
      const status = (result.error as { context?: { status?: number } }).context?.status;
      if (status === undefined || [401, 403, 404, 503].includes(status)) {
        proxyDownUntil = Date.now() + PROXY_RETRY_AFTER_MS;
      }
      return null;
    }

    return result.data ?? null;
  } catch {
    proxyDownUntil = Date.now() + PROXY_RETRY_AFTER_MS;
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function nominatimAutocomplete(input: string): Promise<OlaPlacePrediction[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'in');
  url.searchParams.set('limit', '5');
  url.searchParams.set('q', input);

  const payload = await fetchJson<NominatimHit[]>(url.toString(), 'nominatim');

  return payload.map(result =>
    buildPrediction('nominatim', result.display_name, `nominatim:${result.place_id}`, {
      lat: asNumber(result.lat),
      lng: asNumber(result.lon),
      mainText: result.name ?? result.display_name?.split(',')[0],
      secondaryText: result.display_name,
    })
  );
}

async function nominatimGeocodeOnly(address: string): Promise<OlaPlaceDetails | null> {
  const matches = await nominatimAutocomplete(address);
  const first = matches[0];
  if (!first || first.lat == null || first.lng == null) return null;

  return {
    address: first.description,
    lat: first.lat,
    lng: first.lng,
    provider: 'nominatim',
  };
}

async function osrmDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  );
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'polyline');

  const payload = await fetchJson<{ routes?: Array<{ geometry?: string; distance?: number; duration?: number }> }>(url.toString(), 'osrm');
  const route = payload?.routes?.[0];
  const polyline = route?.geometry;

  return polyline
    ? {
        polyline,
        provider: 'osrm',
        distanceMeters: asNumber(route?.distance) ?? undefined,
        durationSeconds: asNumber(route?.duration) ?? undefined,
      }
    : null;
}

export async function olaAutocomplete(input: string): Promise<OlaPlacePrediction[]> {
  const query = input.trim();
  if (!query) return [];

  const proxied = parseProxyPlaces(await callProxy({ op: 'autocomplete', input: query }));
  if (proxied.length > 0) {
    return proxied.map(place => {
      if (place.lat !== null && place.lng !== null) knownPlaces.remember(place.label, place.lat, place.lng);
      return buildPrediction('proxy', place.label, place.id, {
        lat: place.lat,
        lng: place.lng,
        mainText: place.main,
        secondaryText: place.secondary,
      });
    });
  }

  return nominatimAutocomplete(query);
}

export async function olaPlaceDetails(
  placeId: string,
  fallbackDescription = ''
): Promise<OlaPlaceDetails | null> {
  if (!placeId.trim()) return null;
  return fallbackDescription ? olaGeocode(fallbackDescription) : null;
}

export async function olaGeocode(address: string): Promise<OlaPlaceDetails | null> {
  const query = address.trim();
  if (!query) return null;

  const known = knownPlaces.get(query);
  if (known) return { address: query, lat: known.lat, lng: known.lng, provider: 'proxy' };

  const place = parseProxyPlace(await callProxy({ op: 'geocode', address: query }));
  if (place && place.lat !== null && place.lng !== null) {
    return { address: place.label, lat: place.lat, lng: place.lng, provider: 'proxy' };
  }

  try {
    return await nominatimGeocodeOnly(query);
  } catch {
    return null;
  }
}

/** Street address for a coordinate, or null. Remembers the coordinate so the address needs no second lookup. */
export async function olaReverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!isValidLatLng(lat, lng)) return null;

  let address = parseProxyAddress(await callProxy({ op: 'reverse', lat, lng }));

  if (!address) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      address = addressFromReverse(await fetchJson<unknown>(url.toString(), 'nominatim'));
    } catch {
      address = null;
    }
  }

  if (address) knownPlaces.remember(address, lat, lng);
  return address;
}

/** Lets a chosen pin keep its exact coordinates even when its text is typed or edited later. */
export function rememberPlaceCoords(address: string, lat: number, lng: number): void {
  knownPlaces.remember(address, lat, lng);
}

export async function olaDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  const route = parseProxyRoute(await callProxy({ op: 'directions', from: origin, to: destination }));
  if (route) {
    return {
      polyline: route.polyline,
      provider: 'proxy',
      distanceMeters: route.distanceMeters ?? undefined,
      durationSeconds: route.durationSeconds ?? undefined,
    };
  }

  try {
    return await osrmDirections(origin, destination);
  } catch {
    return null;
  }
}

export function hasLocationSearchProvider(): boolean {
  return true;
}

/** Short status for admin screens. Keys live on the server, so the browser cannot tell which provider answered. */
export function getMapStackLabel(): string {
  return 'Server search with open fallback';
}

export interface OlaMarkerOptions {
  lat: number;
  lng: number;
  color?: string;
  label?: string;
  element?: HTMLElement;
}

interface UseOlaMapsResult {
  addMarker: (options: OlaMarkerOptions) => any | null;
  containerRef: RefObject<HTMLDivElement>;
  drawRoute: (polyline: string, options?: string | RouteDrawOptions) => string | null;
  error: string | null;
  fitBounds: (coords: [number, number][], padding?: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  isLoaded: boolean;
  mapInstance: any | null;
  providerLabel: string;
  removeRoute: (layerId: string) => void;
}

export function useOlaMaps(
  defaultCenter: { lat: number; lng: number } = { lat: 26.9124, lng: 75.7873 },
  defaultZoom = 11
): UseOlaMapsResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const routeCountRef = useRef(0);
  const routeLayersRef = useRef(new Map<string, any>());

  useEffect(() => {
    let map: any;
    let isCancelled = false;

    loadLeaflet()
      .then(() => {
        if (isCancelled || !containerRef.current || !window.L) return;

        const L = window.L;
        map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.control
          .attribution({ position: 'bottomleft', prefix: false })
          .addTo(map)
          .addAttribution(OSM_ATTRIBUTION);

        map.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom);
        map.whenReady(() => {
          if (isCancelled) return;
          setMapInstance(map);
          setIsLoaded(true);
          setError(null);
          window.setTimeout(() => map.invalidateSize?.(), 120);
        });
      })
      .catch((loadError: Error) => {
        if (!isCancelled) setError(loadError.message);
      });

    return () => {
      isCancelled = true;
      routeLayersRef.current.forEach(layer => {
        try {
          layer?.remove?.();
        } catch {
          // Ignore cleanup failures from a half-initialized map.
        }
      });
      routeLayersRef.current.clear();

      try {
        map?.remove?.();
      } catch {
        // Ignore cleanup failures.
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !isLoaded) return;
    mapInstance.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom, { animate: false });
  }, [defaultCenter.lat, defaultCenter.lng, defaultZoom, isLoaded, mapInstance]);

  const addMarker = useCallback(
    (options: OlaMarkerOptions): any | null => {
      if (!mapInstance || !window.L) return null;

      const L = window.L;
      const markerHtml = options.element?.outerHTML ?? `
        <div style="
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: ${options.color ?? '#2563eb'};
          border: 3px solid rgba(255,255,255,0.95);
          box-shadow: 0 8px 18px rgba(15,23,42,0.22);
        "></div>
      `;

      const marker = L.marker([options.lat, options.lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: 'fleetos-map-marker',
          iconSize: options.element ? [44, 44] : [24, 24],
          iconAnchor: options.element ? [22, 22] : [12, 12],
          popupAnchor: [0, -18],
        }),
      }).addTo(mapInstance);

      if (options.label) {
        marker.bindPopup(options.label, {
          closeButton: false,
          offset: [0, -18],
        });
      }

      return marker;
    },
    [mapInstance]
  );

  const drawRoute = useCallback(
    (polyline: string, options: string | RouteDrawOptions = '#2563eb'): string | null => {
      if (!mapInstance || !isLoaded || !window.L) return null;

      const L = window.L;
      const layerId = `route-${++routeCountRef.current}`;
      const latLngs = decodePolyline(polyline).map(([lng, lat]) => [lat, lng]);
      const routeStyle =
        typeof options === 'string'
          ? { color: options, weight: 5, opacity: 0.84 }
          : {
              color: options.color ?? '#2563eb',
              weight: options.weight ?? 5,
              opacity: options.opacity ?? 0.84,
            };
      const routeLayer = L.polyline(latLngs, {
        color: routeStyle.color,
        weight: routeStyle.weight,
        opacity: routeStyle.opacity,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapInstance);

      routeLayersRef.current.set(layerId, routeLayer);
      return layerId;
    },
    [isLoaded, mapInstance]
  );

  const removeRoute = useCallback(
    (layerId: string) => {
      const routeLayer = routeLayersRef.current.get(layerId);
      if (!routeLayer) return;

      try {
        routeLayer.remove();
      } catch {
        // Ignore cleanup failures when the map is already gone.
      }

      routeLayersRef.current.delete(layerId);
    },
    []
  );

  const fitBounds = useCallback(
    (coords: [number, number][], padding = 60) => {
      if (!mapInstance || !window.L || coords.length === 0) return;

      const L = window.L;
      const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));

      if (latLngs.length === 1) {
        mapInstance.flyTo(latLngs[0], Math.max(mapInstance.getZoom?.() ?? defaultZoom, 14));
        return;
      }

      mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [padding, padding] });
    },
    [defaultZoom, mapInstance]
  );

  const flyTo = useCallback(
    (lat: number, lng: number, zoom = 14) => {
      mapInstance?.flyTo?.([lat, lng], zoom);
    },
    [mapInstance]
  );

  return {
    addMarker,
    containerRef,
    drawRoute,
    error,
    fitBounds,
    flyTo,
    isLoaded,
    mapInstance,
    providerLabel: getMapStackLabel(),
    removeRoute,
  };
}

export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }

  return coords;
}

export function estimatePolylineDistanceKm(encoded: string): number {
  const coordinates = decodePolyline(encoded);
  if (coordinates.length < 2) return 0;

  const toRad = (value: number) => (value * Math.PI) / 180;
  let meters = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const [prevLng, prevLat] = coordinates[index - 1];
    const [nextLng, nextLat] = coordinates[index];
    const dLat = toRad(nextLat - prevLat);
    const dLng = toRad(nextLng - prevLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(prevLat)) *
        Math.cos(toRad(nextLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    meters += 6371000 * c;
  }

  return meters / 1000;
}
