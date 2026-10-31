import { useRef, useState } from 'react';
import { Plus, Minus, X, GripVertical, PlaneLanding, PlaneTakeoff, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LocationInput } from './LocationInput';
import { TripType } from './TripTypeSelector';
import { TripPreviewMap } from '@/components/maps/TripPreviewMap';
import { cn } from '@/lib/utils';
import type { VehicleClass } from '@/lib/dispatch';
import { validateBooking, firstErrorField, type BookingField } from '@/lib/bookingValidation';
import { FareEstimate } from './FareEstimate';

export interface BookingFormData {
  pickup: string;
  drop: string;
  date: string;
  time: string;
  tripType: TripType;
  customerName: string;
  customerPhone: string;
  hubCity: string;
  passengerCount: number;
  vehicleClass: VehicleClass;
  notes: string;
  // Airport
  airportDirection: 'arriving' | 'departing';
  flightNumber: string;
  // City Tour
  estimatedHours: number;
  stops: string[];
  // Intercity
  isRoundTrip: boolean;
  returnDate: string;
  // Multi-day
  numberOfDays: number;
  driverStayRequired: boolean;
}

export const defaultFormData: BookingFormData = {
  pickup: '',
  drop: '',
  date: '',
  time: '',
  tripType: 'local',
  customerName: '',
  customerPhone: '',
  hubCity: 'Jaipur',
  numberOfDays: 1,
  passengerCount: 1,
  vehicleClass: '4_seater',
  notes: '',
  airportDirection: 'arriving',
  flightNumber: '',
  estimatedHours: 4,
  stops: [],
  isRoundTrip: false,
  returnDate: '',
  driverStayRequired: false,
};

interface BookingFormProps {
  data: BookingFormData;
  onChange: (data: BookingFormData) => void;
  onNext: () => void;
  /** True while name and phone come from this device's saved details. */
  detailsPrefilled?: boolean;
  onClearDetails?: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function BookingForm({ data, onChange, onNext, detailsPrefilled = false, onClearDetails }: BookingFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const [tried, setTried] = useState(false);
  // Errors show after the first Next tap, and each one clears as soon as its field is fixed.
  const errors = tried ? validateBooking(data) : {};
  const invalid = 'border-destructive focus-visible:ring-destructive';

  const focusField = (field: BookingField) => {
    // Wait a frame so the error text is in the page before scrolling.
    requestAnimationFrame(() => {
      const box = formRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (!box) return;
      const inputs = box.querySelectorAll<HTMLElement>('input, textarea');
      const target = field === 'when' && data.date ? inputs[1] : inputs[0];
      box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
    });
  };

  const handleNext = () => {
    const first = firstErrorField(validateBooking(data));
    if (!first) {
      onNext();
      return;
    }
    setTried(true);
    focusField(first);
  };

  const update = (partial: Partial<BookingFormData>) => onChange({ ...data, ...partial });
  // A 4-seater only takes four passengers, so a bigger group is moved to the 6-seater.
  const setPassengers = (count: number) =>
    update({ passengerCount: count, ...(count > 4 ? { vehicleClass: '6_seater' as const } : {}) });
  const needsSixSeater = data.passengerCount > 4;
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
  const previewSubtitle = previewDrop || previewStops.length > 0
    ? 'Cab-style route preview with highlighted path'
    : 'Add your destination to see the route update live';

  const addStop = () => {
    if (data.stops.length < 6) update({ stops: [...data.stops, ''] });
  };
  const removeStop = (i: number) => update({ stops: data.stops.filter((_, idx) => idx !== i) });
  const updateStop = (i: number, val: string) => {
    const newStops = [...data.stops];
    newStops[i] = val;
    update({ stops: newStops });
  };

  return (
    <Card ref={formRef} className="p-4 shadow-card rounded-xl animate-slide-up space-y-4">
      {/* Common: Pickup */}
      <div data-field="pickup">
        <LocationInput
          value={data.pickup}
          onChange={(v) => update({ pickup: v })}
          placeholder={data.tripType === 'airport' ? 'Your address' : 'Pickup location'}
          icon="pickup"
        />
        <FieldError id="err-pickup" message={errors.pickup} />
      </div>

      {/* Airport-specific */}
      {data.tripType === 'airport' && (
        <>
          <div className="flex rounded-lg overflow-hidden border">
            {(['arriving', 'departing'] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => update({ airportDirection: dir })}
                className={cn(
                  'flex-1 min-h-[44px] px-2 py-2 text-xs font-semibold transition flex items-center justify-center gap-2',
                  data.airportDirection === dir
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {dir === 'arriving' ? <PlaneLanding className="h-4 w-4 shrink-0" /> : <PlaneTakeoff className="h-4 w-4 shrink-0" />}
                {dir === 'arriving' ? `Arriving in ${data.hubCity || 'your city'}` : `Departing from ${data.hubCity || 'your city'}`}
              </button>
            ))}
          </div>
          <Input
            value={`${data.hubCity || 'City'} Airport`}
            disabled
            className="h-12 rounded-lg bg-muted text-sm"
          />
          <Input
            placeholder="Flight number (optional)"
            value={data.flightNumber}
            onChange={(e) => update({ flightNumber: e.target.value })}
            className="h-12 rounded-lg"
          />
        </>
      )}

      {/* Drop (local, intercity, multiday) */}
      {['local', 'intercity', 'multiday'].includes(data.tripType) && (
        <div data-field="drop">
          <LocationInput
            value={data.drop}
            onChange={(v) => update({ drop: v })}
            placeholder={data.tripType === 'local' ? 'Drop location' : 'Destination city'}
            icon="drop"
          />
          <FieldError id="err-drop" message={errors.drop} />
        </div>
      )}

      {/* City Tour — stops */}
      {data.tripType === 'city_tour' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Stops</p>
          {data.stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <Input
                placeholder={`Stop ${i + 1}`}
                value={stop}
                onChange={(e) => updateStop(i, e.target.value)}
                className="h-12 rounded-lg text-sm"
              />
              <button onClick={() => removeStop(i)} aria-label={`Remove stop ${i + 1}`} className="shrink-0 h-11 w-11 flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
          {data.stops.length < 6 && (
            <Button variant="outline" size="sm" onClick={addStop} className="w-full h-11 rounded-lg text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add stop
            </Button>
          )}
        </div>
      )}

      {/* City Tour — hours */}
      {data.tripType === 'city_tour' && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Estimated hours</p>
          <div className="flex gap-2">
            {[4, 6, 8, 10].map((h) => (
              <button
                key={h}
                onClick={() => update({ estimatedHours: h })}
                className={cn(
                  'flex-1 h-11 rounded-lg text-sm font-semibold transition border',
                  data.estimatedHours === h
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'
                )}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outstation / intercity — number of days */}
{data.tripType === 'intercity' && (        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Number of days</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => update({ numberOfDays: Math.max(1, data.numberOfDays - 1) })}
              className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition text-lg font-bold"
            >
              −
            </button>
            <span className="text-xl font-bold w-8 text-center">{data.numberOfDays}</span>
            <button
              onClick={() => update({ numberOfDays: Math.min(30, data.numberOfDays + 1) })}
              className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition text-lg font-bold"
            >
              +
            </button>
            <span className="text-xs text-muted-foreground">{data.numberOfDays} day{data.numberOfDays > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Intercity — round trip toggle */}
      {data.tripType === 'intercity' && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ isRoundTrip: false })}
            className={cn(
              'flex-1 h-11 rounded-lg text-xs font-semibold border transition',
              !data.isRoundTrip
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border'
            )}
          >
            One way
          </button>
          <button
            onClick={() => update({ isRoundTrip: true })}
            className={cn(
              'flex-1 h-11 rounded-lg text-xs font-semibold border transition',
              data.isRoundTrip
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border'
            )}
          >
            Round trip
          </button>
        </div>
      )}

      {/* Return date for intercity round trip */}
      {data.tripType === 'intercity' && data.isRoundTrip && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Return date</label>
          <Input
            type="date"
            value={data.returnDate}
            onChange={(e) => update({ returnDate: e.target.value })}
            className="h-12 rounded-lg"
          />
        </div>
      )}

      {/* Multi-day specifics */}
      {data.tripType === 'multiday' && (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Number of days</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => update({ numberOfDays: Math.max(1, data.numberOfDays - 1) })}
                className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{data.numberOfDays}</span>
              <button
                onClick={() => update({ numberOfDays: Math.min(14, data.numberOfDays + 1) })}
                className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">{data.numberOfDays} day{data.numberOfDays > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Driver needs accommodation?</p>
            <div className="flex gap-3">
              {[false, true].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => update({ driverStayRequired: val })}
                  className={cn(
                    'flex-1 h-11 rounded-lg text-xs font-semibold border transition',
                    data.driverStayRequired === val
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border'
                  )}
                >
                  {val ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <TripPreviewMap
        pickup={previewPickup}
        drop={previewDrop}
        stops={previewStops}
        title="Trip map"
        subtitle={previewSubtitle}
        mapClassName="h-[250px]"
      />
{/* Passenger count */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Number of passengers</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPassengers(Math.max(1, data.passengerCount - 1))}
            className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition text-lg font-bold"
          >
            −
          </button>
          <span className="text-xl font-bold w-6 text-center">{data.passengerCount}</span>
          <button
            onClick={() => setPassengers(Math.min(6, data.passengerCount + 1))}
            className="h-11 w-11 rounded-lg border flex items-center justify-center hover:bg-muted transition text-lg font-bold"
          >
            +
          </button>
          <span className="text-xs text-muted-foreground">
            {data.passengerCount === 1 ? '1 person' : `${data.passengerCount} people`}
          </span>
        </div>
      </div>

      {/* Car size */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Car size</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: '4_seater' as VehicleClass, label: '4-seater', detail: 'Sedan · up to 4' },
            { id: '6_seater' as VehicleClass, label: '6-seater', detail: 'SUV · up to 6' },
          ]).map(option => (
            <button
              key={option.id}
              type="button"
              disabled={option.id === '4_seater' && needsSixSeater}
              onClick={() => update({ vehicleClass: option.id })}
              className={cn(
                'rounded-xl border p-3 text-left transition disabled:opacity-50',
                data.vehicleClass === option.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-muted'
              )}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.detail}</p>
            </button>
          ))}
        </div>
        {needsSixSeater && (
          <p className="mt-2 text-xs text-muted-foreground">6-seater needed for 5+ passengers</p>
        )}
      </div>

      {/* Customer details */}
      <div className="space-y-3">
        <div data-field="name">
          <label className="text-xs text-muted-foreground mb-1 block">Your name</label>
          <Input
            placeholder="Full name"
            value={data.customerName}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'err-name' : undefined}
            onChange={(e) => update({ customerName: e.target.value })}
            className={cn('h-12 rounded-lg', errors.name && invalid)}
          />
          <FieldError id="err-name" message={errors.name} />
        </div>
        <div data-field="phone">
          <label className="text-xs text-muted-foreground mb-1 block">Mobile number</label>
          <div className="flex gap-2">
            <div className="flex items-center justify-center px-3 bg-muted rounded-lg text-sm font-medium text-muted-foreground border">
              +91
            </div>
            <Input
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={data.customerPhone}
              inputMode="numeric"
              autoComplete="tel-national"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'err-phone' : undefined}
              onChange={(e) => update({ customerPhone: e.target.value.replace(/\D/g, '') })}
              className={cn('h-12 rounded-lg', errors.phone && invalid)}
            />
          </div>
          <FieldError id="err-phone" message={errors.phone} />
        </div>
        {detailsPrefilled && onClearDetails && (
          <button
            type="button"
            onClick={onClearDetails}
            className="min-h-[44px] text-xs text-muted-foreground underline underline-offset-2"
          >
            Not you? Clear details
          </button>
        )}
      </div>
{/* Notes for driver */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Instructions for driver <span className="opacity-50">(optional)</span></label>
        <textarea
          rows={2}
          placeholder="e.g. Call on arrival, extra luggage, AC preferred..."
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Date + Time */}
      {(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const minDate = now.toISOString().split('T')[0];
        const minTime = now.toTimeString().slice(0, 5);
        return (
          <div data-field="when">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={data.date}
                min={minDate}
                placeholder={minDate}
                aria-invalid={!!errors.when}
                aria-describedby={errors.when ? 'err-when' : undefined}
                onChange={(e) => update({ date: e.target.value })}
                className={cn('h-12 rounded-lg', errors.when && invalid)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {data.tripType === 'airport' ? 'Flight time' : 'Pickup time'}
              </label>
              <Input
                type="time"
                value={data.time}
                aria-invalid={!!errors.when}
                aria-describedby={errors.when ? 'err-when' : undefined}
                onChange={(e) => update({ time: e.target.value })}
                className={cn('h-12 rounded-lg', errors.when && invalid)}
              />
            </div>
          </div>
          <FieldError id="err-when" message={errors.when} />
          </div>
        );
      })()}
      {data.date && data.time && (
        <p className="text-xs text-muted-foreground -mt-2">
          {new Date(`${data.date}T${data.time}`).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      )}

      <div className="rounded-lg bg-muted/50 p-4">
        <FareEstimate data={data} />
      </div>

      <Button
        onClick={handleNext}
        className="w-full h-12 rounded-xl font-semibold justify-between px-4"
      >
        Next
        <ChevronRight className="h-5 w-5" />
      </Button>
    </Card>
  );
}
