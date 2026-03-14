import { useState } from 'react';
import { ArrowLeft, MapPin, CalendarDays, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { tripTypeLabels, tripTypeIcons } from '@/hooks/useSupabaseData';
import { IntercityTracking } from './IntercityTracking';

interface ScheduleRideFlowProps {
  onBack: () => void;
}

type Step = 'input' | 'confirm' | 'success' | 'tracking';
type TripType = 'city' | 'airport' | 'sightseeing' | 'outstation';

const fareEstimates: Record<TripType, number> = { city: 180, airport: 450, sightseeing: 2200, outstation: 3200 };

export function ScheduleRideFlow({ onBack }: ScheduleRideFlowProps) {
  const [step, setStep] = useState<Step>('input');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [detectedType, setDetectedType] = useState<TripType>('outstation');
  const [roundTrip, setRoundTrip] = useState(false);

  const detectTripType = (dropLocation: string) => {
    const lower = dropLocation.toLowerCase();
    if (lower.includes('airport')) return 'airport';
    if (lower.includes('fort') || lower.includes('palace') || lower.includes('sightseeing')) return 'sightseeing';
    if (lower.includes('delhi') || lower.includes('udaipur') || lower.includes('ajmer') || lower.includes('jodhpur')) return 'outstation';
    return 'city';
  };

  const handleDropChange = (val: string) => {
    setDrop(val);
    setDetectedType(detectTripType(val));
  };

  if (step === 'tracking') {
    return <IntercityTracking onBack={() => setStep('success')} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-6 pt-12 pb-6 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <button onClick={step === 'input' ? onBack : () => setStep('input')} className="flex items-center gap-2 text-primary-foreground/70 mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">Schedule a Ride</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">City, airport, sightseeing & outstation</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-4">
        {step === 'input' && (
          <Card className="p-5 shadow-elevated rounded-xl animate-slide-up">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-success" />
                <Input placeholder="Pickup location" value={pickup} onChange={(e) => setPickup(e.target.value)} className="pl-9 h-12 rounded-lg" />
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2"><MapPin className="h-3.5 w-3.5 text-destructive" /></div>
                <Input placeholder="Destination" value={drop} onChange={(e) => handleDropChange(e.target.value)} className="pl-9 h-12 rounded-lg" />
              </div>

              {/* Quick destinations */}
              <div className="flex flex-wrap gap-2">
                {['Delhi', 'Jaipur Airport', 'Udaipur', 'Amber Fort Tour'].map((dest) => (
                  <button key={dest} onClick={() => handleDropChange(dest)} className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground hover:bg-muted/80 transition">
                    {dest}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 rounded-lg" />
                </div>
              </div>

              {drop && (
                <div className="p-3 bg-muted rounded-lg animate-slide-up">
                  <p className="text-xs text-muted-foreground mb-1">Detected Trip Type</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tripTypeIcons[detectedType]}</span>
                    <span className="text-sm font-bold">{tripTypeLabels[detectedType]}</span>
                  </div>

                  {(detectedType === 'outstation') && (
                    <button onClick={() => setRoundTrip(!roundTrip)} className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {roundTrip ? <ToggleRight className="h-4 w-4 text-secondary" /> : <ToggleLeft className="h-4 w-4" />}
                      {roundTrip ? 'Round Trip' : 'One Way'}
                    </button>
                  )}

                  {detectedType === 'sightseeing' && (
                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 bg-secondary/20 text-secondary-foreground text-xs font-semibold rounded-full border border-secondary">Half Day (4hrs)</button>
                      <button className="px-3 py-1 bg-card text-xs font-medium rounded-full border">Full Day (8hrs)</button>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => { setPickup(pickup || 'Vaishali Nagar, Jaipur'); setDrop(drop || 'Delhi'); setDate(date || '2026-03-07'); setTime(time || '05:30'); setStep('confirm'); }}
                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold"
              >
                Get Fare Estimate
              </Button>
            </div>
          </Card>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 animate-slide-up">
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
                    <p className="text-sm font-semibold">{pickup}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Drop</p>
                    <p className="text-sm font-semibold">{drop}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
              </div>
            </Card>

            <Card className="p-5 shadow-elevated rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{tripTypeIcons[detectedType]}</span>
                <span className="text-sm font-bold">{tripTypeLabels[detectedType]}</span>
                {roundTrip && <span className="ml-auto px-2 py-0.5 bg-muted text-xs font-medium rounded-full">Round Trip</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Fare</span>
                <span className="text-2xl font-bold">₹{fareEstimates[detectedType].toLocaleString()}{roundTrip ? ' ×2' : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Final fare may vary based on route and stops</p>
            </Card>

            <Button
              onClick={() => setStep('success')}
              className="w-full h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl text-base font-semibold"
            >
              Confirm Booking
            </Button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-12 animate-slide-up">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Booking Confirmed!</h2>
            <p className="text-sm text-muted-foreground mb-2">{tripTypeLabels[detectedType]}: {pickup} → {drop}</p>
            <p className="text-sm text-muted-foreground mb-6">{date} at {time}</p>

            <Card className="p-4 shadow-card rounded-xl text-left mb-4">
              <p className="text-xs text-muted-foreground mb-1">Driver Assigned</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">RK</div>
                <div>
                  <p className="text-sm font-semibold">Ramesh Kumar</p>
                  <p className="text-xs text-muted-foreground">Toyota Etios · RJ-14-CA-1234</p>
                </div>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground mb-4">You'll receive SMS + app reminders before the trip</p>

            <div className="space-y-3">
              <Button
                onClick={() => setStep('tracking')}
                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold"
              >
                Track Trip
              </Button>
              <Button onClick={onBack} variant="outline" className="w-full h-12 rounded-xl">
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
