import { useState, useEffect, useRef } from 'react';
import {
  Car, Navigation, Phone, Clock, MapPin, Camera, FileText,
  CheckCircle, XCircle, Power, AlertTriangle, Wallet,
  TrendingUp, Bell, BellOff, Fuel, IndianRupee, WifiOff,
  Wifi, ChevronRight, Plus, Trash2, PhoneCall, PhoneOff,
  Calendar, AlarmClock, Shield
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useMyDriverProfile, useTodayHandover } from '@/hooks/useSupabaseData';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type DriverScreen = 'home' | 'active-trip' | 'earnings' | 'documents' | 'expenses';
type TripPhase = 'navigating' | 'arrived' | 'started' | 'completed';

interface ScheduledTrip {
  id: string;
  customerName: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  fare: number;
  distance: string;
  scheduledAt: string;
  tripType: 'city' | 'airport' | 'outstation' | 'sightseeing';
  status: 'pending_confirm' | 'confirmed' | 'active';
}

interface ExpenseEntry {
  id: string;
  type: 'fuel_petrol' | 'fuel_cng' | 'toll' | 'parking' | 'other';
  amount: number;
  note: string;
  tripId?: string;
  timestamp: string;
  isOffline: boolean;
}

interface CashCollection {
  id: string;
  tripId: string;
  customerName: string;
  amount: number;
  method: 'cash' | 'upi';
  note?: string;
  timestamp: string;
  isOffline: boolean;
}

interface MockTrip {
  id: string;
  customerName: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  fare: number;
  distance: string;
  tripType: string;
  eta: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TRIP_TYPE_ICONS: Record<string, string> = {
  city: '🚗', airport: '✈️', outstation: '🛣️', sightseeing: '🏛️',
};

const EXPENSE_LABELS: Record<string, string> = {
  fuel_petrol: '⛽ Petrol',
  fuel_cng: '💨 CNG',
  toll: '🛣️ Toll',
  parking: '🅿️ Parking',
  other: '📝 Other',
};

const earningsData = {
  today: 1450, week: 8200, month: 32500,
  trips: { today: 6, week: 34, month: 142 },
  rating: 4.8, acceptance: 94,
};

const documents = [
  { name: 'Driving License', status: 'verified' as const, expiry: '2028-05-15' },
  { name: 'Vehicle RC', status: 'verified' as const, expiry: '2027-11-20' },
  { name: 'Insurance', status: 'expiring' as const, expiry: '2026-04-01' },
  { name: 'Fitness Certificate', status: 'pending' as const, expiry: null },
  { name: 'PAN Card', status: 'verified' as const, expiry: null },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getHoursUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m away`;
  if (mins > 0) return `${mins} min away`;
  return 'Now';
}

// ─── ALARM COMPONENT ─────────────────────────────────────────────────────────

function TripAlarm({
  trip,
  onConfirm,
  onDismiss,
}: {
  trip: ScheduledTrip;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    let stopped = false;

    const playBeep = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => {
        if (!stopped) setTimeout(playBeep, 200);
      };
    };

    playBeep();

    return () => {
      stopped = true;
      ctx.close();
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); onDismiss(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-64 w-64 rounded-full bg-orange-500/20 animate-ping" />
        <div className="absolute h-48 w-48 rounded-full bg-orange-500/30 animate-ping" style={{ animationDelay: '0.2s' }} />

        <div className="relative z-10 bg-gray-900 border-2 border-orange-500 rounded-3xl p-6 mx-6 max-w-sm w-full shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">New Trip Assigned</span>
            </div>
            <span className="text-gray-400 text-xs font-mono">{countdown}s</span>
          </div>

          <div className="h-1 w-full bg-gray-700 rounded-full mb-5">
            <div
              className="h-1 bg-orange-500 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 30) * 100}%` }}
            />
          </div>

          <div className="mb-5">
            <div className="text-2xl font-black text-white mb-1">{trip.customerName}</div>
            <div className="text-orange-400 font-bold text-lg mb-3">
              {TRIP_TYPE_ICONS[trip.tripType]} ₹{trip.fare.toLocaleString()}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Pickup</div>
                  <div className="text-sm font-semibold text-white">{trip.pickup}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400">Drop</div>
                  <div className="text-sm font-semibold text-white">{trip.drop}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-700">
              <div className="text-center flex-1">
                <div className="text-white font-bold">{formatTime(trip.scheduledAt)}</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-wider">Pickup Time</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-white font-bold">{trip.distance}</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-wider">Distance</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-orange-400 font-bold">{getHoursUntil(trip.scheduledAt)}</div>
                <div className="text-gray-400 text-[10px] uppercase tracking-wider">ETA</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 py-4 rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all font-black text-white text-base flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
            >
              <CheckCircle className="h-5 w-5" />
              CONFIRM
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 py-4 rounded-2xl bg-gray-700 hover:bg-gray-600 active:scale-95 transition-all font-bold text-gray-300 text-base flex items-center justify-center gap-2"
            >
              <XCircle className="h-5 w-5" />
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MASKED CALL COMPONENT ────────────────────────────────────────────────────

function MaskedCallButton({ customerName, tripId }: { customerName: string; tripId: string }) {
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'active' | 'ended'>('idle');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCall = () => {
    setCallState('connecting');
    setTimeout(() => {
      setCallState('active');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }, 1500);
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState('ended');
    setTimeout(() => { setCallState('idle'); setDuration(0); }, 2000);
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (callState === 'idle') {
    return (
      <button onClick={startCall} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 active:scale-95 transition-all">
        <PhoneCall className="h-4 w-4" />
        Call Customer
        <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded-full text-blue-300">Masked</span>
      </button>
    );
  }
  if (callState === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        Connecting to {customerName}...
      </div>
    );
  }
  if (callState === 'active') {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30">
        <div className="flex items-center gap-2 text-green-400">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-bold">{customerName}</span>
          <span className="font-mono text-xs">{formatDuration(duration)}</span>
        </div>
        <button onClick={endCall} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold active:scale-95 transition-all">
          <PhoneOff className="h-3.5 w-3.5" />
          End
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-500/15 border border-gray-500/30 text-gray-400 text-sm">
      <CheckCircle className="h-4 w-4" />
      Call ended · {formatDuration(duration)}
    </div>
  );
}

// ─── EXPENSE TRACKER ──────────────────────────────────────────────────────────

function ExpenseTracker({
  isOffline, expenses, collections,
  onAddExpense, onAddCollection, onDeleteExpense,
  todayHandover, onHandOver, handoverLoading,
}: {
  isOffline: boolean;
  expenses: ExpenseEntry[];
  collections: CashCollection[];
  onAddExpense: (e: Omit<ExpenseEntry, 'id' | 'timestamp' | 'isOffline'>) => void;
  onAddCollection: (c: Omit<CashCollection, 'id' | 'timestamp' | 'isOffline'>) => void;
  onDeleteExpense: (id: string) => void;
  todayHandover: { amount: number; handed_over_at: string } | null;
  onHandOver: (amount: number) => Promise<void>;
  handoverLoading: boolean;
}) {
  const [addingExpense, setAddingExpense] = useState(false);
  const [addingCollection, setAddingCollection] = useState(false);
  const [expType, setExpType] = useState<ExpenseEntry['type']>('fuel_cng');
  const [expAmount, setExpAmount] = useState('');
  const [expNote, setExpNote] = useState('');
  const [colAmount, setColAmount] = useState('');
  const [colNote, setColNote] = useState('');
  const [colMethod, setColMethod] = useState<'cash' | 'upi'>('cash');

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCollected = collections.reduce((s, c) => s + c.amount, 0);
  const totalCashCollected = collections.filter(c => c.method === 'cash').reduce((s, c) => s + c.amount, 0);
  const cashToHandOver = totalCashCollected - totalExpenses;
  const netEarnings = totalCollected - totalExpenses;
  const pendingSync = [...expenses, ...collections].filter(e => e.isOffline).length;

  const submitExpense = () => {
    if (!expAmount) return;
    onAddExpense({ type: expType, amount: +expAmount, note: expNote });
    setExpAmount(''); setExpNote(''); setAddingExpense(false);
  };

  const submitCollection = () => {
    if (!colAmount) return;
    onAddCollection({ tripId: 'manual', customerName: '', amount: +colAmount, method: colMethod, note: colNote });
    setColAmount(''); setColNote(''); setAddingCollection(false);
  };

  return (
    <div className="space-y-4 pb-24">

      {isOffline && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <WifiOff className="h-4 w-4 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-orange-300">You're offline</p>
            <p className="text-xs text-orange-400/70">All entries saved locally — will sync when online</p>
          </div>
          {pendingSync > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-bold">{pendingSync} pending</span>
          )}
        </div>
      )}

      {!isOffline && pendingSync > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-green-500/10 border border-green-500/30">
          <Wifi className="h-4 w-4 text-green-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-300">Back online</p>
            <p className="text-xs text-green-400/70">Syncing {pendingSync} offline entries...</p>
          </div>
          <div className="h-4 w-4 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Today's summary */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Today's Summary</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-lg font-black text-green-400">₹{totalCollected.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Collected</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="text-lg font-black text-red-400">₹{totalExpenses.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Spent</div>
          </div>
          <div className={`text-center p-3 rounded-xl border ${netEarnings >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
            <div className={`text-lg font-black ${netEarnings >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              ₹{Math.abs(netEarnings).toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Net</div>
          </div>
        </div>
      </Card>

      {/* Cash Collections */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-400" />
            Cash Collections
          </div>
          <button
            onClick={() => setAddingCollection(!addingCollection)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 font-semibold active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {addingCollection && (
          <div className="mb-3 p-3 rounded-xl bg-gray-800 border border-gray-700 space-y-2.5">
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-green-500"
              placeholder="Amount (₹)"
              value={colAmount}
              onChange={e => setColAmount(e.target.value)}
            />
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-green-500"
              placeholder="Note (optional) — e.g. advance, short by ₹50"
              value={colNote}
              onChange={e => setColNote(e.target.value)}
            />
            <div className="flex gap-2">
              {(['cash', 'upi'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setColMethod(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${colMethod === m ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
                >
                  {m === 'cash' ? '💵 Cash' : '📱 UPI'}
                </button>
              ))}
            </div>
            <button onClick={submitCollection} className="w-full py-2.5 rounded-lg bg-green-500 text-white text-sm font-bold active:scale-95 transition-all">
              Save Collection
            </button>
          </div>
        )}

        <div className="space-y-2">
          {collections.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-3">No collections yet today</p>
          )}
          {collections.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <div className="text-sm font-semibold text-white">{c.note ? c.note : 'Cash collected'}</div>
                <div className="text-xs text-gray-400">{c.method === 'cash' ? '💵 Cash' : '📱 UPI'} · {new Date(c.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.isOffline && <WifiOff className="h-3 w-3 text-orange-400" />}
                <span className="text-sm font-bold text-green-400">+₹{c.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Expense Log */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Fuel className="h-4 w-4 text-orange-400" />
            Expenses
          </div>
          <button
            onClick={() => setAddingExpense(!addingExpense)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        {addingExpense && (
          <div className="mb-3 p-3 rounded-xl bg-gray-800 border border-gray-700 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(EXPENSE_LABELS) as ExpenseEntry['type'][]).map(t => (
                <button
                  key={t}
                  onClick={() => setExpType(t)}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center ${expType === t ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300'}`}
                >
                  {EXPENSE_LABELS[t]}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-orange-500"
              placeholder="Amount (₹)"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
            />
            <input
              className="w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-orange-500"
              placeholder="Note (optional)"
              value={expNote}
              onChange={e => setExpNote(e.target.value)}
            />
            <button onClick={submitExpense} className="w-full py-2.5 rounded-lg bg-orange-500 text-white text-sm font-bold active:scale-95 transition-all">
              Save Expense
            </button>
          </div>
        )}

        <div className="space-y-2">
          {expenses.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-3">No expenses logged today</p>
          )}
          {expenses.map(e => (
            <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <div className="text-sm font-semibold text-white">{EXPENSE_LABELS[e.type]}{e.note ? ` · ${e.note}` : ''}</div>
                <div className="text-xs text-gray-400">{new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="flex items-center gap-2">
                {e.isOffline && <WifiOff className="h-3 w-3 text-orange-400" />}
                <span className="text-sm font-bold text-red-400">-₹{e.amount}</span>
                <button onClick={() => onDeleteExpense(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cash Handover */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cash Handover</div>
        <p className="text-2xl font-black text-white mb-1">
          ₹{Math.max(0, cashToHandOver).toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-gray-500 mb-3">cash to hand over to Anil today</p>
        {cashToHandOver > 0 && !todayHandover && (
          <button
            onClick={() => onHandOver(cashToHandOver)}
            disabled={handoverLoading}
            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-bold text-sm disabled:opacity-50"
          >
            {handoverLoading ? 'Recording...' : 'Mark as Handed Over to Anil'}
          </button>
        )}
        {todayHandover && (
          <p className="text-xs text-green-400 font-medium">
            ✓ Recorded at {new Date(todayHandover.handed_over_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── SCHEDULED TRIP CARD ──────────────────────────────────────────────────────

function ScheduledTripCard({
  trip, isOffline, onConfirm,
}: {
  trip: ScheduledTrip;
  isOffline: boolean;
  onConfirm: (id: string) => void;
}) {
  const hoursAway = (new Date(trip.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  const isUrgent = hoursAway < 2;

  return (
    <Card className={`p-4 border ${isUrgent ? 'border-orange-500/50 bg-orange-500/5' : 'border-gray-700 bg-gray-900'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">
            {TRIP_TYPE_ICONS[trip.tripType]} {trip.tripType}
          </div>
          <div className="font-bold text-white">{trip.customerName}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-white">₹{trip.fare.toLocaleString()}</div>
          <div className="text-xs text-gray-400">{trip.distance}</div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-gray-300 truncate">{trip.pickup}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-gray-300 truncate">{trip.drop}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs">
          <AlarmClock className={`h-3.5 w-3.5 ${isUrgent ? 'text-orange-400' : 'text-gray-400'}`} />
          <span className={isUrgent ? 'text-orange-300 font-bold' : 'text-gray-400'}>
            {formatDate(trip.scheduledAt)} · {formatTime(trip.scheduledAt)}
          </span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUrgent ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-700 text-gray-300'}`}>
          {getHoursUntil(trip.scheduledAt)}
        </span>
      </div>

      {trip.status === 'pending_confirm' ? (
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(trip.id)}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Confirm Trip
          </button>
          {isOffline && (
            <div className="flex items-center gap-1 text-[10px] text-orange-400 px-2">
              <WifiOff className="h-3 w-3" />
              <span>Offline·saves locally</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-sm font-bold text-green-300">Confirmed</span>
          {isOffline && <WifiOff className="h-3 w-3 text-orange-400 ml-auto" />}
        </div>
      )}
    </Card>
  );
}

// ─── MAIN DRIVER APP ──────────────────────────────────────────────────────────

interface DriverAppProps { driverProfile?: any }

export function DriverApp({ driverProfile }: DriverAppProps) {
  const [screen, setScreen] = useState<DriverScreen>('home');
  const [isOnline, setIsOnline] = useState(true);
  const [tripPhase, setTripPhase] = useState<TripPhase>('navigating');
  const [alarmTrip, setAlarmTrip] = useState<ScheduledTrip | null>(null);
  const [scheduledTrips, setScheduledTrips] = useState<ScheduledTrip[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [handoverLoading, setHandoverLoading] = useState(false);

  const { data: fetchedProfile } = useMyDriverProfile();
  const myProfile = driverProfile ?? fetchedProfile;
  const { data: todayHandover, refetch: refetchTodayHandover } = useTodayHandover(myProfile?.id);
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!myProfile?.id) return;

    const channel = supabase
      .channel('driver-trips')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings table',
          filter: `driver_id=eq.${myProfile.id}`,
        },
        (payload) => {
          const booking = payload.new as any;
          if (payload.eventType === 'UPDATE' && booking.status === 'confirmed') {
            const newTrip: ScheduledTrip = {
              id: `BK-${booking.id}`,
              customerName: booking.customer_name ?? 'Customer',
              customerPhone: booking.customer_phone ?? '',
              pickup: booking.pickup ?? '',
              drop: booking.drop ?? '',
              fare: booking.fare ?? 0,
              distance: '—',
              scheduledAt: booking.scheduled_at,
              tripType: booking.trip_type ?? 'city',
              status: 'pending_confirm',
            };
            setScheduledTrips(prev => {
              const exists = prev.find(t => t.id === newTrip.id);
              if (exists) return prev;
              return [newTrip, ...prev];
            });
            setAlarmTrip(newTrip);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myProfile?.id]);

  const handleConfirmFromAlarm = () => {
    if (!alarmTrip) return;
    setScheduledTrips(trips => trips.map(t => t.id === alarmTrip.id ? { ...t, status: 'confirmed' } : t));
    setAlarmTrip(null);
  };

  const handleConfirmTrip = (id: string) => {
    setScheduledTrips(trips => trips.map(t => t.id === id ? { ...t, status: 'confirmed' } : t));
  };

  const addExpense = (e: Omit<ExpenseEntry, 'id' | 'timestamp' | 'isOffline'>) => {
    setExpenses(prev => [...prev, { ...e, id: `exp_${Date.now()}`, timestamp: new Date().toISOString(), isOffline: !isOnline }]);
  };

  const addCollection = (c: Omit<CashCollection, 'id' | 'timestamp' | 'isOffline'>) => {
    setCollections(prev => [...prev, { ...c, id: `col_${Date.now()}`, timestamp: new Date().toISOString(), isOffline: !isOnline }]);
  };

  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const handleHandOver = async (amount: number) => {
    if (!myProfile) return;
    setHandoverLoading(true);
    const { error } = await supabase
      .from('cash_handovers')
      .insert({ driver_id: myProfile.id, amount: Math.round(amount * 100) / 100, handed_over_at: new Date().toISOString() });
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ['cash-handovers'] });
      refetchTodayHandover();
    }
    setHandoverLoading(false);
  };

  const pendingSyncCount = [...expenses, ...collections].filter(e => e.isOffline).length;
  const unconfirmedTrips = scheduledTrips.filter(t => t.status === 'pending_confirm').length;

  const activeTrip: MockTrip = {
    id: 'B001',
    customerName: 'Priya Gupta',
    customerPhone: '+91 99876 54321',
    pickup: 'C-Scheme, Jaipur',
    drop: 'Malviya Nagar, Jaipur',
    fare: 180,
    distance: '6.2 km',
    tripType: 'city',
    eta: '12 min',
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {alarmTrip && (
        <TripAlarm
          trip={alarmTrip}
          onConfirm={handleConfirmFromAlarm}
          onDismiss={() => setAlarmTrip(null)}
        />
      )}

      {/* HEADER */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 pt-10 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium">{greeting()}</p>
              <h1 className="text-xl font-black text-white">
                {myProfile?.name ?? 'Driver'}
              </h1>
              <p className="text-xs text-gray-500">
                {myProfile?.plate_number ?? '—'} · {myProfile?.vehicle_model ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isOnline && pendingSyncCount > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 px-2.5 py-1.5 rounded-full">
                  <WifiOff className="h-3 w-3 text-orange-400" />
                  <span className="text-[10px] font-bold text-orange-300">{pendingSyncCount}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-full border border-gray-700">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-xs font-bold text-gray-200">{isOnline ? 'Online' : 'Offline'}</span>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} className="scale-75" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-lg font-black text-white">₹{earningsData.today.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Today</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-lg font-black text-white">{earningsData.trips.today}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Trips</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
              <p className="text-lg font-black text-white">⭐ {earningsData.rating}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-lg mx-auto px-5 pt-4">
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {([
            { id: 'home' as DriverScreen, label: 'Home', icon: Car, badge: unconfirmedTrips },
            { id: 'active-trip' as DriverScreen, label: 'Active Trip', icon: Navigation, badge: 0 },
            { id: 'expenses' as DriverScreen, label: 'Expenses', icon: Fuel, badge: pendingSyncCount },
            { id: 'earnings' as DriverScreen, label: 'Earnings', icon: Wallet, badge: 0 },
            { id: 'documents' as DriverScreen, label: 'Docs', icon: FileText, badge: 0 },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setScreen(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                screen === t.id ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* HOME */}
        {screen === 'home' && (
          <div className="space-y-4 pb-24">
            {!isOnline && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <WifiOff className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-300">You're offline</p>
                  <p className="text-xs text-orange-400/70">Trip confirmations & expenses save locally</p>
                </div>
              </div>
            )}

            {/* Demo alarm trigger */}
            <Card className="p-4 bg-gray-900 border-gray-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Trip Alarm Demo</p>
                  <p className="text-xs text-gray-400">Test the loud notification sound</p>
                </div>
                <button
                  onClick={() => {
                    if (scheduledTrips.length > 0) {
                      setAlarmTrip(scheduledTrips[0]);
                    } else {
                      setAlarmTrip({
                        id: 'demo',
                        customerName: 'Demo Customer',
                        customerPhone: '',
                        pickup: 'C-Scheme, Jaipur',
                        drop: 'Malviya Nagar, Jaipur',
                        fare: 180,
                        distance: '6.2 km',
                        scheduledAt: new Date(Date.now() + 30 * 60000).toISOString(),
                        tripType: 'city',
                        status: 'pending_confirm',
                      });
                    }
                  }}
                  className="text-xs px-3 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold active:scale-95 transition-all"
                >
                  Fire Alarm
                </button>
              </div>
            </Card>

            {/* Upcoming trips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  Upcoming Trips
                </div>
                {unconfirmedTrips > 0 && (
                  <span className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                    {unconfirmedTrips} need confirmation
                  </span>
                )}
              </div>
              {scheduledTrips.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No trips assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {scheduledTrips.map(trip => (
                    <ScheduledTripCard key={trip.id} trip={trip} isOffline={!isOnline} onConfirm={handleConfirmTrip} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE TRIP */}
        {screen === 'active-trip' && (
          <div className="space-y-4 pb-24">
            <Card className="p-4 bg-gray-900 border-gray-800">
              <h3 className="text-sm font-bold mb-3 text-white">Navigation</h3>
              <div className="h-44 bg-gray-800 rounded-xl flex items-center justify-center mb-3 relative border border-gray-700">
                <p className="text-xs text-gray-500">Live map · Jaipur</p>
                <div className="absolute top-3 left-3 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-bold text-white">
                  <Navigation className="h-3 w-3 inline mr-1 text-blue-400" />
                  {tripPhase === 'navigating' ? 'Head to pickup — 4 min' : tripPhase === 'arrived' ? 'At pickup location' : '3.2 km remaining'}
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-gray-200">{activeTrip.pickup}</span></div>
                <div className="flex items-center gap-2 text-sm"><div className="h-2 w-2 rounded-full bg-red-500" /><span className="text-gray-200">{activeTrip.drop}</span></div>
              </div>
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 mb-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{activeTrip.customerName}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-blue-400" />
                      Number protected
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">₹{activeTrip.fare}</p>
                    <p className="text-xs text-gray-400">{activeTrip.distance}</p>
                  </div>
                </div>
                <MaskedCallButton customerName={activeTrip.customerName} tripId={activeTrip.id} />
              </div>
              {tripPhase === 'navigating' && (
                <button onClick={() => setTripPhase('arrived')} className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 active:scale-95 transition-all text-white font-bold">I've Arrived at Pickup</button>
              )}
              {tripPhase === 'arrived' && (
                <button onClick={() => setTripPhase('started')} className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-white font-bold">Start Trip</button>
              )}
              {tripPhase === 'started' && (
                <button onClick={() => setTripPhase('completed')} className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-400 active:scale-95 transition-all text-white font-bold">End Trip · ₹{activeTrip.fare}</button>
              )}
              {tripPhase === 'completed' && (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="font-black text-lg text-white">Trip Completed!</p>
                  <p className="text-sm text-gray-400 mb-3">Earned ₹{activeTrip.fare} · Log your expenses</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setTripPhase('navigating'); setScreen('home'); }} className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-200 text-sm font-bold active:scale-95 transition-all">Back to Home</button>
                    <button onClick={() => { setTripPhase('navigating'); setScreen('expenses'); }} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold active:scale-95 transition-all">Log Expenses</button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* EXPENSES */}
        {screen === 'expenses' && (
          <ExpenseTracker
            isOffline={!isOnline}
            expenses={expenses}
            collections={collections}
            onAddExpense={addExpense}
            onAddCollection={addCollection}
            onDeleteExpense={deleteExpense}
            todayHandover={todayHandover ?? null}
            onHandOver={handleHandOver}
            handoverLoading={handoverLoading}
          />
        )}

        {/* EARNINGS */}
        {screen === 'earnings' && (
          <div className="space-y-4 pb-24">
            <Card className="p-5 bg-gray-900 border-gray-800">
              <h3 className="text-sm font-bold mb-4 text-white">Earnings Overview</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Today', amount: earningsData.today, trips: earningsData.trips.today },
                  { label: 'This Week', amount: earningsData.week, trips: earningsData.trips.week },
                  { label: 'This Month', amount: earningsData.month, trips: earningsData.trips.month },
                ].map(period => (
                  <div key={period.label} className="text-center p-3 bg-gray-800 rounded-xl border border-gray-700">
                    <p className="text-lg font-black text-white">₹{period.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{period.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{period.trips} trips</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 bg-gray-900 border-gray-800">
              <h3 className="text-sm font-bold mb-3 text-white">Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Acceptance Rate</span><span className="font-bold text-white">{earningsData.acceptance}%</span></div>
                  <Progress value={earningsData.acceptance} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Rating</span><span className="font-bold text-white">⭐ {earningsData.rating} / 5.0</span></div>
                  <Progress value={earningsData.rating * 20} className="h-2" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* DOCUMENTS */}
        {screen === 'documents' && (
          <div className="space-y-4 pb-24">
            <Card className="p-5 bg-gray-900 border-gray-800">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                <FileText className="h-4 w-4 text-blue-400" /> Documents
              </h3>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${doc.status === 'verified' ? 'bg-green-500/15' : doc.status === 'expiring' ? 'bg-orange-500/15' : 'bg-red-500/15'}`}>
                        {doc.status === 'verified' ? <CheckCircle className="h-4 w-4 text-green-400" /> :
                          doc.status === 'expiring' ? <AlertTriangle className="h-4 w-4 text-orange-400" /> :
                            <Clock className="h-4 w-4 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{doc.name}</p>
                        {doc.expiry && <p className="text-xs text-gray-400">Exp: {doc.expiry}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${doc.status === 'verified' ? 'bg-green-500/10 text-green-400 border-green-500/30' : doc.status === 'expiring' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {doc.status}
                      </span>
                      {doc.status !== 'verified' && (
                        <button className="flex items-center gap-1 h-7 px-2 text-xs rounded-lg bg-gray-700 text-gray-300 border border-gray-600 active:scale-95 transition-all">
                          <Camera className="h-3 w-3" /> Upload
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}