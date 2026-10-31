import { useFareQuote } from '@/hooks/useFareQuote';
import { isOutstation } from '@/lib/bookingRequest';
import type { BookingFormData } from './BookingForm';

// The server's estimate with an honest note on what it covers. Used on the form and the summary,
// which share one cached quote. Fixed height while loading so the page doesn't jump.
export function FareEstimate({ data }: { data: BookingFormData }) {
  const { fare, isLoading, isError } = useFareQuote(data);
  const outstation = isOutstation(data.tripType);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Estimated fare</span>
        {fare !== undefined ? (
          <span className="text-2xl font-bold">{`₹${fare.toLocaleString('en-IN')}`}</span>
        ) : isError ? (
          <span className="text-sm font-semibold text-muted-foreground">Fare unavailable</span>
        ) : (
          <span
            className="h-8 w-24 rounded-md bg-muted animate-pulse"
            role={isLoading ? 'status' : undefined}
            aria-label={isLoading ? 'Loading fare' : undefined}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Estimate. Tolls and parking aren&apos;t included.</p>
      {outstation && (
        <p className="text-xs text-muted-foreground">Extra days or distance may change the final fare.</p>
      )}
    </div>
  );
}
