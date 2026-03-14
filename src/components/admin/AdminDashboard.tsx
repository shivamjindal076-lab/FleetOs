import { useState } from 'react';
import { Car, MapPin, Calendar, Users, Clock, Phone, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDrivers, useBookings, tripTypeIcons, getDriverInitials, type SupabaseBooking } from '@/hooks/useSupabaseData';
import { DispatchEngine } from './DispatchEngine';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

type Tab = 'today' | 'fleet';

const statusColors: Record<string, string> = {
  free: 'bg-success',
  'on-trip': 'bg-secondary',
  offline: 'bg-destructive',
};

const bookingStatusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  confirmed: 'bg-success/10 text-success border-success/30',
  'in-progress': 'bg-secondary/10 text-secondary-foreground border-secondary/30',
};

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('today');
  const [dispatchBooking, setDispatchBooking] = useState<SupabaseBooking | null>(null);

  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();

  const freeCount = drivers.filter(d => d.status === 'free').length;
  const onTripCount = drivers.filter(d => d.status === 'on-trip').length;
  const offlineCount = drivers.filter(d => d.status === 'offline').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const scheduledToday = bookings.filter(b => b.scheduled_at && b.status !== 'pending');
  const today = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => b.scheduled_at && b.scheduled_at > today);

  const isLoading = driversLoading || bookingsLoading;

  // Find driver name by id
  const getDriverName = (driverId: number | null) => {
    if (!driverId) return null;
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name ?? null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-5 w-5 text-secondary" />
                <span className="text-sm font-semibold text-secondary tracking-wide uppercase">Anil's Cabs — Admin</span>
              </div>
              <h1 className="text-xl font-bold text-primary-foreground">Dashboard</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-foreground/60">Today</p>
              <p className="text-sm font-semibold text-primary-foreground">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Free', count: freeCount, color: 'bg-success', icon: Car },
              { label: 'On Trip', count: onTripCount, color: 'bg-secondary', icon: Activity },
              { label: 'Offline', count: offlineCount, color: 'bg-destructive', icon: Users },
              { label: 'Pending', count: pendingBookings.length, color: 'bg-warning', icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="bg-primary-foreground/5 rounded-xl p-3 text-center">
                <div className={`h-2 w-2 rounded-full ${stat.color} mx-auto mb-1.5`} />
                <p className="text-lg font-bold text-primary-foreground">{isLoading ? '-' : stat.count}</p>
                <p className="text-[10px] text-primary-foreground/60 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 -mt-3">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'today' as Tab, label: "Today's Board", icon: Calendar },
            { id: 'fleet' as Tab, label: 'Fleet Health', icon: Car },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                tab === t.id ? 'bg-card shadow-elevated text-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && tab === 'today' && (
          <div className="space-y-6 pb-8">
            {/* Live Map placeholder */}
            <Card className="p-5 shadow-card rounded-xl">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" /> Live Map
              </h3>
              <div className="h-48 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="text-sm text-muted-foreground">Map View — Jaipur</div>
                {drivers.filter(d => d.status !== 'offline').map((driver, i) => (
                  <div
                    key={driver.id}
                    className="absolute"
                    style={{ top: `${20 + i * 30}%`, left: `${15 + i * 18}%` }}
                  >
                    <div className="relative group cursor-pointer">
                      <div className={`h-3 w-3 rounded-full ${statusColors[driver.status ?? 'offline']} ${driver.status === 'free' ? 'animate-pulse-dot' : ''}`} />
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-card px-1.5 py-0.5 rounded text-[9px] font-semibold shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                        {driver.name?.split(' ')[0] ?? 'Unknown'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Free</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary" />On Trip</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Offline</span>
              </div>
            </Card>

            {/* Instant Queue */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-destructive" /> Instant Queue
                {pendingBookings.length > 0 && (
                  <span className="h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">{pendingBookings.length}</span>
                )}
              </h3>
              {pendingBookings.length === 0 && (
                <Card className="p-6 shadow-card rounded-xl text-center text-sm text-muted-foreground">No pending bookings</Card>
              )}
              <div className="space-y-2">
                {pendingBookings.map((booking) => (
                  <Card key={booking.id} className="p-4 shadow-card rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tripTypeIcons[booking.trip_type ?? 'city']}</span>
                        <div>
                          <p className="text-sm font-semibold">{booking.customer_name ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{booking.pickup ?? '?'} → {booking.drop ?? '?'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{booking.fare ?? 0}</p>
                        <Badge variant="outline" className={bookingStatusStyles[booking.status ?? 'pending']}>{booking.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg flex-1 text-xs" onClick={() => setDispatchBooking(booking)}>Assign Driver</Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-xs">
                        <Phone className="h-3 w-3 mr-1" />Call
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Scheduled Today */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary" /> Scheduled Today
              </h3>
              <div className="space-y-2">
                {scheduledToday.filter(b => b.scheduled_at?.startsWith(today)).map((booking) => (
                  <Card key={booking.id} className="p-4 shadow-card rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tripTypeIcons[booking.trip_type ?? 'city']}</span>
                        <div>
                          <p className="text-sm font-semibold">{booking.pickup ?? '?'} → {booking.drop ?? '?'}</p>
                          <p className="text-xs text-muted-foreground">{booking.customer_name} · {booking.scheduled_at?.split('T')[1]?.slice(0,5)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">₹{booking.fare ?? 0}</p>
                        <p className="text-xs text-muted-foreground">{getDriverName(booking.driver_id) ?? 'Unassigned'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Upcoming */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Upcoming (7 Days)
              </h3>
              <div className="space-y-2">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="p-4 shadow-card rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tripTypeIcons[booking.trip_type ?? 'city']}</span>
                        <div>
                          <p className="text-sm font-semibold">{booking.pickup ?? '?'} → {booking.drop ?? '?'}</p>
                          <p className="text-xs text-muted-foreground">{booking.customer_name} · {booking.scheduled_at?.split('T')[0]}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold">₹{(booking.fare ?? 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{getDriverName(booking.driver_id) ?? 'Unassigned'}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && tab === 'fleet' && (
          <div className="space-y-3 pb-8">
            {drivers.length === 0 && (
              <Card className="p-6 shadow-card rounded-xl text-center text-sm text-muted-foreground">No drivers found. Add drivers in Supabase.</Card>
            )}
            {drivers.map((driver) => (
              <Card key={driver.id} className="p-4 shadow-card rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {getDriverInitials(driver.name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${statusColors[driver.status ?? 'offline']} border-2 border-card`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{driver.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{driver.vehicle_model ?? 'N/A'} · {driver.plate_number ?? 'N/A'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium capitalize">{(driver.status ?? 'offline').replace('-', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg">
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DispatchEngine
        booking={dispatchBooking}
        open={!!dispatchBooking}
        onClose={() => setDispatchBooking(null)}
        onAssign={(bookingId, driverId) => console.log('Assigned', bookingId, driverId)}
      />
    </div>
  );
}
