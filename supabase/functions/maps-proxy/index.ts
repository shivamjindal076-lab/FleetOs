import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Server-side map lookups for the browser. Browsers cannot call the map providers directly (CORS),
// and keys sent to the browser are public. The keys live only in function secrets:
//   OLA_MAPS_API_KEY      first choice
//   MAPPLS_ACCESS_TOKEN   used when the first choice fails or has no key
// Responses never contain a key or an upstream error body.

type Op = "autocomplete" | "geocode" | "reverse" | "directions";

interface Place {
  id: string;
  label: string;
  main: string;
  secondary: string;
  lat: number | null;
  lng: number | null;
}

interface Route {
  distanceMeters: number | null;
  durationSeconds: number | null;
  polyline: string;
}

const OPS: readonly Op[] = ["autocomplete", "geocode", "reverse", "directions"];
const MAX_TEXT_LENGTH = 200;
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_PLACES = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

class UpstreamError extends Error {}

function asNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function asText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function joinText(...values: unknown[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(", ");
}

function validText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null;
}

function validCoord(value: unknown, limit: number): number | null {
  const n = typeof value === "number" ? value : null;
  return n !== null && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

function validPoint(value: unknown): { lat: number; lng: number } | null {
  const point = value as { lat?: unknown; lng?: unknown } | null;
  const lat = validCoord(point?.lat, 90);
  const lng = validCoord(point?.lng, 180);
  return lat === null || lng === null ? null : { lat, lng };
}

async function upstreamJson(url: string, init: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers ?? {}) },
      signal: controller.signal,
    });
    if (!response.ok) {
      // Status only: the body and the URL (which carries the key) stay out of logs and replies.
      throw new UpstreamError(`upstream status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError("upstream unreachable");
  } finally {
    clearTimeout(timer);
  }
}

function olaUrl(path: string, key: string, params: Record<string, string>) {
  const url = new URL(`https://api.olamaps.io${path}`);
  url.searchParams.set("api_key", key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
}

function mapplsUrl(host: "search" | "route", path: string, token: string, params: Record<string, string>) {
  const url = new URL(`https://${host}.mappls.com${path}`);
  url.searchParams.set("access_token", token);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.toString();
}

// ---- Ola ----

async function olaAutocomplete(key: string, input: string): Promise<Place[]> {
  const payload = await upstreamJson(olaUrl("/places/v1/autocomplete", key, { input }));
  const predictions = Array.isArray(payload?.predictions) ? payload.predictions : [];
  return predictions
    .map((p: any): Place => {
      const label = asText(p?.description);
      return {
        id: `ola:${asText(p?.place_id, label)}`,
        label,
        main: asText(p?.structured_formatting?.main_text, label.split(",")[0]),
        secondary: asText(p?.structured_formatting?.secondary_text),
        lat: asNumber(p?.geometry?.location?.lat),
        lng: asNumber(p?.geometry?.location?.lng),
      };
    })
    .filter((place: Place) => place.label);
}

async function olaGeocode(key: string, address: string): Promise<Place | null> {
  const payload = await upstreamJson(olaUrl("/places/v1/geocode", key, { address }));
  const first = payload?.geocodingResults?.[0];
  const lat = asNumber(first?.geometry?.location?.lat);
  const lng = asNumber(first?.geometry?.location?.lng);
  if (lat === null || lng === null) return null;
  const label = asText(first?.formatted_address, address);
  return { id: "ola:geocode", label, main: label.split(",")[0], secondary: "", lat, lng };
}

async function olaReverse(key: string, lat: number, lng: number): Promise<string | null> {
  const payload = await upstreamJson(
    olaUrl("/places/v1/reverse-geocode", key, { latlng: `${lat.toFixed(6)},${lng.toFixed(6)}` }),
  );
  return asText(payload?.results?.[0]?.formatted_address) || null;
}

async function olaDirections(
  key: string,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<Route | null> {
  const payload = await upstreamJson(
    olaUrl("/routing/v1/directions", key, {
      origin: `${from.lat},${from.lng}`,
      destination: `${to.lat},${to.lng}`,
    }),
    { method: "POST" },
  );
  const route = payload?.routes?.[0];
  const polyline = asText(route?.overview_polyline?.points, route?.overview_polyline);
  if (!polyline) return null;
  const legs: any[] = Array.isArray(route?.legs) ? route.legs : [];
  const sum = (field: string) => {
    const values = legs.map((leg) => asNumber(leg?.[field]));
    return values.length > 0 && values.every((v) => v !== null)
      ? (values as number[]).reduce((a, b) => a + b, 0)
      : null;
  };
  return { polyline, distanceMeters: sum("distance"), durationSeconds: sum("duration") };
}

// ---- Mappls ----

async function mapplsAutocomplete(token: string, input: string): Promise<Place[]> {
  const payload = await upstreamJson(
    mapplsUrl("search", "/search/places/autosuggest/json", token, { query: input, region: "IND" }),
  );
  const suggestions = Array.isArray(payload?.suggestedLocations)
    ? payload.suggestedLocations
    : Array.isArray(payload?.results)
    ? payload.results
    : [];
  return suggestions
    .map((s: any): Place => {
      const label = joinText(s?.placeName, s?.placeAddress, s?.address, s?.formattedAddress);
      return {
        id: `mappls:${asText(s?.eLoc, s?.eloc, s?.placeId, label)}`,
        label,
        main: asText(s?.placeName, s?.keyword, label),
        secondary: asText(s?.placeAddress, s?.address),
        lat: asNumber(s?.latitude, s?.lat, s?.entryLatitude, s?.entry_lat),
        lng: asNumber(s?.longitude, s?.lng, s?.entryLongitude, s?.entry_lon),
      };
    })
    .filter((place: Place) => place.label);
}

async function mapplsGeocode(token: string, address: string): Promise<Place | null> {
  const payload = await upstreamJson(mapplsUrl("search", "/search/address/geocode", token, { address }));
  const first = Array.isArray(payload?.copResults)
    ? payload.copResults[0]
    : Array.isArray(payload?.results)
    ? payload.results[0]
    : Array.isArray(payload)
    ? payload[0]
    : payload;
  const lat = asNumber(first?.latitude, first?.lat, first?.entryLatitude, first?.entry_lat);
  const lng = asNumber(first?.longitude, first?.lng, first?.entryLongitude, first?.entry_lon);
  if (lat === null || lng === null) return null;
  const label = joinText(first?.formatted_address, first?.placeName, first?.placeAddress) || address;
  return { id: "mappls:geocode", label, main: label.split(",")[0], secondary: "", lat, lng };
}

async function mapplsReverse(token: string, lat: number, lng: number): Promise<string | null> {
  const payload = await upstreamJson(
    mapplsUrl("search", "/search/address/rev-geocode", token, { lat: String(lat), lng: String(lng) }),
  );
  return asText(payload?.results?.[0]?.formatted_address) || null;
}

async function mapplsDirections(
  token: string,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<Route | null> {
  const path = `/route/direction/route_adv/driving/${from.lng},${from.lat};${to.lng},${to.lat}`;
  const payload = await upstreamJson(mapplsUrl("route", path, token, { geometries: "polyline" }));
  const route = payload?.routes?.[0];
  const polyline = asText(route?.geometry, route?.overview_polyline?.points, route?.overview_polyline);
  if (!polyline) return null;
  return {
    polyline,
    distanceMeters: asNumber(route?.distance),
    durationSeconds: asNumber(route?.duration),
  };
}

// Runs the first provider that is configured and gives a usable answer.
async function firstAnswer<T>(
  attempts: Array<(() => Promise<T>) | null>,
  isUsable: (value: T) => boolean,
  empty: T,
): Promise<{ value: T; failed: boolean }> {
  let failed = false;
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const value = await attempt();
      if (isUsable(value)) return { value, failed: false };
    } catch (error) {
      failed = true;
      console.error("maps-proxy upstream failure:", error instanceof Error ? error.message : "unknown");
    }
  }
  return { value: empty, failed };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    payload = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON payload" });
  }

  const op = payload.op as Op;
  if (typeof op !== "string" || !OPS.includes(op)) {
    return jsonResponse(400, { error: "Unknown op" });
  }

  const olaKey = Deno.env.get("OLA_MAPS_API_KEY")?.trim() || "";
  const mapplsToken = Deno.env.get("MAPPLS_ACCESS_TOKEN")?.trim() || "";
  if (!olaKey && !mapplsToken) {
    return jsonResponse(503, { error: "Map lookups are not configured" });
  }

  if (op === "autocomplete") {
    const input = validText(payload.input);
    if (!input) return jsonResponse(400, { error: "input must be 1 to 200 characters" });
    const { value, failed } = await firstAnswer<Place[]>(
      [
        olaKey ? () => olaAutocomplete(olaKey, input) : null,
        mapplsToken ? () => mapplsAutocomplete(mapplsToken, input) : null,
      ],
      (places) => places.length > 0,
      [],
    );
    if (value.length === 0 && failed) return jsonResponse(502, { error: "Lookup failed" });
    return jsonResponse(200, { places: value.slice(0, MAX_PLACES) });
  }

  if (op === "geocode") {
    const address = validText(payload.address);
    if (!address) return jsonResponse(400, { error: "address must be 1 to 200 characters" });
    const { value, failed } = await firstAnswer<Place | null>(
      [
        olaKey ? () => olaGeocode(olaKey, address) : null,
        mapplsToken ? () => mapplsGeocode(mapplsToken, address) : null,
      ],
      (place) => place !== null,
      null,
    );
    if (value === null && failed) return jsonResponse(502, { error: "Lookup failed" });
    return jsonResponse(200, { place: value });
  }

  if (op === "reverse") {
    const point = validPoint(payload);
    if (!point) return jsonResponse(400, { error: "lat and lng must be valid coordinates" });
    const { value, failed } = await firstAnswer<string | null>(
      [
        olaKey ? () => olaReverse(olaKey, point.lat, point.lng) : null,
        mapplsToken ? () => mapplsReverse(mapplsToken, point.lat, point.lng) : null,
      ],
      (address) => !!address,
      null,
    );
    if (value === null && failed) return jsonResponse(502, { error: "Lookup failed" });
    return jsonResponse(200, { address: value });
  }

  // directions
  const from = validPoint(payload.from);
  const to = validPoint(payload.to);
  if (!from || !to) return jsonResponse(400, { error: "from and to must be valid coordinates" });
  const { value, failed } = await firstAnswer<Route | null>(
    [
      olaKey ? () => olaDirections(olaKey, from, to) : null,
      mapplsToken ? () => mapplsDirections(mapplsToken, from, to) : null,
    ],
    (route) => route !== null,
    null,
  );
  if (value === null && failed) return jsonResponse(502, { error: "Lookup failed" });
  return jsonResponse(200, { route: value });
});
