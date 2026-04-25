/**
 * OlaMapsView.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin live driver location map.
 *
 * Features:
 *  • Renders all drivers from useDrivers() on an Ola Maps map
 *  • Custom SVG markers colored by driver status (active/busy/offline)
 *  • Click a marker → sidebar card with driver details + active booking
 *  • Auto-refetches driver locations every 30s (React Query)
 *  • Filter bar: All / Active / Busy / Offline
 *  • Fit all drivers button
 *  • Handles drivers with no location (listed below map)
 *
 * Requires:
 *   • useOlaMaps (./useOlaMaps)
 *   • useDrivers, useBookings from useSupabaseData
 *   • Drivers table to have location_lat / location_lng columns
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useOlaMaps, type OlaMarkerOptions } from './useOlaMaps';
import { useDrivers, useBookings, type SupabaseDriver, type SupabaseBooking, getDriverInitials } from './useSupabaseData';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  active:  { color: '#22c55e', label: 'Active',  bg: '#f0fdf4' },
  busy:    { color: '#f59e0b', label: 'On Trip',  bg: '#fffbeb' },
  offline: { color: '#94a3b8', label: 'Offline', bg: '#f8fafc' },
};

function getStatusCfg(status: string | null) {
  return STATUS_CONFIG[status?.toLowerCase() ?? ''] ?? STATUS_CONFIG.offline;
}

// ─── Custom SVG marker element ────────────────────────────────────────────────

function createDriverMarkerEl(driver: SupabaseDriver): HTMLElement {
  const cfg     = getStatusCfg(driver.status);
  const initials = getDriverInitials(driver.name);

  const el = document.createElement('div');
  el.style.cssText = `
    width: 40px; height: 40px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  `;
  el.innerHTML = `
    <div style="
      width: 36px; height: 36px; border-radius: 50%;
      background: ${cfg.color}; color: #fff; font-size: 12px;
      font-weight: 700; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25); border: 2.5px solid #fff;
      font-family: system-ui, sans-serif; letter-spacing: 0.03em;
      transition: transform 0.15s;
    ">${initials}</div>
    <div style="
      position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid ${cfg.color};
    "></div>
  `;
  el.addEventListener('mouseenter', () => {
    const circle = el.querySelector('div') as HTMLElement;
    if (circle) circle.style.transform = 'scale(1.15)';
  });
  el.addEventListener('mouseleave', () => {
    const circle = el.querySelector('div') as HTMLElement;
    if (circle) circle.style.transform = 'scale(1)';
  });
  return el;
}

// ─── Driver sidebar card ──────────────────────────────────────────────────────

function DriverCard({
  driver,
  booking,
  onClose,
}: {
  driver: SupabaseDriver;
  booking: SupabaseBooking | undefined;
  onClose: () => void;
}) {
  const cfg = getStatusCfg(driver.status);
  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 100,
      width: 260, background: '#fff', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)', padding: 16,
      fontFamily: 'system-ui, sans-serif', border: '1px solid #e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: cfg.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14,
          }}>
            {getDriverInitials(driver.name)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{driver.name ?? 'Driver'}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{driver.phone ?? '—'}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {/* Status badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Vehicle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>🚗</span>
        <span style={{ fontSize: 12, color: '#334155' }}>{driver.vehicle_model ?? '—'} {driver.plate_number ? `· ${driver.plate_number}` : ''}</span>
      </div>

      {/* Active booking */}
      {booking && (
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Trip</div>
          <div style={{ fontSize: 12, color: '#1e293b', marginBottom: 4 }}>👤 {booking.customer_name ?? 'Customer'}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>📍 {booking.pickup}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>🏁 {booking.drop}</div>
          {booking.fare && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginTop: 6 }}>₹{booking.fare}</div>
          )}
        </div>
      )}

      {/* Location */}
      {driver.location_lat && driver.location_lng && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
          📡 {driver.location_lat.toFixed(4)}, {driver.location_lng.toFixed(4)}
        </div>
      )}
    </div>
  );
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'busy' | 'offline';

// ─── Main component ───────────────────────────────────────────────────────────

export function OlaMapsView() {
  const { data: drivers  = [], isLoading: driversLoading  } = useDrivers();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();

  const [filter,         setFilter]         = useState<StatusFilter>('all');
  const [selectedDriver, setSelectedDriver] = useState<SupabaseDriver | null>(null);
  const markersRef = useRef<Map<number, any>>(new Map());

  // ── Default center: first driver with location, else India center
  const defaultCenter = (() => {
    const d = drivers.find(d => d.location_lat && d.location_lng);
    return d ? { lat: d.location_lat!, lng: d.location_lng! } : { lat: 20.5937, lng: 78.9629 };
  })();

  const { containerRef, isLoaded, addMarker, fitBounds, flyTo } = useOlaMaps(defaultCenter, 6);

  const filteredDrivers = drivers.filter(d => {
    if (filter === 'all') return true;
    return (d.status?.toLowerCase() ?? 'offline') === filter;
  });

  const driversWithLocation    = filteredDrivers.filter(d => d.location_lat && d.location_lng);
  const driversWithoutLocation = filteredDrivers.filter(d => !d.location_lat || !d.location_lng);

  // ── Place markers
  const placeMarkers = useCallback(() => {
    if (!isLoaded) return;

    // Remove old markers
    markersRef.current.forEach(m => m?.remove?.());
    markersRef.current.clear();

    driversWithLocation.forEach(driver => {
      const el = createDriverMarkerEl(driver);
      const opts: OlaMarkerOptions = {
        lat: driver.location_lat!,
        lng: driver.location_lng!,
        element: el,
      };
      const marker = addMarker(opts);
      if (marker) {
        el.addEventListener('click', () => setSelectedDriver(driver));
        markersRef.current.set(driver.id, marker);
      }
    });
  }, [isLoaded, driversWithLocation, addMarker]);

  useEffect(() => { placeMarkers(); }, [placeMarkers]);

  // ── Fit all
  const handleFitAll = () => {
    const coords = driversWithLocation.map(d => [d.location_lng!, d.location_lat!] as [number, number]);
    if (coords.length > 0) fitBounds(coords, 80);
  };

  // ── Active booking for selected driver
  const activeBooking = bookings.find(
    b => b.driver_id === selectedDriver?.id && ['dispatched', 'in_progress', 'trip_started'].includes(b.status ?? '')
  );

  // ── Stats
  const counts = {
    total:   drivers.length,
    active:  drivers.filter(d => d.status?.toLowerCase() === 'active').length,
    busy:    drivers.filter(d => d.status?.toLowerCase() === 'busy').length,
    offline: drivers.filter(d => d.status?.toLowerCase() === 'offline').length,
  };

  const loading = driversLoading || bookingsLoading;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>🗺️ Live Driver Map</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Real-time driver locations · Auto-refreshes every 30s</p>
        </div>
        <button
          onClick={handleFitAll}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569' }}
        >
          ⊙ Fit All
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { key: 'total',   label: 'Total',    value: counts.total,   color: '#3b82f6', bg: '#eff6ff' },
          { key: 'active',  label: 'Active',   value: counts.active,  color: '#22c55e', bg: '#f0fdf4' },
          { key: 'busy',    label: 'On Trip',  value: counts.busy,    color: '#f59e0b', bg: '#fffbeb' },
          { key: 'offline', label: 'Offline',  value: counts.offline, color: '#94a3b8', bg: '#f8fafc' },
        ].map(stat => (
          <div key={stat.key} style={{ background: stat.bg, borderRadius: 10, padding: '8px 14px', border: `1.5px solid ${stat.color}22`, minWidth: 80 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'active', 'busy', 'offline'] as StatusFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: filter === f ? `1.5px solid ${f === 'all' ? '#3b82f6' : STATUS_CONFIG[f]?.color ?? '#3b82f6'}` : '1.5px solid #e2e8f0',
              background: filter === f ? (f === 'all' ? '#eff6ff' : STATUS_CONFIG[f]?.bg ?? '#eff6ff') : '#fff',
              color: filter === f ? (f === 'all' ? '#3b82f6' : STATUS_CONFIG[f]?.color ?? '#3b82f6') : '#64748b',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All Drivers' : STATUS_CONFIG[f]?.label}
          </button>
        ))}
      </div>

      {/* ── Map ── */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 500, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Driver card sidebar */}
        {selectedDriver && (
          <DriverCard
            driver={selectedDriver}
            booking={activeBooking}
            onClose={() => setSelectedDriver(null)}
          />
        )}

        {/* No location banner */}
        {!loading && driversWithLocation.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(248,250,252,0.9)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>📡</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>No driver locations available</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Drivers need to share their location in the driver app</span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(248,250,252,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
      </div>

      {/* ── Drivers without location ── */}
      {driversWithoutLocation.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📵 No Location Data ({driversWithoutLocation.length})
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {driversWithoutLocation.map(d => {
              const cfg = getStatusCfg(d.status);
              return (
                <div key={d.id} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: '#fff', borderRadius: 10, padding: '8px 12px',
                  border: '1.5px solid #e2e8f0', minWidth: 180,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                    {getDriverInitials(d.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: cfg.color }}>{cfg.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OlaMapsView;
