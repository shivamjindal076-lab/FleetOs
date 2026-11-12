import { useCallback, useEffect, useMemo, useState } from 'react';
import { entriesSince } from '@/lib/cash';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { CashCollection, ExpenseEntry } from './types';

type CashEntryRow = Pick<Tables<'driver_cash_entries'>,
  'id' | 'kind' | 'category' | 'method' | 'label' | 'amount' | 'note' | 'booking_id' | 'created_at'>;

export const toBookingId = (tripId?: string) => (tripId && /^\d+$/.test(tripId) ? Number(tripId) : null);

export function rowToExpense(r: CashEntryRow): ExpenseEntry {
  return {
    id: `db_${r.id}`, type: (r.category ?? 'other') as ExpenseEntry['type'], amount: Number(r.amount),
    note: r.note ?? '', tripId: r.booking_id ? String(r.booking_id) : undefined, timestamp: r.created_at, isOffline: false,
  };
}

export function rowToCollection(r: CashEntryRow): CashCollection {
  return {
    id: `db_${r.id}`, tripId: r.booking_id ? String(r.booking_id) : '', customerName: r.label ?? '',
    amount: Number(r.amount), method: r.method === 'upi' ? 'upi' : 'cash', note: r.note ?? undefined,
    timestamp: r.created_at, isOffline: false,
  };
}

export interface DriverHandover {
  id: number;
  amount: number;
  handed_over_at: string;
  admin_approved: boolean;
}

// The driver's money since the last handover: expenses and collections (saved to
// driver_cash_entries) and the cash handovers. A driver can hand over more than once a day, and
// cash not yet handed over carries into the next day. An entry stays marked isOffline until the
// database has it, so the pending count shows what didn't upload.
export function useDriverCash(driverId: number | undefined, orgId: string | undefined) {
  const [allExpenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [allCollections, setCollections] = useState<CashCollection[]>([]);
  const [handovers, setHandovers] = useState<DriverHandover[]>([]);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const lastHandoverAt = handovers[0]?.handed_over_at ?? null;

  const refreshCash = useCallback(async () => {
    if (!driverId) return;
    const { data: hv } = await supabase
      .from('cash_handovers_v2')
      .select('id, amount, handed_over_at, admin_approved')
      .eq('driver_id', driverId)
      .order('handed_over_at', { ascending: false })
      .limit(10);
    const list: DriverHandover[] = (hv ?? []).map(h => ({
      id: h.id, amount: Number(h.amount), handed_over_at: h.handed_over_at, admin_approved: !!h.admin_approved,
    }));
    setHandovers(list);

    let query = supabase
      .from('driver_cash_entries')
      .select('id, kind, category, method, label, amount, note, booking_id, created_at')
      .eq('driver_id', driverId)
      .order('created_at');
    if (list[0]) query = query.gt('created_at', list[0].handed_over_at);
    const { data } = await query;
    if (!data) return;
    // Keep entries that haven't uploaded yet.
    setExpenses(prev => [...data.filter(r => r.kind === 'expense').map(rowToExpense), ...prev.filter(e => e.isOffline)]);
    setCollections(prev => [...data.filter(r => r.kind === 'collection').map(rowToCollection), ...prev.filter(c => c.isOffline)]);
  }, [driverId]);

  useEffect(() => { void refreshCash(); }, [refreshCash]);

  const expenses = useMemo(() => entriesSince(allExpenses, lastHandoverAt), [allExpenses, lastHandoverAt]);
  const collections = useMemo(() => entriesSince(allCollections, lastHandoverAt), [allCollections, lastHandoverAt]);

  const saveCashEntry = async (row: Omit<TablesInsert<'driver_cash_entries'>, 'org_id' | 'driver_id'>) => {
    if (!driverId || !orgId) return null;
    const { data, error } = await supabase
      .from('driver_cash_entries')
      .insert({ org_id: orgId, driver_id: driverId, ...row })
      .select('id')
      .single();
    return error ? null : data;
  };

  const addExpense = async (e: Omit<ExpenseEntry, 'id' | 'timestamp' | 'isOffline'>) => {
    const localId = `exp_${Date.now()}`;
    setExpenses(prev => [...prev, { ...e, id: localId, timestamp: new Date().toISOString(), isOffline: true }]);
    const saved = await saveCashEntry({ kind: 'expense', category: e.type, amount: e.amount, note: e.note || null, booking_id: toBookingId(e.tripId) });
    if (saved) setExpenses(prev => prev.map(x => (x.id === localId ? { ...x, id: `db_${saved.id}`, isOffline: false } : x)));
    else toast.error("Expense kept on this phone only. It wasn't uploaded.");
  };

  const addCollection = async (c: Omit<CashCollection, 'id' | 'timestamp' | 'isOffline'>) => {
    const localId = `col_${Date.now()}`;
    setCollections(prev => [...prev, { ...c, id: localId, timestamp: new Date().toISOString(), isOffline: true }]);
    const saved = await saveCashEntry({ kind: 'collection', method: c.method, label: c.customerName || null, amount: c.amount, note: c.note || null, booking_id: toBookingId(c.tripId) });
    if (saved) setCollections(prev => prev.map(x => (x.id === localId ? { ...x, id: `db_${saved.id}`, isOffline: false } : x)));
    else toast.error("Collection kept on this phone only. It wasn't uploaded.");
  };

  const deleteExpense = async (id: string) => {
    if (id.startsWith('db_')) {
      const { error } = await supabase.from('driver_cash_entries').delete().eq('id', Number(id.slice(3)));
      if (error) { toast.error("Couldn't delete that expense. Try again."); return; }
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleHandOver = async (amount: number) => {
    if (!driverId || !orgId || !(amount > 0)) return;
    setHandoverLoading(true);
    // handed_over_at is left to the database clock, so it lines up with each entry's created_at.
    const { error } = await supabase
      .from('cash_handovers_v2')
      .insert({ org_id: orgId, driver_id: driverId, amount: Math.round(amount * 100) / 100 });
    if (error) {
      toast.error("Handover wasn't saved. Check your connection and try again.");
    } else {
      await refreshCash();
      toast('Handover recorded. The office will mark it received.');
    }
    setHandoverLoading(false);
  };

  const pendingSyncCount = [...allExpenses, ...allCollections].filter(e => e.isOffline).length;

  return { expenses, collections, handovers, lastHandoverAt, refreshCash, addExpense, addCollection, deleteExpense, handleHandOver, handoverLoading, pendingSyncCount };
}
