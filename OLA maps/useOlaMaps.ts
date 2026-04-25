/**
 * useOlaMaps.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Core hook + utilities for Ola Maps Web SDK.
 *
 * Usage:
 *   const { mapRef, mapInstance, isLoaded } = useOlaMaps('map-container-id');
 *
 * The hook:
 *  1. Dynamically injects the Ola Maps JS SDK <script> once per app session.
 *  2. Initialises a Map instance on the given container id.
 *  3. Exposes helpers: addMarker(), drawRoute(), fitMarkers().
 *  4. Authenticates via API Key (appended as ?api_key=... on every request).
 *
 * Docs: https://maps.olakrutrim.com/docs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const OLA_API_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY;
const OLA_SDK_URL = 'https://api.olamaps.io/maps/v1/olamaps-js-sdk.js';
const OLA_STYLE   = 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';

// ─── Type declarations (Ola Maps attaches `OlaMaps` to window) ────────────────

declare global {
  interface Window {
    OlaMaps: any;
  }
}

// ─── SDK loader (singleton promise so script is injected only once) ───────────

let sdkLoadPromise: Promise<void> | null = null;

function loadOlaMapsSDK(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.OlaMaps) { resolve(); return; }

    const script = document.createElement('script');
    script.src  = OLA_SDK_URL;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Ola Maps SDK'));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

// ─── Helpers exported for use without the hook ────────────────────────────────

/** Append api_key to any Ola Maps REST endpoint. */
export function olaUrl(endpoint: string, params: Record<string, string> = {}): string {
  const url = new URL(`https://api.olamaps.io${endpoint}`);
  url.searchParams.set('api_key', OLA_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

/** Autocomplete a place query. Returns Ola Maps place predictions. */
export async function olaAutocomplete(input: string): Promise<OlaPlacePrediction[]> {
  if (!input.trim()) return [];
  const res = await fetch(olaUrl('/places/v1/autocomplete', { input }));
  if (!res.ok) throw new Error('Autocomplete failed');
  const json = await res.json();
  return (json.predictions ?? []) as OlaPlacePrediction[];
}

/** Get lat/lng for a place_id. */
export async function olaPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; address: string } | null> {
  const res = await fetch(olaUrl('/places/v1/details', { place_id: placeId }));
  if (!res.ok) return null;
  const json = await res.json();
  const loc = json.result?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng, address: json.result?.formatted_address ?? '' };
}

/** Forward geocode a free-text address. */
export async function olaGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(olaUrl('/places/v1/geocode', { address }));
  if (!res.ok) return null;
  const json = await res.json();
  const loc = json.geocodingResults?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

/** Get a driving route between two points. Returns encoded polyline + distance/duration. */
export async function olaDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<OlaRoute | null> {
  const originStr      = `${origin.lat},${origin.lng}`;
  const destinationStr = `${destination.lat},${destination.lng}`;
  const res = await fetch(
    olaUrl('/routing/v1/directions', {
      origin:      originStr,
      destination: destinationStr,
    })
  );
  if (!res.ok) return null;
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) return null;
  return {
    polyline:         route.overview_polyline?.points ?? '',
    distanceMeters:   route.legs?.[0]?.distance?.value ?? 0,
    durationSeconds:  route.legs?.[0]?.duration?.value ?? 0,
    distanceText:     route.legs?.[0]?.distance?.text  ?? '',
    durationText:     route.legs?.[0]?.duration?.text  ?? '',
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OlaPlacePrediction {
  place_id:     string;
  description:  string;
  structured_formatting?: {
    main_text:      string;
    secondary_text: string;
  };
}

export interface OlaRoute {
  polyline:        string;
  distanceMeters:  number;
  durationSeconds: number;
  distanceText:    string;
  durationText:    string;
}

export interface OlaMarkerOptions {
  lat:       number;
  lng:       number;
  color?:    string;   // hex, default brand color
  label?:    string;   // popup HTML
  element?:  HTMLElement;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

interface UseOlaMapsReturn {
  /** Attach this ref to the container div */
  containerRef: React.RefObject<HTMLDivElement>;
  mapInstance:  any | null;
  isLoaded:     boolean;
  error:        string | null;
  /** Add a marker. Returns the marker instance so you can .remove() it later. */
  addMarker:    (opts: OlaMarkerOptions) => any | null;
  /** Draw a route polyline from an encoded polyline string. Returns layer id. */
  drawRoute:    (polyline: string, color?: string) => string | null;
  /** Remove a route layer by id returned from drawRoute. */
  removeRoute:  (layerId: string) => void;
  /** Fit map bounds to an array of [lng, lat] pairs. */
  fitBounds:    (coords: [number, number][], padding?: number) => void;
  /** Pan/zoom to a coordinate. */
  flyTo:        (lat: number, lng: number, zoom?: number) => void;
}

export function useOlaMaps(
  /** Optional: India-centered default. Pass org city coords for better UX. */
  defaultCenter: { lat: number; lng: number } = { lat: 20.5937, lng: 78.9629 },
  defaultZoom = 5
): UseOlaMapsReturn {
  const containerRef  = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [isLoaded,    setIsLoaded]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const routeCountRef = useRef(0);

  useEffect(() => {
    let map: any;

    loadOlaMapsSDK()
      .then(() => {
        if (!containerRef.current) return;

        const olaMaps = new window.OlaMaps({ apiKey: OLA_API_KEY });
        map = olaMaps.init({
          style:     OLA_STYLE,
          container: containerRef.current,
          center:    [defaultCenter.lng, defaultCenter.lat],
          zoom:      defaultZoom,
        });

        map.on('load', () => {
          setMapInstance(map);
          setIsLoaded(true);
        });
      })
      .catch(err => setError(err.message));

    return () => {
      // Ola Maps doesn't expose .remove() in all versions; guard it.
      try { map?.remove?.(); } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMarker = useCallback((opts: OlaMarkerOptions): any | null => {
    if (!mapInstance || !window.OlaMaps) return null;
    const olaMaps = new window.OlaMaps({ apiKey: OLA_API_KEY });

    let marker: any;
    if (opts.element) {
      marker = olaMaps.addMarker({ element: opts.element, anchor: 'bottom' });
    } else {
      marker = olaMaps.addMarker({ color: opts.color ?? '#1a73e8', anchor: 'bottom' });
    }
    marker.setLngLat([opts.lng, opts.lat]).addTo(mapInstance);

    if (opts.label) {
      const popup = olaMaps.addPopup({ offset: 25 }).setHTML(opts.label);
      marker.setPopup(popup);
    }

    return marker;
  }, [mapInstance]);

  const drawRoute = useCallback((polyline: string, color = '#1a73e8'): string | null => {
    if (!mapInstance || !isLoaded) return null;

    // Decode Google-style encoded polyline to GeoJSON
    const coords = decodePolyline(polyline);
    const layerId = `route-${++routeCountRef.current}`;
    const sourceId = `${layerId}-source`;

    mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {},
      },
    });

    mapInstance.addLayer({
      id:   layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint:  { 'line-color': color, 'line-width': 4, 'line-opacity': 0.85 },
    });

    return layerId;
  }, [mapInstance, isLoaded]);

  const removeRoute = useCallback((layerId: string) => {
    if (!mapInstance) return;
    try {
      if (mapInstance.getLayer(layerId))  mapInstance.removeLayer(layerId);
      if (mapInstance.getSource(`${layerId}-source`)) mapInstance.removeSource(`${layerId}-source`);
    } catch {}
  }, [mapInstance]);

  const fitBounds = useCallback((coords: [number, number][], padding = 60) => {
    if (!mapInstance || coords.length === 0) return;
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    mapInstance.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding }
    );
  }, [mapInstance]);

  const flyTo = useCallback((lat: number, lng: number, zoom = 14) => {
    mapInstance?.flyTo({ center: [lng, lat], zoom });
  }, [mapInstance]);

  return { containerRef, mapInstance, isLoaded, error, addMarker, drawRoute, removeRoute, fitBounds, flyTo };
}

// ─── Polyline decoder (Google Encoded Polyline Algorithm) ─────────────────────

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}
