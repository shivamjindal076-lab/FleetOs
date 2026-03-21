declare global {
  interface Window {
    mappls: any;
  }
}
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Car, MapPin, Calendar, Users, Clock, Phone, ChevronRight, Activity, Loader2, CheckCircle, Plus, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDrivers, useBookings, useTodayCashHandovers, useDriverCollections, tripTypeIcons, tripTypeLabels, getDriverInitials, type SupabaseBooking, type SupabaseDriver } from '@/hooks/useSupabaseData';import { DispatchEngine } from './DispatchEngine';
import { PaymentSummary } from './PaymentSummary';
import { CollectionsHistory } from './CollectionsHistory';
import { NewBookingSheet } from './NewBookingSheet';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tab = 'today' | 'fleet' | 'collections';

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

const getPaymentBadge = (booking: SupabaseBooking) => {
  if (!booking.payment_confirmed_at) return 'pending';
  const collected = booking.amount_collected ?? 0;
  const fare = booking.fare ?? 0;
  if (collected >= fare) return 'paid';
  if (collected > 0) return 'partial';
  return 'unpaid';
};
function PendingHandovers() {
  const queryClient = useQueryClient();
  const { data: drivers = [] } = useDrivers();
  const [handovers, setHandovers] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const client = supabase as any;
      const res = await client
        .from('cash_handovers')
        .select('*')
        .eq('admin_approved', false)
        .order('handed_over_at', { ascending: false });
      setHandovers(res.data || []);
    };
    fetch();
  }, []);

  const getDriverName = (id: number) => drivers.find(d => d.id === id)?.name ?? 'Unknown';

  if (handovers.length === 0) return null;

  return (
    <Card className="p-5 shadow-card rounded-xl">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-warning" />
        Pending Handovers ({handovers.length})
      </h3>
      <div className="space-y-2">
        {handovers.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div>
              <p className="text-sm font-semibold">{getDriverName(h.driver_id)}</p>
              <p className="text-xs text-muted-foreground">
                ₹{h.amount.toLocaleString('en-IN')} · {new Date(h.handed_over_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-success text-success-foreground hover:bg-success/90 rounded-lg text-xs"
                onClick={async () => {
                  await (supabase.from('cash_handovers' as any) as any)
                    .update({ admin_approved: true })
                    .eq('id', h.id);
                  setHandovers(prev => prev.filter(x => x.id !== h.id));
                  queryClient.invalidateQueries({ queryKey: ['pending-handovers'] });
                  toast('Handover approved ✓');
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                onClick={async () => {
                  await (supabase.from('cash_handovers' as any) as any)
                    .update({ admin_notes: 'Flagged for review' })
                    .eq('id', h.id);
                  setHandovers(prev => prev.filter(x => x.id !== h.id));
                  toast('Handover flagged');
                }}
              >
                Flag
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function DriverCollectionPanel({ driverId, period }: { driverId: number; period: 'day' | 'week' | 'month' }) {
  const { data: bookings = [], isLoading } = useDriverCollections(driverId, period);

  const totalTrips = bookings.length;
  const collected = bookings.reduce((s: number, b: any) => s + (b.amount_collected ?? 0), 0);
  const pending = bookings.reduce((s: number, b: any) => s + ((b.fare ?? 0) - (b.amount_collected ?? 0)), 0);

  if (isLoading) return <div className="p-3 text-xs text-muted-foreground">Loading...</div>;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-sm font-bold">{totalTrips}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Trips</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-success/10">
          <p className="text-sm font-bold text-success">₹{collected.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Collected</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-warning/10">
          <p className="text-sm font-bold text-warning">₹{Math.max(0, pending).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
        </div>
      </div>
      {bookings.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No trips in this period</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {bookings.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
              <div className="flex-1 min-w-0 mr-2">
                <p className="font-medium truncate">{b.pickup} → {b.drop}</p>
                <p className="text-muted-foreground">{b.customer_name} · {new Date(b.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold">₹{(b.fare ?? 0).toLocaleString('en-IN')}</p>
                <p className={b.payment_confirmed_at ? 'text-success font-medium' : 'text-warning font-medium'}>
                  {b.payment_confirmed_at ? 'Paid' : 'Unpaid'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('today');
  const [dispatchBooking, setDispatchBooking] = useState<SupabaseBooking | null>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<SupabaseBooking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [vehicleSelections, setVehicleSelections] = useState<Record<number, string>>({});
  const [approvalLoading, setApprovalLoading] = useState<Record<number, boolean>>({});
  const [detailBooking, setDetailBooking] = useState<SupabaseBooking | null>(null);
const [expandedDriverId, setExpandedDriverId] = useState<number | null>(null);
  const [collectionPeriod, setCollectionPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [collectionDriverId, setCollectionDriverId] = useState<number | null>(null);  const queryClient = useQueryClient();

  const openDriverInMaps = (driver: any) => {
    if (!driver.location_lat || !driver.location_lng) return;
    const url = `https://www.google.com/maps?q=${driver.location_lat},${driver.location_lng}&label=${encodeURIComponent(driver.name)}`;
    window.open(url, '_blank');
  };

  const getLastUpdated = (driver: any) => {
    if (!(driver as any).updated_at) return 'Unknown';
    const mins = Math.round((Date.now() - new Date((driver as any).updated_at).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.round(mins / 60)} hr ago`;
  };

  const { data: drivers = [], isLoading: driversLoading } = useDrivers();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: todayHandovers = [] } = useTodayCashHandovers();
  const todayDate = new Date().toISOString().split('T')[0];
  const getDriverCashToday = (driverId: number) =>
    bookings.filter(
      b => b.driver_id === driverId &&
        (b as any).payment_confirmed_at?.startsWith(todayDate) &&
        b.payment_method === 'cash'
    ).reduce((s, b) => s + ((b as any).amount_collected ?? 0), 0);

  const freeCount = drivers.filter(d => d.status === 'free').length;
  const onTripCount = drivers.filter(d => d.status === 'on-trip').length;
  const offlineCount = drivers.filter(d => d.status === 'offline').length;
  const pendingDrivers = drivers.filter(d => d.status === 'pending_approval');
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

  const openPaymentSheet = (booking: SupabaseBooking) => {
    setPaymentBooking(booking);
    setPaymentAmount(String(booking.fare ?? ''));
    setPaymentError(null);
  };

  const handleApprove = async (driver: SupabaseDriver, isTemporary = false) => {
    const model = vehicleSelections[driver.id] || 'Maruti Swift';
    setApprovalLoading(prev => ({ ...prev, [driver.id]: true }));
    const { error } = await supabase
      .from('Drivers')
      .update({ status: 'free', vehicle_model: model, is_temporary: isTemporary })
      .eq('id', driver.id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast(`${driver.name ?? 'Driver'} approved as ${isTemporary ? 'temporary' : 'regular'} ✓`);
    }
    setApprovalLoading(prev => ({ ...prev, [driver.id]: false }));
  };

  const handleReject = async (driver: SupabaseDriver) => {
    setApprovalLoading(prev => ({ ...prev, [driver.id]: true }));
    const { error } = await supabase.from('Drivers').delete().eq('id', driver.id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast(`${driver.name ?? 'Driver'} removed`);
    }
    setApprovalLoading(prev => ({ ...prev, [driver.id]: false }));
  };

  const handleMarkPayment = async () => {
    if (!paymentBooking) return;
    setPaymentLoading(true);
    setPaymentError(null);

    const { error } = await supabase
      .from('bookings table')
      .update({
        amount_collected: Number(paymentAmount),
        payment_method: paymentMethod,
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq('id', paymentBooking.id);

    if (error) {
      setPaymentError(error.message);
      setPaymentLoading(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setPaymentBooking(null);
    toast('Payment logged ✓');
    setPaymentLoading(false);
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
            { id: 'collections' as Tab, label: 'Collections', icon: Activity },
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
            <PaymentSummary bookings={bookings} />
<PendingHandovers />
            {/* Live Map placeholder */}
              <Card className="p-5 shadow-card rounded-xl">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" /> Live Map
              </h3>
              <div id="admin-map" className="h-48 bg-muted rounded-lg relative overflow-hidden" />
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
                  <div key={booking.id} onClick={() => setDetailBooking(booking)} className="cursor-pointer">
                    <Card className="p-4 shadow-card rounded-xl">
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
                          <div className="mt-1">
                            {getPaymentBadge(booking) === 'paid' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-medium">Paid</span>
                            )}
                            {getPaymentBadge(booking) === 'partial' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-medium">
                                Partial ₹{booking.amount_collected?.toLocaleString('en-IN')}
                              </span>
                            )}
                            {getPaymentBadge(booking) === 'pending' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pending</span>
                            )}
                            {getPaymentBadge(booking) === 'unpaid' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 font-medium">Unpaid</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-2">
                          <Button size="sm" aria-label="Assign Driver" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); setDispatchBooking(booking); }}>
                            <Car className="h-3 w-3 mr-1" />Assign
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={(e) => e.stopPropagation()}>
                            <Phone className="h-3 w-3 mr-1" />Call
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
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
                  <Card
                    key={booking.id}
                    className="p-4 shadow-card rounded-xl cursor-pointer"
                    onClick={() => setDetailBooking(booking)}
                  >
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
                        <div className="mt-1">
                          {getPaymentBadge(booking) === 'paid' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-medium">Paid</span>
                          )}
                          {getPaymentBadge(booking) === 'partial' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-medium">
                              Partial ₹{booking.amount_collected?.toLocaleString('en-IN')}
                            </span>
                          )}
                          {getPaymentBadge(booking) === 'pending' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pending</span>
                          )}
                          {getPaymentBadge(booking) === 'unpaid' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 font-medium">Unpaid</span>
                          )}
                        </div>
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
                  <Card
                    key={booking.id}
                    className="p-4 shadow-card rounded-xl cursor-pointer"
                    onClick={() => setDetailBooking(booking)}
                  >
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
                        <div>
                          {getPaymentBadge(booking) === 'paid' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-medium">Paid</span>
                          )}
                          {getPaymentBadge(booking) === 'partial' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-medium">
                              Partial ₹{booking.amount_collected?.toLocaleString('en-IN')}
                            </span>
                          )}
                          {getPaymentBadge(booking) === 'pending' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pending</span>
                          )}
                          {getPaymentBadge(booking) === 'unpaid' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 font-medium">Unpaid</span>
                          )}
                        </div>
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
            {/* Period toggle */}
            <div className="flex gap-2 mb-2">
              {(['day', 'week', 'month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setCollectionPeriod(p)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${collectionPeriod === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'}`}
                >
                  {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
            {pendingDrivers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> Pending Approvals ({pendingDrivers.length})
                </h3>
                <div className="space-y-2">
                  {pendingDrivers.map(driver => (
                    <Card key={driver.id} className="p-4 border-amber-200 bg-amber-50/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-sm">{driver.name}</p>
                          <p className="text-xs text-muted-foreground">{driver.phone}</p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(driver.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <select value={vehicleSelections[driver.id] || 'Maruti Swift'} onChange={e => setVehicleSelections(prev => ({ ...prev, [driver.id]: e.target.value }))} className="text-xs border rounded px-2 py-1">
                          {['Maruti Swift', 'Toyota Innova', 'Mahindra Scorpio', 'Tata Nexon', 'Maruti Ertiga', 'Other'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(driver, false)} disabled={approvalLoading[driver.id]} className="flex-1 bg-success text-success-foreground hover:bg-success/90 rounded-lg text-xs">
                          {approvalLoading[driver.id] ? '...' : 'Approve'}
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(driver, true)} disabled={approvalLoading[driver.id]} className="flex-1 bg-orange-500 text-white hover:bg-orange-400 rounded-lg text-xs">
                          {approvalLoading[driver.id] ? '...' : 'Temp Driver'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(driver)} disabled={approvalLoading[driver.id]} className="flex-1 border-destructive text-destructive hover:bg-destructive/10 rounded-lg text-xs">
                          {approvalLoading[driver.id] ? '...' : 'Reject'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {drivers.length === 0 && (
              <Card className="p-6 shadow-card rounded-xl text-center text-sm text-muted-foreground">No drivers found. Add drivers in Supabase.</Card>
            )}
            {drivers.map((driver) => {
              const handover = todayHandovers.find(h => h.driver_id === driver.id);
              const driverCashToday = getDriverCashToday(driver.id);
              const isExpanded = expandedDriverId === driver.id;
              return (
                <Card
                  key={driver.id}
                  className="p-4 shadow-card rounded-xl cursor-pointer"
                  onClick={() => {
                    setExpandedDriverId(isExpanded ? null : driver.id);
                    setCollectionDriverId(prev => prev === driver.id ? null : driver.id);
                  }}
                >
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
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-medium capitalize">{(driver.status ?? 'offline').replace('-', ' ')}</span>
                        {handover && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30 font-medium">
                            Handed over ₹{handover.amount.toLocaleString('en-IN')} at {new Date(handover.handed_over_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                        {!handover && driverCashToday > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-medium">
                            ₹{driverCashToday.toLocaleString('en-IN')} pending handover
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      {(driver as any).is_temporary && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 border-destructive text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await supabase.from('Drivers').delete().eq('id', driver.id);
                            queryClient.invalidateQueries({ queryKey: ['drivers'] });
                            toast(`${driver.name ?? 'Driver'} removed`);
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Location button row */}
                  <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    {driver.location_lat && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openDriverInMaps(driver); }}
                        className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-md px-2 py-1 hover:bg-blue-50"
                      >
                        <MapPin className="w-3 h-3" />
                        {driver.status === 'on-trip' ? 'Live map' : 'Last location'}
                      </button>
                    )}
                    {!driver.location_lat && (
                      <span className="text-xs text-gray-400 italic">No location data</span>
                    )}
                  </div>

                  {/* Expandable detail panel */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Last updated</span>
                        <span className="font-medium text-gray-800">{getLastUpdated(driver)}</span>
                      </div>
                      {driver.location_lat && (
                        <>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Coordinates</span>
                            <span className="font-medium text-gray-800 font-mono">
                              {driver.location_lat.toFixed(4)}, {driver.location_lng?.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openDriverInMaps(driver); }}
                              className="flex-1 text-xs py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                            >
                              Open in Google Maps
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(
                                  `${driver.location_lat}, ${driver.location_lng}`
                                );
                              }}
                              className="flex-1 text-xs py-1.5 rounded-md border border-gray-200 text-gray-600"
                            >
                              Copy coords
                            </button>
                          </div>
                        </>
                      )}
                      {!driver.location_lat && (
                        <p className="text-xs text-gray-400 italic">
                          Driver has not shared location yet. Location appears once they open the app and start a trip.
                        </p>
                      )}
                    </div>
                  )}
                  {collectionDriverId === driver.id && (
                    <DriverCollectionPanel driverId={driver.id} period={collectionPeriod} />
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'collections' && (
          <div className="pb-8">
            <CollectionsHistory />
          </div>
        )}
      </div>

      <button
        onClick={() => setShowNewBooking(true)}
        className="fixed bottom-24 right-6 z-40 h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-elevated flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>

      <NewBookingSheet
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        drivers={drivers}
      />

      <DispatchEngine
        booking={dispatchBooking}
        open={!!dispatchBooking}
        onClose={() => setDispatchBooking(null)}
        onAssign={(bookingId, driverId) => {
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
          setDispatchBooking(null);
        }}
      />

      {/* Booking Detail Sheet */}
      <Sheet open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {tripTypeIcons[detailBooking?.trip_type ?? 'city']} {detailBooking?.pickup} → {detailBooking?.drop}
            </SheetTitle>
          </SheetHeader>
          {detailBooking && (() => {
            const rows: { label: string; value: string | number | null | undefined }[] = [
              { label: 'Booking ID', value: detailBooking.id },
              { label: 'Customer', value: detailBooking.customer_name },
              { label: 'Phone', value: detailBooking.customer_phone },
              { label: 'Trip type', value: tripTypeLabels[detailBooking.trip_type ?? ''] },
              { label: 'Pickup', value: detailBooking.pickup },
              { label: 'Drop', value: detailBooking.drop },
              { label: 'Scheduled', value: detailBooking.scheduled_at ? new Date(detailBooking.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null },
              { label: 'Fare', value: detailBooking.fare != null ? `₹${detailBooking.fare.toLocaleString('en-IN')}` : null },
              { label: 'Driver', value: getDriverName(detailBooking.driver_id) ?? 'Unassigned' },
              { label: 'Payment', value: detailBooking.payment_method },
              { label: 'Amount collected', value: detailBooking.amount_collected != null ? `₹${detailBooking.amount_collected}` : null },
              { label: 'Payment confirmed', value: detailBooking.payment_confirmed_at ? new Date(detailBooking.payment_confirmed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : null },
              { label: 'Stops', value: detailBooking.stops },
              { label: 'Days', value: detailBooking.number_of_days },
              { label: 'Return date', value: detailBooking.return_date },
              { label: 'Driver stay', value: detailBooking.driver_stay_required ? 'Required' : null },
            ];
            useEffect(() => {
    if (tab !== 'today') return;

    let attempts = 0;
    const tryInit = () => {
      attempts++;
      if (attempts > 20) return;
      if (!window.mappls) { setTimeout(tryInit, 500); return; }

      const mapContainer = document.getElementById("admin-map");
      if (!mapContainer) { setTimeout(tryInit, 300); return; }
      if (mapContainer.innerHTML !== "") return;

      try {
        const map = new window.mappls.Map("admin-map", {
          center: [75.7873, 26.9124],
          zoom: 12,
          search: false,
        });

        map.on('load', () => {
          drivers
            .filter(d => d.status !== 'offline' && d.location_lat && d.location_lng)
            .forEach(driver => {
              const color = driver.status === 'free' ? '#22c55e' : '#f59e0b';
              new window.mappls.Marker({
                map,
                position: [driver.location_lng!, driver.location_lat!],
                popupHtml: `<div style="padding:4px 8px;font-size:12px;font-weight:600;color:${color}">${driver.name ?? 'Driver'}<br/><span style="font-size:10px;color:#666">${driver.status}</span></div>`,
                popupOptions: { openPopup: false },
              });
            });
        });
      } catch (e) {
        console.error('Admin map error:', e);
      }
    };

    setTimeout(tryInit, 800);
  }, [tab, drivers]);
            return (
              <div className="space-y-3">
                {rows.filter(r => r.value !== null && r.value !== undefined && r.value !== '').map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                    <span className="text-sm font-medium text-right">{String(row.value)}</span>
                  </div>
                ))}
                <div className="pt-3 flex gap-2">
                  <Button size="sm" className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg text-xs" onClick={() => { setDispatchBooking(detailBooking); setDetailBooking(null); }}>
                    <Car className="h-3 w-3 mr-1" />Assign Driver
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs" onClick={() => { openPaymentSheet(detailBooking); setDetailBooking(null); }}>
                    Log Payment
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={!!paymentBooking} onOpenChange={() => setPaymentBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          {paymentBooking && (
            <div className="space-y-4">
              <Card className="p-3 bg-muted/50">
                <p className="text-sm font-semibold">{paymentBooking.customer_name ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {paymentBooking.pickup ?? '?'} → {paymentBooking.drop ?? '?'}
                </p>
                <p className="text-sm font-bold mt-1">₹{paymentBooking.fare ?? 0}</p>
              </Card>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Payment method</p>
                <div className="flex gap-2">
                  {(['cash', 'upi', 'card'] as const).map((method) => (
                    <Button
                      key={method}
                      size="sm"
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      className={paymentMethod === method ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : ''}
                      onClick={() => setPaymentMethod(method)}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="payment-amount" className="text-sm font-medium mb-1.5 block">
                  Amount collected
                </label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="Amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-foreground"
                />
              </div>

              {paymentError && (
                <p className="text-sm text-destructive">{paymentError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentBooking(null)}
                  disabled={paymentLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={paymentLoading}
                  onClick={handleMarkPayment}
                >
                  {paymentLoading ? 'Saving...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
