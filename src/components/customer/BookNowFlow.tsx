import { useState } from 'react';
import { ArrowLeft, MapPin, Navigation, Car, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CityTracking } from './CityTracking';

interface BookNowFlowProps {
  onBack: () => void;
}

type Step = 'input' | 'confirm' | 'tracking';

export function BookNowFlow({ onBack }: BookNowFlowProps) {
  const [step, setStep] = useState<Step>('input');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  if (step === 'tracking') {
    return <CityTracking onBack={() => setStep('confirm')} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-6 pt-12 pb-6 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-primary-foreground/70 mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">
            {step === 'input' ? 'Book a City Ride' : 'Confirm Your Ride'}
          </h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Instant pickup within Jaipur</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-4">
        {step === 'input' && (
          <Card className="p-5 shadow-elevated rounded-xl animate-slide-up">
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <div className="h-2.5 w-2.5 rounded-full bg-success" />
                </div>
                <Input
                  placeholder="Pickup location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="pl-9 h-12 rounded-lg"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Navigation className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                </div>
                <Input
                  placeholder="Where to?"
                  value={drop}
                  onChange={(e) => setDrop(e.target.value)}
                  className="pl-9 h-12 rounded-lg"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2">
                {['Malviya Nagar', 'C-Scheme', 'Vaishali Nagar', 'Mansarovar'].map((place) => (
                  <button
                    key={place}
                    onClick={() => setDrop(place)}
                    className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground hover:bg-muted/80 transition"
                  >
                    {place}
                  </button>
                ))}
              </div>

              <Button
                onClick={() => { setPickup(pickup || 'MI Road, Jaipur'); setDrop(drop || 'Malviya Nagar'); setStep('confirm'); }}
                className="w-full h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl font-semibold"
              >
                Find Rides
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

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Detected Trip Type</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚗</span>
                  <span className="text-sm font-bold">City Ride</span>
                  <span className="ml-auto px-2 py-0.5 bg-success/10 text-success text-xs font-semibold rounded-full">Zone 1</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 shadow-elevated rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Estimated Fare</span>
                <span className="text-2xl font-bold">₹180</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~15 min</span>
                <span className="flex items-center gap-1"><Car className="h-3 w-3" /> 6.2 km</span>
              </div>
            </Card>

            {/* Car Options */}
            <Card className="p-4 shadow-card rounded-xl border-2 border-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center text-lg">🚗</div>
                  <div>
                    <p className="text-sm font-semibold">Sedan</p>
                    <p className="text-xs text-muted-foreground">Etios, Dzire</p>
                  </div>
                </div>
                <p className="text-base font-bold">₹180</p>
              </div>
            </Card>

            <Card className="p-4 shadow-card rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">🚙</div>
                  <div>
                    <p className="text-sm font-semibold">SUV</p>
                    <p className="text-xs text-muted-foreground">Innova, Ertiga</p>
                  </div>
                </div>
                <p className="text-base font-bold">₹280</p>
              </div>
            </Card>

            <Button
              onClick={() => setStep('tracking')}
              className="w-full h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl text-base font-semibold"
            >
              Confirm Ride — ₹180
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
