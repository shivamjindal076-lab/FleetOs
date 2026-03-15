import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SupabaseDriver {
  id: number;
  name: string | null;
  phone: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  status: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
}

export interface SupabaseBooking {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  country_code: string | null;
  pickup: string | null;
  drop: string | null;
  trip_type: string | null;
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
}

export interface FixedRoute {
  id: number;
  origin: string | null;
  destination: string | null;
  per_km_rate: number | null;
  fixed_fare: number | null;
}

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Drivers')
        .select('*');
      if (error) throw error;
      return (data ?? []) as SupabaseDriver[];
    },
  });
}

export function useBookings() {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings table')
        .select('*')
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupabaseBooking[];
    },
  });
}

export function useFixedRoutes() {
  return useQuery({
    queryKey: ['fixed_routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_routes')
        .select('*');
      if (error) throw error;
      return (data ?? []) as FixedRoute[];
    },
  });
}

// Shared constants (previously in mockData)
export const tripTypeLabels: Record<string, string> = {
  city: 'City Ride',
  airport: 'Airport Transfer',
  sightseeing: 'Sightseeing',
  outstation: 'Outstation',
};

export const tripTypeIcons: Record<string, string> = {
  city: '🚗',
  airport: '✈️',
  sightseeing: '🏛️',
  outstation: '🛣️',
};

// Helper to get driver initials
export function getDriverInitials(name: string | null): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function useMyDriverProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-driver-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('Drivers')
        .select('id, name, vehicle_model, plate_number, status')
        .eq('auth_user_id', user.id)
        .single();
      if (error) return null;
      return data as SupabaseDriver | null;
    },
    enabled: !!user,
  });
}
