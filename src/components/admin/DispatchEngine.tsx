import { useState } from 'react';
import { Clock, Navigation, Phone, CheckCircle, AlertTriangle, Zap, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDrivers, tripTypeIcons, getDriverInitials, type SupabaseDriver, type SupabaseBooking } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

interface DispatchEngineProps {
  booking: SupabaseBooking | null;
  open: boolean;
  onClose: () => void;
  onAssign: (bookingId: number, driverId: number) => void;
}

interface DriverCandidate extends SupabaseDriver {
  distanceKm: number;
  etaMinutes: number;
  score: number;
  reason: string;
}

function rankDrivers(drivers: SupabaseDriver[]): DriverCandidate[] {
  const available = drivers.filter(d => d.status === 'free');
  return available.map((driver, i) => {
    const distanceKm = +(1.5 + i * 2.3).toFixed(1);
    const etaMinutes = Math.round(distanceKm * 3.2);
    const score = Math.max(+(100 - distanceKm * 5).toFixed(0), 20);
    return {
      ...driver,
      distanceKm,
      etaMinutes,
      score,
      reason: i === 0 ? 'Nearest + available' : i === 1 ? 'Moderate distance' : 'Fallback option',
    };
  }).sort((a, b) => b.score - a.score);
}

export function DispatchEngine({ booking, open, onClose, onAssign }: DispatchEngineProps) {
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assigned, setAssigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: drivers = [] } = useDrivers();

  if (!booking) return null;

  const candidates = rankDrivers(drivers);
  const topPick = candidates[0];

  const handleAssign = async (driverId: number) => {
    setAssigning(driverId);
    try {
      const { error } = await supabase
        .from('bookings table')
        .update({
          driver_id: driverId,
          status: 'confirmed',
        })
        .eq('id', booking.id);

      if (error) throw error;

      setAssigned(true);
      onAssign(booking.id, driverId);

      setTimeout(() => {
        setAssigned(false);
        setAssigning(null);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Dispatch error:', err);
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-secondary" />
            Dispatch — Assign Driver
          </DialogTitle>
          <DialogDescription>
            {tripTypeIcons[booking.trip_type ?? 'city']} {booking.pickup ?? '?'} → {booking.drop ?? '?'}
          </DialogDescription>
        </DialogHeader>

        {/* Booking summary */}
        <Card className="p-3 bg-muted/50">
          <div className="flex justify-between text-sm">
            <div>
              <p className="font-semibold">{booking.customer_name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{booking.customer_phone ?? 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">₹{booking.fare ?? 0}</p>
            </div>
          </div>
        </Card>

        {/* Auto-dispatch recommendation */}
        {topPick && !assigned && (
          <div className="border-2 border-success/40 rounded-xl p-3 bg-success/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-xs font-bold text-success uppercase tracking-wider">Recommended</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {getDriverInitials(topPick.name)}
                </div>
                <div>
                  <p className="text-sm font-bold">{topPick.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{topPick.vehicle_model ?? 'N/A'}</p>
                  <p className="text-xs text-success font-medium">{topPick.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{topPick.distanceKm} km</p>
                <p className="text-xs text-muted-foreground">{topPick.etaMinutes} min ETA</p>
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-success text-success-foreground hover:bg-success/90"
              size="sm"
              onClick={() => handleAssign(topPick.id)}
              disabled={!!assigning}
            >
              {assigning === topPick.id ? 'Assigning...' : 'Auto-Assign Best Match'}
            </Button>
          </div>
        )}

        {assigned && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
            <p className="font-bold text-success">Driver Assigned!</p>
            <p className="text-xs text-muted-foreground">Notification sent to driver</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        {/* All candidates */}
        {!assigned && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Available ({candidates.length})</h4>
              <Button variant="ghost" size="sm" className="text-xs h-7">
                <RotateCcw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>

            <div className="space-y-2">
              {candidates.map((driver) => (
                <Card key={driver.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {getDriverInitials(driver.name)}
                        </div>
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-bold">
                          {driver.score}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{driver.name ?? 'Unknown'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Navigation className="h-3 w-3" />{driver.distanceKm}km</span>
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{driver.etaMinutes}min</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="icon" variant="outline" className="h-8 w-8">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleAssign(driver.id)}
                        disabled={!!assigning}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {candidates.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-2" />
                <p className="font-semibold text-sm">No drivers available</p>
                <p className="text-xs text-muted-foreground mt-1">All drivers are on trips or offline</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs">
                  Notify All Offline Drivers
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
