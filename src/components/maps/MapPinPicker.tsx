import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, MapPin, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  loadLeaflet,
  olaGeocode,
  olaReverseGeocode,
  rememberPlaceCoords,
} from '@/lib/olaMaps';
import { formatCoords, type LatLng } from '@/lib/mapsProxy';

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
}

interface MapPinPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Text already in the field. The map opens on it when it can be found. */
  initialAddress?: string;
  title?: string;
  onConfirm: (location: PickedLocation) => void;
}

// The small part of the Leaflet map this sheet uses.
interface LeafletMap {
  setView: (center: [number, number], zoom: number, options?: { animate?: boolean }) => void;
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  invalidateSize: () => void;
  fire: (event: string) => void;
  on: (event: string, handler: () => void) => void;
  remove: () => void;
}

const DEFAULT_CENTER: LatLng = { lat: 26.9124, lng: 75.7873 };
const SETTLE_MS = 600;
const REVERSE_LIMIT_MS = 12000;

async function deviceLocationIfGranted(): Promise<LatLng | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) return null;
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (status.state !== 'granted') return null;
    return await new Promise<LatLng | null>(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 },
      );
    });
  } catch {
    return null;
  }
}

type AddressState = { status: 'loading' } | { status: 'ready'; address: string | null };

function PickerBody({
  initialAddress,
  title,
  onConfirm,
}: {
  initialAddress: string;
  title: string;
  onConfirm: (location: PickedLocation) => void;
}) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const userMovedRef = useRef(false);
  const requestRef = useRef(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [centre, setCentre] = useState<LatLng>(DEFAULT_CENTER);
  const [addressState, setAddressState] = useState<AddressState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let settleTimer: number | undefined;
    let map: LeafletMap | undefined;

    const lookUp = (point: LatLng) => {
      const requestId = ++requestRef.current;
      setAddressState({ status: 'loading' });
      const limit = new Promise<null>(resolve => window.setTimeout(() => resolve(null), REVERSE_LIMIT_MS));
      void Promise.race([olaReverseGeocode(point.lat, point.lng), limit]).then(address => {
        if (cancelled || requestId !== requestRef.current) return;
        setAddressState({ status: 'ready', address });
      });
    };

    loadLeaflet()
      .then(() => {
        if (cancelled || !mapElRef.current || !window.L) return;
        const L = window.L;
        map = L.map(mapElRef.current, { zoomControl: false, attributionControl: false });
        mapRef.current = map;
        L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map).addAttribution(OSM_ATTRIBUTION);
        map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);

        map.on('dragstart', () => {
          userMovedRef.current = true;
        });
        map.on('movestart', () => {
          window.clearTimeout(settleTimer);
          requestRef.current += 1;
          setAddressState({ status: 'loading' });
        });
        map.on('moveend', () => {
          const c = map.getCenter();
          const point = { lat: c.lat, lng: c.lng };
          setCentre(point);
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(() => lookUp(point), SETTLE_MS);
        });

        window.setTimeout(() => map?.invalidateSize?.(), 150);

        // Start where the field points, else where the device is (only if already allowed), else the default.
        void (async () => {
          let start: LatLng | null = null;
          if (initialAddress.trim()) {
            const found = await olaGeocode(initialAddress);
            if (found) start = { lat: found.lat, lng: found.lng };
          }
          if (!start) start = await deviceLocationIfGranted();
          if (cancelled || userMovedRef.current) return;
          if (start) map.setView([start.lat, start.lng], 16, { animate: false });
          else map.fire('moveend');
        })();
      })
      .catch(() => {
        if (!cancelled) setMapError("The map couldn't load. Close this and type the address instead.");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
      try {
        map?.remove?.();
      } catch {
        // The map may already be gone.
      }
      mapRef.current = null;
    };
    // The picker opens fresh each time, so the starting address is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (delta: number) => {
    userMovedRef.current = true;
    mapRef.current?.setZoom?.((mapRef.current.getZoom?.() ?? 12) + delta);
  };

  const resolving = addressState.status === 'loading';
  const address = addressState.status === 'ready' ? addressState.address : null;

  const confirm = () => {
    if (resolving || mapError) return;
    const text = address ?? formatCoords(centre.lat, centre.lng);
    rememberPlaceCoords(text, centre.lat, centre.lng);
    onConfirm({ address: text, lat: centre.lat, lng: centre.lng });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <DialogPrimitive.Title className="truncate text-base font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-xs text-muted-foreground">
            Move the map so the pin sits on the exact spot.
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close
          aria-label="Close map"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden />
        </DialogPrimitive.Close>
      </div>

      <div className="relative isolate min-h-0 flex-1 bg-muted">
        <div ref={mapElRef} className="absolute inset-0" aria-label="Map" />

        {/* The pin tip sits on the exact centre of the map. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-10 w-10 fill-destructive text-white drop-shadow-md" strokeWidth={1.5} aria-hidden />
        </div>

        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomBy(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-background shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomBy(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-background shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Minus className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {mapError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/95 px-6 text-center text-sm text-muted-foreground">
            {mapError}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="min-h-[2.5rem]" aria-live="polite">
          {resolving ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Finding the address
            </p>
          ) : address ? (
            <p className="line-clamp-2 text-sm font-medium text-foreground">{address}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              We couldn't read an address here. You can still use this spot.
            </p>
          )}
        </div>
        <Button
          type="button"
          onClick={confirm}
          disabled={resolving || !!mapError}
          className="h-12 w-full rounded-full text-base font-semibold"
        >
          Confirm this location
        </Button>
      </div>
    </>
  );
}

export function MapPinPicker({ open, onOpenChange, initialAddress = '', title = 'Choose on map', onConfirm }: MapPinPickerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-[60] flex h-[100dvh] w-screen flex-col bg-background focus:outline-none"
        >
          <PickerBody
            initialAddress={initialAddress}
            title={title}
            onConfirm={(location) => {
              onConfirm(location);
              onOpenChange(false);
            }}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
