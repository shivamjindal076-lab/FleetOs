import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type SupabaseDriver } from '@/hooks/useSupabaseData';

interface NewBookingSheetProps {
  open: boolean;
  onClose: () => void;
  drivers: SupabaseDriver[];
}

interface FormValues {
  customerName: string;
  customerPhone: string;
  tripType: 'city' | 'airport' | 'sightseeing' | 'outstation';
  pickup: string;
  drop: string;
  date: string;
  time: string;
  fare: string;
  driverId: string;
  paymentMethod: 'cash' | 'upi' | 'card';
  notes: string;
}

const today = new Date().toISOString().split('T')[0];
const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:00`;

export function NewBookingSheet({ open, onClose, drivers }: NewBookingSheetProps) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      tripType: 'city',
      pickup: '',
      drop: '',
      date: today,
      time: currentHour,
      fare: '',
      driverId: '',
      paymentMethod: 'cash',
      notes: '',
    },
  });

  const tripType = watch('tripType');
  const paymentMethod = watch('paymentMethod');

  const onSubmit = async (data: FormValues) => {
    setSubmitLoading(true);
    setSubmitError(null);

    const scheduledAt = new Date(data.date + 'T' + data.time + ':00').toISOString();

    const { error } = await supabase
      .from('bookings table')
      .insert({
        customer_name: data.customerName,
        customer_phone: '+91' + data.customerPhone,
        trip_type: data.tripType,
        pickup: data.pickup,
        drop: data.drop,
        scheduled_at: scheduledAt,
        fare: parseFloat(data.fare) || null,
        driver_id: data.driverId ? parseInt(data.driverId) : null,
        payment_method: data.paymentMethod,
        notes: data.notes,
        status: 'pending',
        source: 'manual',
      });

    if (error) {
      setSubmitError(error.message);
      setSubmitLoading(false);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast('Booking saved ✓');
    reset();
    onClose();
    setSubmitLoading(false);
  };

  const freeDrivers = drivers.filter(d => d.status === 'free');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>New Booking</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Customer name</label>
            <Input
              autoFocus
              placeholder="Full name"
              {...register('customerName', { required: true })}
              className={errors.customerName ? 'border-destructive' : ''}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md border border-input">+91</span>
              <Input
                type="tel"
                placeholder="10-digit number"
                {...register('customerPhone', { required: true, minLength: 10 })}
                className={errors.customerPhone ? 'border-destructive flex-1' : 'flex-1'}
              />
            </div>
          </div>

          {/* Trip type */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Trip type</label>
            <div className="flex gap-2 flex-wrap">
              {(['city', 'airport', 'sightseeing', 'outstation'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue('tripType', type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    tripType === type
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'border-input text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Pickup */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Pickup</label>
            <Input
              placeholder="Pickup location"
              {...register('pickup', { required: true })}
              className={errors.pickup ? 'border-destructive' : ''}
            />
          </div>

          {/* Drop */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Drop</label>
            <Input placeholder="Drop location" {...register('drop')} />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input type="date" {...register('date')} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Time</label>
              <Input type="time" {...register('time')} />
            </div>
          </div>

          {/* Fare */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Fare</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md border border-input">₹</span>
              <Input type="number" placeholder="0" {...register('fare')} className="flex-1" />
            </div>
          </div>

          {/* Driver */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Assign driver</label>
            <select
              {...register('driverId')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Unassigned</option>
              {freeDrivers.map((driver) => (
                <option key={driver.id} value={String(driver.id)}>
                  {driver.name ?? 'Unknown'} — {driver.vehicle_model ?? 'N/A'}
                </option>
              ))}
            </select>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payment method</label>
            <div className="flex gap-2">
              {(['cash', 'upi', 'card'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setValue('paymentMethod', method)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                    paymentMethod === method
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'border-input text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes</label>
            <textarea
              rows={3}
              placeholder="Any special instructions..."
              {...register('notes')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={submitLoading}>
            {submitLoading ? 'Saving...' : 'Save Booking'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
