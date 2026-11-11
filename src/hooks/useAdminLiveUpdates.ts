import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from './useOrg';
import { useDrivers } from './useSupabaseData';
import { describeBookingChange, isOwnBookingEdit, type LiveBooking } from '@/lib/adminNotifications';

const BOOKING_KEYS = ['bookings', 'collections', 'collections-range', 'driver-collections', 'driver-completed', 'completed-counts', 'last-booking'];

// One live connection for the whole owner area. Needs the 20261112000000_realtime_core_tables
// migration: until it is applied nothing arrives here and the screens refresh as before.
// Toasts are announced politely to screen readers by the toaster and play no sound.
export function useAdminLiveUpdates() {
  const { org } = useOrg();
  const queryClient = useQueryClient();
  const { data: drivers = [] } = useDrivers();
  const driversRef = useRef(drivers);
  driversRef.current = drivers;
  const orgId = org?.id;

  useEffect(() => {
    if (!orgId) return;
    const refresh = (keys: string[]) => keys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const filter = `org_id=eq.${orgId}`;
    const driverName = (id: number | null | undefined) =>
      (id != null ? driversRef.current.find(d => d.id === id)?.name : null) ?? null;

    const channel = supabase
      .channel(`admin-live-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter }, payload => {
        refresh(BOOKING_KEYS);
        if (payload.eventType === 'DELETE') return;
        const next = payload.new as LiveBooking;
        if (next?.id != null && isOwnBookingEdit(next.id)) return;
        const notices = describeBookingChange(
          payload.eventType,
          next,
          (payload.old ?? null) as LiveBooking | null,
          driverName(next?.driver_id),
        );
        notices.forEach(n => toast(n.message));
        if (payload.eventType === 'UPDATE') refresh(['drivers']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter }, () => {
        refresh(['drivers']);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_handovers_v2', filter }, payload => {
        refresh(['cash-handovers', 'pending-handovers']);
        if (payload.eventType === 'INSERT') {
          const row = payload.new as { driver_id?: number; amount?: number };
          const who = driverName(row.driver_id) ?? 'A driver';
          const amount = row.amount != null ? ` of ₹${Number(row.amount).toLocaleString('en-IN')}` : '';
          toast(`${who} handed over cash${amount}. Mark it received when you have it.`);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_cash_entries', filter }, () => {
        refresh(['cash-entries']);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);
}
