import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, CalendarDays, Clock, Info, Loader2, AlertCircle, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingFormData } from './BookingForm';
import { tripTypeConfig } from './TripTypeSelector';
import { TripPreviewMap } from '@/components/maps/TripPreviewMap';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/hooks/useOrg';
import { vehicleClassLabel } from '@/lib/dispatch';
import { saveTrackingToken } from '@/lib/trackingStorage';
import { TrackBooking } from './TrackBooking';
import { TripTypeIcon } from '@/components/TripTypeIcon';
import { acceptedPayments, pickPayment, PAYMENT_LABELS, type PaymentMethodId } from '@/lib/fleetDisplay';

interface BookingSummaryProps {
  data: BookingFormData;
  onEdit: () => void;
  onDone: () => void;
}

const tripTypeToDb: Record<string, string> = {
  local: 'city',
  city_tour: 'sightseeing',
  intercity: 'outstation',
  multiday: 'outstation',
  airport: 'airport',
};

// The booking request sent to the database. The fare is not part of it: quote_fare() and
// create_customer_booking() compute it from the fleet's rate card.
function bookingRequest(data: BookingFormData) {
  // No date means "now"; the database fills that in, which also keeps this request stable
  // between renders so the fare quote isn't refetched on every render.
  const scheduledAt = data.date && data.time
    ? new Date(`${data.date}T${data.time}`).toISOString()
    : null;

  return {
    customer_name: data.customerName || null,
    customer_phone: data.customerPhone
      ? '+91' + data.customerPhone.replace(/\D/g, '').slice(-10)
      : null,
    pickup: data.pickup,
    drop: data.tripType === 'city_tour' ? (data.stops[0] || null) : data.drop,
    scheduled_at: scheduledAt,
    trip_type: tripTypeToDb[data.tripType] ?? data.tripType,
    vehicle_class: data.vehicleClass,
    notes: data.notes?.trim() || null,
    stops: data.tripType === 'city_tour' && data.stops.length > 0
      ? JSON.stringify(data.stops)
      : null,
    estimated_hours: data.tripType === 'city_tour' ? data.estimatedHours : null,
    return_date: data.isRoundTrip && data.returnDate
      ? new Date(data.returnDate).toISOString()
      : null,
    number_of_days: (data.tripType === 'multiday' || data.tripType === 'intercity') ? data.numberOfDays : null,
    driver_stay_required: data.tripType === 'multiday' ? data.driverStayRequired : null,
  };
}

export function BookingSummary({ data, onEdit, onDone }: BookingSummaryProps) {
  const [chosenPayment, setChosenPayment] = useState<PaymentMethodId | null>(null);
  const [submitError, setSubmitError] = useState<{ title: string; detail: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Private token from create_customer_booking; customers can't read the bookings table directly.
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const { org } = useOrg();

  // Payment follows what the fleet accepts. One method is shown as a fact, not a choice.
  const acceptedMethods = acceptedPayments(org?.payment_methods);
  const payment = pickPayment(acceptedMethods, chosenPayment);
  const cancellationNote = org?.cancellation_note?.trim() || null;

  const tripInfo = tripTypeConfig.find((t) => t.id === data.tripType);
  const request = bookingRequest(data);
  const { data: fare, isError: fareFailed } = useQuery({
    queryKey: ['fare-quote', org?.id, request],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data: quote, error } = await supabase.rpc('quote_fare', { p_org_id: org!.id, p_booking: request });
      if (error) throw error;
      return Number(quote);
    },
  });
  const airportTerminal = `${data.hubCity || 'City'} Airport`;
  const previewPickup = data.tripType === 'airport' && data.airportDirection === 'arriving'
    ? airportTerminal
    : data.pickup;
  const previewDrop = data.tripType === 'airport'
    ? data.airportDirection === 'arriving'
      ? data.pickup
      : airportTerminal
    : data.drop;
  const previewStops = data.tripType === 'city_tour'
    ? data.stops.filter(stop => stop.trim().length > 0)
    : [];

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!org?.id) {
        throw new Error('Fleet details are still loading. Try again in a moment.');
      }

      const payload = { ...request, payment_method: payment };

      const db = supabase;
      const { data: rows, error } = await db.rpc('create_customer_booking', { p_org_id: org.id, p_booking: payload });
      if (error) throw error;
      const created = rows?.[0];
      if (!created?.booking_id) throw new Error("The booking wasn't saved. Try again.");
      // Keep the token so the live map can be reopened later from this device.
      saveTrackingToken(created.booking_token);
      setTrackingToken(created.booking_token);
    } catch (err: any) {
      console.error('Booking error:', err);
      setSubmitError({
        title: "Couldn't confirm your booking",
        detail: typeof err?.message === 'string' && err.message ? err.message : 'Check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (trackingToken !== null) {
    return (
      <TrackBooking
        token={trackingToken}
        fallbackPickup={data.pickup}
        fallbackDrop={data.drop || 'Tour'}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
          <TripTypeIcon type={data.tripType} className="h-4 w-4" />
          {tripInfo?.label}
        </span>
      </div>

      <TripPreviewMap
        pickup={previewPickup}
        drop={previewDrop}
        stops={previewStops}
        title="Trip preview"
        subtitle="Review the route before you confirm the booking"
        mapClassName="h-[260px]"
      />

      <Card className="p-4 shadow-card rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
            <div className="w-px h-8 bg-border" />
            <MapPin className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-semibold">{data.pickup}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {data.tripType === 'city_tour' ? 'Stops' : 'Drop'}
              </p>
              {data.tripType === 'city_tour' && data.stops.length > 0 ? (
                <ul className="space-y-1">
                  {data.stops.map((stop, index) => (
                    <li key={index} className="text-sm font-semibold">{index + 1}. {stop}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-semibold">{data.drop || '-'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{data.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{data.time}</span>
          {data.tripType === 'city_tour' && (
            <span>{data.estimatedHours} hrs</span>
          )}
          {data.tripType === 'intercity' && data.isRoundTrip && (
            <span>Return: {data.returnDate}</span>
          )}
          {data.tripType === 'multiday' && (
            <>
              <span>{data.numberOfDays} days</span>
              {data.driverStayRequired && <span>Driver stay required</span>}
            </>
          )}
          <span>{vehicleClassLabel[data.vehicleClass]}</span>
          {data.tripType === 'airport' && data.flightNumber && (
            <span>Flight {data.flightNumber}</span>
          )}
        </div>
      </Card>

      <Card className="p-4 shadow-card rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Estimated fare</span>
          <span className="text-2xl font-bold">{fare !== undefined ? `₹${fare.toLocaleString()}` : fareFailed ? 'Unavailable' : '…'}</span>
        </div>
        <p className="text-xs text-muted-foreground">Final fare may vary based on route and stops</p>
      </Card>

      <div>
        {acceptedMethods.length === 1 ? (
          <p className="flex items-center gap-2 text-sm text-foreground">
            {payment === 'upi' ? <Smartphone className="h-4 w-4 text-muted-foreground" /> : <Banknote className="h-4 w-4 text-muted-foreground" />}
            Pay {PAYMENT_LABELS[payment]} to your driver
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Payment method</p>
            <div className="flex gap-2">
              {acceptedMethods.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={payment === id}
                  onClick={() => setChosenPayment(id)}
                  className={cn(
                    'flex-1 h-11 rounded-lg text-sm font-semibold border transition flex items-center justify-center gap-2',
                    payment === id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border'
                  )}
                >
                  {id === 'upi' ? <Smartphone className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                  {PAYMENT_LABELS[id]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {cancellationNote && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>{cancellationNote}</span>
        </p>
      )}

      {submitError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold text-destructive">{submitError.title}</p>
            {submitError.detail && <p className="text-muted-foreground">{submitError.detail}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} disabled={submitting} className="flex-1 h-12 rounded-xl font-semibold">
          Edit
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 h-12 rounded-xl font-semibold"
        >
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming</> : submitError ? 'Try again' : 'Confirm booking'}
        </Button>
      </div>
    </div>
  );
}
