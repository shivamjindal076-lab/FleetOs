import { useEffect, useState } from 'react';
import { Car, ChevronRight, Clock, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FleetMark } from '@/components/FleetMark';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { BookingFlow } from './BookingFlow';
import { TrackBooking } from './TrackBooking';
import { useFixedRoutes, useLastBooking } from '@/hooks/useSupabaseData';
import { useDriversPublic } from '@/hooks/useDriversPublic';
import { useOrg } from '@/hooks/useOrg';
import { isClosedStatus, useBookingStatus } from '@/hooks/useBookingStatus';
import { telHref, whatsappHref } from '@/lib/contact';
import { resolveHighlights } from '@/lib/fleetHighlights';
import {
  clearSavedTrackingToken,
  clearTrackingTokenFromUrl,
  readSavedTrackingToken,
  readTrackingTokenFromUrl,
} from '@/lib/trackingStorage';

type View = 'home' | 'booking' | 'track';

interface CustomerHomeProps {
  /** Quiet sign-in links at the foot of the page. Left out for signed-in staff, who have their own switcher. */
  staffLinks?: { onDriver: () => void; onOwner: () => void };
}

const clean = (value: string | null | undefined) => value?.trim() || null;

export function CustomerHome({ staffLinks }: CustomerHomeProps = {}) {
  // A tracking link (?track=<token>) opens the live map straight away.
  const [trackToken, setTrackToken] = useState<string | null>(() => readTrackingTokenFromUrl());
  const [view, setView] = useState<View>(() => (readTrackingTokenFromUrl() ? 'track' : 'home'));
  const [savedToken] = useState<string | null>(() => readSavedTrackingToken());
  const [repeatData, setRepeatData] = useState<typeof lastBooking>(null);
  const { org } = useOrg();
  const { data: routes = [] } = useFixedRoutes();
  const { data: drivers = [] } = useDriversPublic();
  const { data: lastBooking } = useLastBooking();

  const freeCount = drivers.filter(d => d.status === 'free').length;

  // The latest booking made on this device, offered as "Track your ride" while it is still open.
  const { data: savedBooking } = useBookingStatus(view === 'home' ? savedToken : null, { poll: false });
  const savedBookingClosed = savedBooking === null || isClosedStatus(savedBooking?.status);
  useEffect(() => {
    if (savedToken && savedBookingClosed) clearSavedTrackingToken();
  }, [savedToken, savedBookingClosed]);

  const closeTracking = () => {
    clearTrackingTokenFromUrl();
    setTrackToken(null);
    setView('home');
  };

  if (view === 'track' && trackToken) {
    return (
      <div className="min-h-screen bg-background px-6 py-6">
        <div className="max-w-md mx-auto">
          <TrackBooking token={trackToken} onDone={closeTracking} />
        </div>
      </div>
    );
  }

  if (view === 'booking') return <BookingFlow onBack={() => { setRepeatData(null); setView('home'); }} initialData={repeatData} />;

  const brandName = clean(org?.brand_name);
  const tagline = clean(org?.tagline);
  const welcome = clean(org?.welcome_message);
  const serviceArea = clean(org?.service_area);
  const serviceHours = clean(org?.service_hours);
  const highlights = resolveHighlights(org?.highlights);
  const call = telHref(org?.support_phone);
  const whatsapp = whatsappHref(org?.whatsapp_phone);
  const listedRoutes = routes.filter(r => r.origin && r.destination);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="bg-primary px-6 pt-12 pb-8 rounded-b-xl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <FleetMark name={brandName} logoUrl={org?.brand_logo_url} size="md" />
            {brandName && (
              <span className="text-base font-semibold text-primary-foreground break-words min-w-0">{brandName}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Where to?</h1>
          {tagline && <p className="mt-1 text-sm text-primary-foreground/80">{tagline}</p>}
          {freeCount > 0 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/80">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" aria-hidden />
              {freeCount === 1 ? '1 car available now' : `${freeCount} cars available now`}
            </p>
          )}

          <div className="mt-6 space-y-3">
            {lastBooking?.pickup && lastBooking.drop && (
              <button
                onClick={() => { setRepeatData(lastBooking); setView('booking'); }}
                className="w-full min-h-[56px] text-left bg-primary-foreground/10 rounded-xl p-4 flex items-center justify-between gap-3 border border-primary-foreground/20"
              >
                <div className="min-w-0">
                  <p className="text-xs text-primary-foreground/80 mb-1">Book again</p>
                  <p className="text-sm font-semibold text-primary-foreground flex items-center gap-2">
                    <TripTypeIcon type={lastBooking.trip_type ?? 'city'} className="h-4 w-4" />
                    <span className="truncate">{lastBooking.pickup} to {lastBooking.drop}</span>
                  </p>
                  {lastBooking.fare != null && (
                    <p className="text-xs text-primary-foreground/80 mt-1">
                      ₹{lastBooking.fare.toLocaleString('en-IN')} · {new Date(lastBooking.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-primary-foreground/80 shrink-0" />
              </button>
            )}
            <Button
              onClick={() => setView('booking')}
              className="w-full h-14 bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-xl text-base font-semibold justify-between px-4"
            >
              <span className="flex items-center gap-3">
                <Car className="h-5 w-5" />
                Book a ride
              </span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto px-6 pt-8 pb-8 space-y-8 flex-1">
        {savedToken && savedBooking && !savedBookingClosed && (
          <button
            onClick={() => { setTrackToken(savedToken); setView('track'); }}
            className="w-full min-h-[56px] text-left bg-card rounded-xl p-4 flex items-center justify-between gap-3 border"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Track your ride</p>
                <p className="text-xs text-muted-foreground truncate">
                  {savedBooking.driver ? `${savedBooking.driver.name ?? 'Your driver'} is assigned` : 'Finding your driver'} · #{savedBooking.id}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        )}

        {welcome && <p className="text-base leading-relaxed text-foreground">{welcome}</p>}

        {highlights.length > 0 && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {highlights.map(h => (
              <li key={h.id} className="flex items-start gap-2 text-sm text-foreground">
                <h.icon className="h-4 w-4 mt-0.5 text-primary shrink-0" aria-hidden />
                <span>{h.label}</span>
              </li>
            ))}
          </ul>
        )}

        {(serviceArea || serviceHours) && (
          <div className="space-y-3 text-sm">
            {serviceArea && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Service area</p>
                  <p className="text-foreground">{serviceArea}</p>
                </div>
              </div>
            )}
            {serviceHours && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-foreground">{serviceHours}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {listedRoutes.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3">Popular routes</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {listedRoutes.map(route => (
                <li key={route.id}>
                  <button
                    onClick={() => setView('booking')}
                    className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{route.origin} to {route.destination}</span>
                      {route.per_km_rate ? <span className="block text-xs text-muted-foreground">₹{route.per_km_rate}/km</span> : null}
                    </span>
                    {route.fixed_fare != null && (
                      <span className="text-sm font-semibold shrink-0">₹{route.fixed_fare.toLocaleString('en-IN')}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(call || whatsapp) && (
          <section>
            <h2 className="text-base font-semibold mb-3">Need help?</h2>
            <div className="grid grid-cols-2 gap-3">
              {call && (
                <Button asChild variant="outline" className="h-12 rounded-xl">
                  <a href={call}><Phone className="h-4 w-4" /> Call</a>
                </Button>
              )}
              {whatsapp && (
                <Button asChild variant="outline" className="h-12 rounded-xl">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                </Button>
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="max-w-md w-full mx-auto px-6 pb-8 text-center">
        {staffLinks && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <button onClick={staffLinks.onDriver} className="min-h-[44px] px-3 underline-offset-4 hover:underline">
              Driver sign-in
            </button>
            <span aria-hidden>·</span>
            <button data-testid="open-login" onClick={staffLinks.onOwner} className="min-h-[44px] px-3 underline-offset-4 hover:underline">
              Owner sign-in
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Powered by FleetOs</p>
      </footer>
    </div>
  );
}
