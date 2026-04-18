import { useState } from 'react';
import { Car, MapPin, Clock, Star, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingFlow } from './BookingFlow';
import { useFixedRoutes, useLastBooking, tripTypeIcons } from '@/hooks/useSupabaseData';
import { useDriversPublic } from '@/hooks/useDriversPublic';
import { useOrg } from '@/hooks/useOrg';

type View = 'home' | 'booking';

export function CustomerHome() {
  const [view, setView] = useState<View>('home');
  const [repeatData, setRepeatData] = useState<typeof lastBooking>(null);
  const { org } = useOrg();
  const { data: routes = [], isLoading: routesLoading } = useFixedRoutes();
  const { data: drivers = [] } = useDriversPublic();
  const { data: lastBooking } = useLastBooking();

  const freeCount = drivers.filter(d => d.status === 'free').length;

  if (view === 'booking') return <BookingFlow onBack={() => { setRepeatData(null); setView('home'); }} initialData={repeatData} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary px-6 pt-12 pb-10 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Car className="h-5 w-5 text-secondary" />
            <span className="text-sm font-semibold text-secondary tracking-wide uppercase">{org?.brand_name ?? 'FleetOs'}</span>
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-1">Where to?</h1>
          <p className="text-primary-foreground/70 text-sm">Your most reliable rides</p>

          <div className="mt-6 space-y-3">
            {lastBooking && (
              <button onClick={() => { setRepeatData(lastBooking); setView('booking'); }} className="w-full text-left bg-primary-foreground/10 rounded-xl p-4 flex items-center justify-between gap-3 mb-3 border border-primary-foreground/20">
                <div>
                  <p className="text-xs text-primary-foreground/60 mb-1">Book again</p>
                  <p className="text-sm font-semibold text-primary-foreground">{tripTypeIcons[lastBooking.trip_type ?? 'city']} {lastBooking.pickup} → {lastBooking.drop}</p>
                  <p className="text-xs text-primary-foreground/50">₹{lastBooking.fare?.toLocaleString('en-IN')} · {new Date(lastBooking.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary-foreground/40 flex-shrink-0" />
              </button>
            )}
            <Button
              onClick={() => setView('booking')}
              className="w-full h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl text-base font-semibold justify-between px-5"
            >
              <span className="flex items-center gap-3">
                <Car className="h-5 w-5" />
                Book a Ride
              </span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-md mx-auto px-6 -mt-4">
        <Card className="p-4 shadow-elevated rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse-dot" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cars available now</p>
              <p className="text-lg font-bold">{freeCount}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
              <span className="text-sm font-semibold">4.7</span>
            </div>
            <p className="text-xs text-muted-foreground">Fleet rating</p>
          </div>
        </Card>
      </div>

      {/* Popular Routes from fixed_routes */}
      <div className="max-w-md mx-auto px-6 mt-8">
        <h2 className="text-lg font-bold mb-4">Popular Routes</h2>
        {routesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : routes.length === 0 ? (
          <Card className="p-6 shadow-card rounded-xl text-center text-sm text-muted-foreground">No routes configured yet</Card>
        ) : (
          <div className="space-y-3">
            {routes.map((route) => (
              <Card
                key={route.id}
                className="p-4 shadow-card rounded-xl cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => setView('booking')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-secondary" />
                      <div className="w-px h-6 bg-border" />
                      <MapPin className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{route.origin ?? '?'} → {route.destination ?? '?'}</p>
                      {route.per_km_rate && <p className="text-xs text-muted-foreground">₹{route.per_km_rate}/km</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{route.fixed_fare?.toLocaleString() ?? 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">est.</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent */}
      <div className="max-w-md mx-auto px-6 mt-8 pb-8">
        <h2 className="text-lg font-bold mb-4">Recent Rides</h2>
        <Card className="p-4 shadow-card rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">🚗</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">C-Scheme → Malviya Nagar</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Yesterday, 6:30 PM</span>
                <span>·</span>
                <span>₹180</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setView('booking')}>Rebook</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
