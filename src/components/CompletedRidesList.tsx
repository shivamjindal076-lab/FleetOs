import { Banknote, CheckCircle, Smartphone } from 'lucide-react';
import { countCompleted, rideDoneAt } from '@/lib/rideHistory';
import type { CompletedRide } from '@/hooks/useSupabaseData';

// Completed rides, newest first, with counts for today, this week and this month.
// Used by the driver app (dark) and the owner's driver view (light).
export function CompletedRidesList({
  rides, loading, error, variant = 'light',
}: {
  rides: CompletedRide[];
  loading?: boolean;
  error?: boolean;
  variant?: 'dark' | 'light';
}) {
  const dark = variant === 'dark';
  const counts = countCompleted(rides);
  const tile = dark ? 'bg-gray-800 border border-gray-700' : 'bg-muted/50';
  const strong = dark ? 'text-white' : 'text-foreground';
  const quiet = dark ? 'text-gray-400' : 'text-muted-foreground';
  const rule = dark ? 'border-gray-800' : 'border-border';

  const when = (iso: string | null) => iso
    ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : 'Date unknown';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2" aria-label="Completed rides">
        {[{ label: 'Today', n: counts.today }, { label: 'This week', n: counts.week }, { label: 'This month', n: counts.month }].map(c => (
          <div key={c.label} className={`rounded-xl p-3 text-center ${tile}`}>
            <p className={`text-lg font-bold ${strong}`}>{c.n}</p>
            <p className={`text-xs ${quiet}`}>{c.label}</p>
          </div>
        ))}
      </div>
      <p className={`text-xs ${quiet}`}>{counts.total} completed in all</p>

      {loading ? (
        <p className={`text-sm text-center py-6 ${quiet}`}>Loading rides</p>
      ) : error ? (
        <p role="alert" className="text-sm text-center py-6 text-destructive">Couldn't load completed rides. Refresh the page.</p>
      ) : rides.length === 0 ? (
        <p className={`text-sm text-center py-6 ${quiet}`}>No completed rides yet</p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto">
          {rides.map(r => {
            const collected = r.payment_confirmed_at ? (r.amount_collected ?? 0) : null;
            return (
              <li key={r.id} className={`py-3 border-b last:border-0 ${rule}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${strong}`}>{r.pickup ?? '?'} to {r.drop ?? '?'}</p>
                    <p className={`text-xs ${quiet}`}>#{r.id} · {r.customer_name ?? 'Customer'}</p>
                    <p className={`text-xs ${quiet}`}>{when(rideDoneAt(r))}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${strong}`}>Fare ₹{(r.fare ?? 0).toLocaleString('en-IN')}</p>
                    {collected !== null ? (
                      <p className={`flex items-center justify-end gap-1 text-xs font-medium ${dark ? 'text-green-400' : 'text-success'}`}>
                        {r.payment_method === 'upi' ? <Smartphone className="h-3 w-3" aria-hidden /> : <Banknote className="h-3 w-3" aria-hidden />}
                        Collected ₹{collected.toLocaleString('en-IN')} {r.payment_method ? `by ${r.payment_method === 'upi' ? 'UPI' : r.payment_method}` : ''}
                      </p>
                    ) : (
                      <p className={`flex items-center justify-end gap-1 text-xs font-medium ${dark ? 'text-orange-300' : 'text-warning'}`}>
                        <CheckCircle className="h-3 w-3" aria-hidden /> Not paid yet
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
