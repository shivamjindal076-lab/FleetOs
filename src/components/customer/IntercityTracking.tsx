import { ArrowLeft, Phone, MapPin, Clock, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface IntercityTrackingProps {
  onBack: () => void;
}

export function IntercityTracking({ onBack }: IntercityTrackingProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-6 pt-12 pb-8 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <button onClick={onBack} className="flex items-center gap-2 text-primary-foreground/70 mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🛣️</span>
            <span className="text-xs text-primary-foreground/60 font-medium uppercase tracking-wider">Outstation Trip</span>
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">Jaipur → Delhi</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-4 space-y-4">
        {/* Simple ETA card - the main info intercity passengers want */}
        <Card className="p-6 shadow-elevated rounded-xl animate-slide-up">
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground mb-1">Estimated Arrival</p>
            <p className="text-3xl font-bold">10:30 AM</p>
            <p className="text-sm text-muted-foreground mt-1">~4 hrs 20 min remaining</p>
          </div>

          {/* Progress bar */}
          <div className="relative mb-3">
            <div className="h-2 bg-muted rounded-full">
              <div className="h-2 bg-secondary rounded-full w-[30%] transition-all" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[30%] -translate-x-1/2">
              <div className="h-4 w-4 rounded-full bg-secondary border-2 border-card shadow-sm" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Jaipur</span>
            <span>280 km</span>
            <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />Delhi</span>
          </div>
        </Card>

        {/* Signal warning */}
        <Card className="p-3 rounded-xl border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">Signal weak</span> — Last updated 2 mins ago (NH48, near Behror)
            </span>
          </div>
        </Card>

        {/* Driver card - the 3 things: name, number, call button */}
        <Card className="p-5 shadow-card rounded-xl">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Your Driver</p>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">RK</div>
            <div className="flex-1">
              <p className="text-base font-bold">Ramesh Kumar</p>
              <p className="text-sm text-muted-foreground">Toyota Etios · RJ-14-CA-1234</p>
              <p className="text-sm text-muted-foreground">+91 98291 45678</p>
            </div>
          </div>
          <Button className="w-full h-12 mt-4 bg-success text-success-foreground hover:bg-success/90 rounded-xl font-semibold">
            <Phone className="h-4 w-4 mr-2" />
            Call Driver
          </Button>
        </Card>

        {/* Trip details */}
        <Card className="p-5 shadow-card rounded-xl">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Trip Details</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route</span>
              <span className="font-semibold">Jaipur → Delhi (NH48)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-semibold">280 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started at</span>
              <span className="font-semibold">6:10 AM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fare</span>
              <span className="font-bold text-base">₹3,200</span>
            </div>
          </div>
        </Card>

        <div className="pb-8">
          <p className="text-xs text-center text-muted-foreground">
            Location updates every 30 seconds on highway
          </p>
        </div>
      </div>
    </div>
  );
}
