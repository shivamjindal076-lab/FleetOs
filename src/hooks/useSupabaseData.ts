import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrg } from './useOrg';
import { addIstDays, collectionsOrFilter, istDateString, istDayRange } from '@/lib/istDay';

// db() casts to any so new tables (drivers, bookings, cash_handovers_v2, etc.)
// work before Supabase types are regenerated post-migration.
// Remove this cast once `supabase gen types typescript` is run after migration.
const db = supabase;

export interface SupabaseDriver {
  id: number;
  org_id: string;
  name: string | null;
  phone: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  status: string | null;
  is_temporary: boolean | null;
  odometer_required: boolean | null;
  location_lat: number | null;
  location_lng: number | null;
  vehicle_class: string | null;
  created_at: string;
}

export interface SupabaseBooking {
  id: number;
  org_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  pickup: string | null;
  drop: string | null;
  trip_type: string | null;
  vehicle_class: string | null;
  status: string | null;
  fare: number | null;
  driver_id: number | null;
  scheduled_at: string;
  stops: string | null;
  estimated_hours: number | null;
  number_of_days: number | null;
  driver_stay_required: boolean | null;
  return_date: string | null;
  payment_method: string | null;
  amount_collected: number | null;
  payment_confirmed_at: string | null;
  notes: string | null;
  driver_confirmed_at: string | null;
  odometer_start_url: string | null;
  odometer_start_reading: number | null;
  odometer_start_at: string | null;
  odometer_end_url: string | null;
  odometer_end_reading: number | null;
  odometer_end_at: string | null;
  dispatched_at: string | null;
  trip_started_at: string | null;
  trip_completed_at: string | null;
  created_at: string;
}

export interface FixedRoute {
  id: number;
  org_id: string;
  origin: string | null;
  destination: string | null;
  per_km_rate: number | null;
  fixed_fare: number | null;
}

export interface CashHandover {
  id: number;
  org_id: string;
  driver_id: number;
  amount: number;
  handed_over_at: string;
  admin_approved: boolean;
  admin_notes?: string | null;
}

export interface OrgPricing {
  id: number;
  org_id: string;
  city_base_fare: number | null;
  outstation_per_day: number | null;
  city_per_km: number | null;
  outstation_per_km: number | null;
  airport_flat_fare: number | null;
  sightseeing_per_hour: number | null;
  sedan_multiplier: number | null;
  suv_multiplier: number | null;
  night_surcharge_pct: number | null;
  driver_stay_per_night: number | null;
  waiting_per_hour: number | null;
  updated_at: string | null;
}

export function useDrivers() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['drivers', org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('drivers')
        .select('*')
        .eq('org_id', org!.id);
      if (error) throw error;
      return (data ?? []) as SupabaseDriver[];
    },
    enabled: !!org?.id,
  });
}

export function useBookings() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['bookings', org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('bookings')
        .select('*')
        .eq('org_id', org!.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupabaseBooking[];
    },
    enabled: !!org?.id,
  });
}

export function useFixedRoutes() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['fixed_routes', org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('fixed_routes_v2')
        .select('*')
        .eq('org_id', org!.id);
      if (error) throw error;
      return (data ?? []) as FixedRoute[];
    },
    enabled: !!org?.id,
  });
}

export function useOrgPricing() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['org_pricing', org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('org_pricing')
        .select('*')
        .eq('org_id', org!.id)
        .maybeSingle();
      if (error) return null;
      return data as OrgPricing | null;
    },
    enabled: !!org?.id,
  });
}

// Shared constants
export const tripTypeLabels: Record<string, string> = {
  city: 'City Ride',
  airport: 'Airport Transfer',
  sightseeing: 'Sightseeing',
  outstation: 'Outstation',
};

export { tripTypeIcons } from '@/lib/tripTypeIcons';

export function getDriverInitials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function useMyDriverProfile() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['my-driver-profile', user?.id, org?.id],
    queryFn: async () => {
      if (!user || !org) return null;

      const phone = user.phone ?? '';
      const last10 = phone.replace(/\D/g, '').slice(-10);
      if (!last10) return null;

      const { data, error } = await db
        .from('drivers')
        .select('id, name, phone, vehicle_model, plate_number, status, odometer_required, is_temporary')
        .eq('org_id', org.id)
        .ilike('phone', `%${last10}`)
        .maybeSingle();
      if (error) return null;
      return data as SupabaseDriver | null;
    },
    enabled: !!user && !!org,
  });
}

function startOfTodayISO() {
  return istDayRange(istDateString(new Date())).startISO;
}

function endOfTodayISO() {
  return istDayRange(istDateString(new Date())).endISO;
}

export function useTodayHandover(driverId: number | null | undefined) {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['cash-handovers', 'today', driverId, org?.id],
    queryFn: async () => {
      if (driverId == null) return null;
      const start = startOfTodayISO();
      const end = endOfTodayISO();
      const { data, error } = await db
        .from('cash_handovers_v2')
        .select('id, driver_id, amount, handed_over_at, admin_approved')
        .eq('org_id', org!.id)
        .eq('driver_id', driverId)
        .gte('handed_over_at', start)
        .lt('handed_over_at', end)
        .order('handed_over_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as CashHandover | null;
    },
    enabled: driverId != null && !!org,
  });
}

export function useTodayCashHandovers() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['cash-handovers', 'today', org?.id],
    queryFn: async () => {
      const start = startOfTodayISO();
      const end = endOfTodayISO();
      const { data, error } = await db
        .from('cash_handovers_v2')
        .select('id, driver_id, amount, handed_over_at, admin_approved')
        .eq('org_id', org!.id)
        .gte('handed_over_at', start)
        .lt('handed_over_at', end)
        .order('handed_over_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CashHandover[];
    },
    enabled: !!org,
  });
}

const COLLECTION_COLUMNS = 'id, customer_name, pickup, drop, fare, payment_method, amount_collected, payment_confirmed_at, trip_completed_at, scheduled_at, status, driver_id';

// Collections count on the day the money came in (paid, else completed), not the day the trip
// was scheduled. Trips still unpaid and not done show on their scheduled day.
export function useCollectionsByDate(date: string) {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['collections', date, org?.id],
    queryFn: async () => {
      const { startISO, endISO } = istDayRange(date);
      const { data, error } = await db
        .from('bookings')
        .select(COLLECTION_COLUMNS)
        .eq('org_id', org!.id)
        .or(collectionsOrFilter(startISO, endISO))
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!org,
  });
}

export function useCollectionsByRange(startDate: string, endDate: string) {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['collections-range', startDate, endDate, org?.id],
    queryFn: async () => {
      const { startISO, endISO } = istDayRange(startDate, endDate);
      const { data, error } = await db
        .from('bookings')
        .select(COLLECTION_COLUMNS)
        .eq('org_id', org!.id)
        .or(collectionsOrFilter(startISO, endISO))
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!startDate && !!endDate && !!org,
  });
}

export function useLastBooking() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['last-booking', org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('bookings')
        .select('id, pickup, drop, trip_type, fare, scheduled_at, customer_name')
        .eq('org_id', org!.id)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data as Pick<SupabaseBooking, 'id' | 'pickup' | 'drop' | 'trip_type' | 'fare' | 'scheduled_at' | 'customer_name'>;
    },
    enabled: !!org,
  });
}

export function useDriverCollections(driverId: number, period: 'day' | 'week' | 'month') {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['driver-collections', driverId, period, org?.id],
    queryFn: async () => {
      const today = istDateString(new Date());
      const firstDay = period === 'day' ? today : addIstDays(today, period === 'week' ? -7 : -30);
      const { startISO } = istDayRange(firstDay);

      const { data, error } = await db
        .from('bookings')
        .select('id, fare, amount_collected, payment_confirmed_at, trip_completed_at, scheduled_at, customer_name, pickup, drop, status, payment_method')
        .eq('org_id', org!.id)
        .eq('driver_id', driverId)
        .or(collectionsOrFilter(startISO))
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!driverId && !!org,
  });
}

const RIDE_COLUMNS = 'id, driver_id, customer_name, pickup, drop, fare, payment_method, amount_collected, payment_confirmed_at, trip_completed_at, scheduled_at, status';

export type CompletedRide = Pick<SupabaseBooking,
  'id' | 'driver_id' | 'customer_name' | 'pickup' | 'drop' | 'fare' | 'payment_method' | 'amount_collected'
  | 'payment_confirmed_at' | 'trip_completed_at' | 'scheduled_at' | 'status'>;

// One driver's completed rides, newest first. The driver app and the owner's driver view share it.
export function useDriverCompletedRides(driverId: number | null | undefined) {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['driver-completed', driverId, org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('bookings')
        .select(RIDE_COLUMNS)
        .eq('org_id', org!.id)
        .eq('driver_id', driverId!)
        .eq('status', 'completed')
        .order('trip_completed_at', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as CompletedRide[];
    },
    enabled: driverId != null && !!org,
  });
}

// Every completed ride in the fleet, just the columns needed to count them per driver.
export function useCompletedRideCounts() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['completed-counts', org?.id],
    queryFn: async () => {
      const rows: Pick<SupabaseBooking, 'id' | 'driver_id' | 'status' | 'trip_completed_at' | 'payment_confirmed_at' | 'scheduled_at'>[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const { data, error } = await db
          .from('bookings')
          .select('id, driver_id, status, trip_completed_at, payment_confirmed_at, scheduled_at')
          .eq('org_id', org!.id)
          .eq('status', 'completed')
          .not('driver_id', 'is', null)
          .order('id')
          .range(from, from + page - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < page) break;
      }
      return rows;
    },
    enabled: !!org,
  });
}

// Handovers, newest first: the latest ones for the owner to see and mark received.
export function useRecentCashHandovers(limit = 30) {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['cash-handovers', 'recent', limit, org?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from('cash_handovers_v2')
        .select('id, org_id, driver_id, amount, handed_over_at, admin_approved, admin_notes')
        .eq('org_id', org!.id)
        .order('handed_over_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CashHandover[];
    },
    enabled: !!org,
  });
}
