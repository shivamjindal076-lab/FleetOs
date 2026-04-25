/**
 * LocationPicker.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer-facing location search powered by Ola Maps Autocomplete API.
 *
 * Features:
 *  • Debounced autocomplete suggestions as the user types
 *  • Click a suggestion → pin drops on map + parent callback fires
 *  • "Use my current location" GPS button
 *  • Fully controlled (value/onChange) so it slots into any booking form
 *
 * Props:
 *   value          – current selected location object (or null)
 *   onChange       – called when a location is selected
 *   placeholder    – input placeholder text
 *   label          – optional field label
 *   markerColor    – hex color for the map pin (default #22c55e for pickup,
 *                    pass #ef4444 for drop)
 *   showMap        – whether to render the mini-map below the input (default true)
 *   mapHeight      – height of the mini-map in px (default 200)
 *
 * Usage in BookingForm:
 *   <LocationPicker
 *     label="Pickup"
 *     placeholder="Search pickup location…"
 *     markerColor="#22c55e"
 *     value={pickup}
 *     onChange={setPickup}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useOlaMaps,
  olaAutocomplete,
  olaPlaceDetails,
  type OlaPlacePrediction,
} from './useOlaMaps';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedLocation {
  placeId:  string;
  address:  string;
  lat:      number;
  lng:      number;
}

interface LocationPickerProps {
  value:        SelectedLocation | null;
  onChange:     (loc: SelectedLocation | null) => void;
  placeholder?: string;
  label?:       string;
  markerColor?: string;
  showMap?:     boolean;
  mapHeight?:   number;
  className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocationPicker({
  value,
  onChange,
  placeholder   = 'Search location…',
  label,
  markerColor   = '#22c55e',
  showMap       = true,
  mapHeight     = 200,
  className     = '',
}: LocationPickerProps) {
  const [query,        setQuery]       = useState(value?.address ?? '');
  const [suggestions,  setSuggestions] = useState<OlaPlacePrediction[]>([]);
  const [open,         setOpen]        = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [gpsLoading,   setGpsLoading]  = useState(false);
  const debounceRef    = useRef<ReturnType<typeof setTimeout>>();
  const markerRef      = useRef<any>(null);

  const { containerRef, mapInstance, isLoaded, addMarker, flyTo } = useOlaMaps(
    value ? { lat: value.lat, lng: value.lng } : { lat: 20.5937, lng: 78.9629 },
    value ? 14 : 5
  );

  // ── Keep query in sync when value changes externally
  useEffect(() => {
    setQuery(value?.address ?? '');
  }, [value?.address]);

  // ── Place / update marker when value changes
  useEffect(() => {
    if (!isLoaded || !value) return;
    markerRef.current?.remove?.();
    markerRef.current = addMarker({
      lat:   value.lat,
      lng:   value.lng,
      color: markerColor,
      label: `<span style="font-size:12px">${value.address}</span>`,
    });
    flyTo(value.lat, value.lng, 15);
  }, [isLoaded, value, addMarker, flyTo, markerColor]);

  // ── Debounced autocomplete
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(null); // clear selection while typing
    clearTimeout(debounceRef.current);
    if (v.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const preds = await olaAutocomplete(v);
        setSuggestions(preds);
        setOpen(preds.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 300);
  };

  // ── Select a suggestion
  const handleSelect = useCallback(async (pred: OlaPlacePrediction) => {
    setOpen(false);
    setQuery(pred.description);
    setLoading(true);
    try {
      const detail = await olaPlaceDetails(pred.place_id);
      if (detail) {
        onChange({ placeId: pred.place_id, address: pred.description, lat: detail.lat, lng: detail.lng });
      }
    } finally { setLoading(false); }
  }, [onChange]);

  // ── GPS button
  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode via Ola
        try {
          const res  = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${import.meta.env.VITE_OLA_MAPS_API_KEY}`);
          const json = await res.json();
          const addr = json.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const loc: SelectedLocation = { placeId: 'gps', address: addr, lat, lng };
          setQuery(addr);
          onChange(loc);
        } catch {
          onChange({ placeId: 'gps', address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        } finally { setGpsLoading(false); }
      },
      () => setGpsLoading(false)
    );
  };

  return (
    <div className={`lp-root ${className}`} style={{ position: 'relative', fontFamily: 'inherit' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}

      {/* ── Search input row ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Pin icon */}
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: markerColor, fontSize: 16, pointerEvents: 'none' }}>
            📍
          </span>
          <input
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '10px 36px 10px 34px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 14,
              background: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = markerColor)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = value ? markerColor : '#e2e8f0')}
          />
          {/* Loading spinner */}
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8' }}>⟳</span>
          )}
          {/* Clear button */}
          {value && !loading && (
            <button
              onClick={() => { setQuery(''); onChange(null); markerRef.current?.remove?.(); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 2 }}
            >×</button>
          )}
        </div>

        {/* GPS button */}
        <button
          onClick={handleGPS}
          disabled={gpsLoading}
          title="Use my location"
          style={{
            width: 40, height: 40, borderRadius: 10,
            border: '1.5px solid #e2e8f0', background: '#fff',
            cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = markerColor; e.currentTarget.style.background = '#f0fdf4'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
        >
          {gpsLoading ? '⟳' : '🎯'}
        </button>
      </div>

      {/* ── Autocomplete dropdown ── */}
      {open && (
        <ul style={{
          position: 'absolute', zIndex: 9999, top: label ? 'calc(100% + 2px)' : 'calc(100% + 2px)',
          left: 0, right: 48,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0', margin: 0,
          listStyle: 'none', maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map(pred => (
            <li
              key={pred.place_id}
              onMouseDown={() => handleSelect(pred)}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                {pred.structured_formatting?.main_text ?? pred.description}
              </span>
              {pred.structured_formatting?.secondary_text && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{pred.structured_formatting.secondary_text}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Mini-map ── */}
      {showMap && (
        <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', height: mapHeight, border: '1.5px solid #e2e8f0' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}

export default LocationPicker;
