import { useState } from 'react';
import { MapPin, CalendarDays, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingFormData } from './BookingForm';
import { tripTypeConfig } from './TripTypeSelector';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingSummaryProps {
  data: BookingFormData;
  onEdit: () => void;
  onDone: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'card';

const fareEstimates: Record<string, number> = {
  local: 180,
  airport: 450,
  city_tour: 2200,
  intercity: 3200,
  multiday: 5500,
};

export function BookingSummary({ data, onEdit, onDone }: BookingSummaryProps) {
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const { toast } = useToast();

  const tripInfo = tripTypeConfig.find((t) => t.id === data.tripType);
  const fare = fareEstimates[data.tripType] ?? 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const scheduledAt = data.date && data.time
        ? new Date(`${data.date}T${data.time}`).toISOString()
        : new Date().toISOString();

      const { data: result, error } = await supabase
        .from('bookings table')
        .insert({
          pickup: data.pickup,
          drop: data.tripType === 'city_tour' ? (data.stops[0] || null) : data.drop,
          scheduled_at: scheduledAt,
          trip_type: data.tripType,
          fare,
          payment_method: payment,
          status: 'pending',
          stops: data.tripType === 'city_tour' && data.stops.length > 0
            ? JSON.stringify(data.stops)
            : null,
          estimated_hours: data.tripType === 'city_tour' ? data.estimatedHours : null,
          return_date: data.isRoundTrip && data.returnDate
            ? new Date(data.returnDate).toISOString()
            : null,
          number_of_days: data.tripType === 'multiday' ? data.numberOfDays : null,
          driver_stay_required: data.tripType === 'multiday' ? data.driverStayRequired : null,
        })
        .select('id')
        .single();

      if (error) throw error;
      setBookingId(result?.id ?? null);
    } catch (err: any) {
      console.error('Booking error:', err);
      toast({ title: 'Booking failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (bookingId !== null) {
    return (
      <div className="text-center py-12 animate-slide-up">
        <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
        <h2 className="text-xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-sm text-muted-foreground mb-1">Booking ID: #{bookingId}</p>
        <p className="text-sm text-muted-foreground mb-1">
          {tripInfo?.emoji} {tripInfo?.label}: {data.pickup} → {data.drop || 'Tour'}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          {data.date} at {data.time}
        </p>

        <Card className="p-4 shadow-card rounded-xl text-left mb-4 max-w-xs mx-auto">
          <p className="text-xs text-muted-foreground mb-1">Driver</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">🚗</div>
            <p className="text-sm font-semibold text-muted-foreground">Will be assigned by your fleet manager</p>
          </div>
        </Card>

        <Button onClick={onDone} className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold max-w-xs mx-auto">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Trip type badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-secondary/10 text-secondary-foreground text-xs font-bold rounded-full border border-secondary">
          {tripInfo?.emoji} {tripInfo?.label}
        </span>
      </div>

      {/* Route */}
      <Card className="p-5 shadow-elevated rounded-xl">
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
                  {data.stops.map((s, i) => (
                    <li key={i} className="text-sm font-semibold">{i + 1}. {s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-semibold">{data.drop || '—'}</p>
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
              {data.driverStayRequired && <span>🏨 Driver stay</span>}
            </>
          )}
          {data.tripType === 'airport' && data.flightNumber && (
            <span>✈️ {data.flightNumber}</span>
          )}
        </div>
      </Card>

      {/* Fare */}
      <Card className="p-5 shadow-elevated rounded-xl">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Estimated Fare</span>
          <span className="text-2xl font-bold">₹{fare.toLocaleString()}</span>
        </div>
        <p className="text-xs text-muted-foreground">Final fare may vary based on route and stops</p>
      </Card>

      {/* Payment */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Payment method</p>
        <div className="flex gap-2">
          {([
            { id: 'cash' as PaymentMethod, label: '💵 Cash' },
            { id: 'upi' as PaymentMethod, label: '📱 UPI' },
            { id: 'card' as PaymentMethod, label: '💳 Card' },
          ]).map((pm) => (
            <button
              key={pm.id}
              onClick={() => setPayment(pm.id)}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-xs font-semibold border transition',
                payment === pm.id
                  ? 'bg-secondary text-secondary-foreground border-secondary'
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} className="flex-1 h-12 rounded-xl font-semibold">
          ← Edit Trip
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={submitting}
          className="flex-1 h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold"
        >
          {submitting ? 'Saving…' : '✓ Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
