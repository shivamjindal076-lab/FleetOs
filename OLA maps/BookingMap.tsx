/**
 * BookingMap.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows a route map for a single booking (pickup → drop).
 *
 * Props:
 *   pickup   – pickup address string  OR { lat, lng }
 *   drop     – drop address string    OR { lat, lng }
 *   height   – map container height (default 320px)
 *   className
 *
 * Geocodes string addresses via Ola Geocode API.
 * Draws a route polyline via Ola Directions API.
 * Shows green marker for pickup, red for drop.
 * Displays a distance/duration badge overlay.
 *
 * Usage:
 *   <BookingMap pickup="Connaught Place, Delhi" drop="IGI Airport, Delhi" />
 *   <BookingMap pickup={{ lat: 28.63, lng: 77.22 }} drop={{ lat: 28.55, lng: 77.09 }} />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import { useOlaMaps, olaGeocode, olaDirections, type OlaRoute } from './useOlaMaps';

// ─── Types ────────────────────────────────────────────────────────────────────

type LatLng = { lat: number; lng: number };
type LocationInput = string | LatLng;

interface BookingMapProps {
  pickup:    LocationInput;
  drop:      LocationInput;
  height?:   number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingMap({ pickup, drop, height = 320, className = '' }: BookingMapProps) {
  const [route,    setRoute]    = useState<OlaRoute | null>(null);
  const [status,   setStatus]   = useState<'loading' | 'ready' | 'error'>('loading');
  const pickupMarkerRef = useRef<any>(null);
  const dropMarkerRef   = useRef<any>(null);
  const routeLayerRef   = useRef<string | null>(null);

  const { containerRef, isLoaded, addMarker, drawRoute, removeRoute, fitBounds } = useOlaMaps(
    { lat: 20.5937, lng: 78.9629 }, 5
  );

  // ── Resolve a LocationInput to LatLng
  async function resolve(loc: LocationInput): Promise<LatLng | null> {
    if (typeof loc === 'object') return loc;
    return olaGeocode(loc);
  }

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    (async () => {
      setStatus('loading');
      try {
        const [p, d] = await Promise.all([resolve(pickup), resolve(drop)]);
        if (cancelled || !p || !d) { setStatus('error'); return; }

        // Markers
        pickupMarkerRef.current?.remove?.();
        dropMarkerRef.current?.remove?.();
        pickupMarkerRef.current = addMarker({
          lat: p.lat, lng: p.lng, color: '#22c55e',
          label: `<b style="font-size:12px">📍 Pickup</b><br/><span style="font-size:11px">${typeof pickup === 'string' ? pickup : ''}</span>`,
        });
        dropMarkerRef.current = addMarker({
          lat: d.lat, lng: d.lng, color: '#ef4444',
          label: `<b style="font-size:12px">🏁 Drop</b><br/><span style="font-size:11px">${typeof drop === 'string' ? drop : ''}</span>`,
        });

        // Directions
        const r = await olaDirections(p, d);
        if (cancelled) return;
        if (r?.polyline) {
          if (routeLayerRef.current) removeRoute(routeLayerRef.current);
          routeLayerRef.current = drawRoute(r.polyline, '#3b82f6');
          setRoute(r);
        }

        // Fit map
        fitBounds([[p.lng, p.lat], [d.lng, d.lat]], 80);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, JSON.stringify(pickup), JSON.stringify(drop)]);

  return (
    <div
      className={className}
      style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height, border: '1.5px solid #e2e8f0' }}
    >
      {/* Map canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(248,250,252,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>Loading route…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(248,250,252,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#ef4444' }}>⚠️ Could not load route</span>
        </div>
      )}

      {/* Route badge */}
      {route && status === 'ready' && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          borderRadius: 20, padding: '6px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          display: 'flex', gap: 16, alignItems: 'center',
          fontSize: 13, fontWeight: 600, color: '#1e293b',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <span>🛣️ {route.distanceText}</span>
          <span style={{ width: 1, height: 14, background: '#e2e8f0' }} />
          <span>⏱ {route.durationText}</span>
        </div>
      )}
    </div>
  );
}

export default BookingMap;
