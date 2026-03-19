import { ArrowLeft, Phone, MessageSquare, Star, Clock, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CityTrackingProps {
  onBack: () => void;
}

export function CityTracking({ onBack }: CityTrackingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Map placeholder */}
      <div className="relative flex-1 min-h-[50vh] bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Simulated map with car dots */}
            <div className="w-64 h-64 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border border-dashed border-border flex items-center justify-center">
                <div className="relative">
                  <div className="h-4 w-4 rounded-full bg-success animate-pulse-dot" />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap">You</span>
                </div>
              </div>
            </div>
            {/* Car marker */}
            <div className="absolute top-8 right-12">
              <div className="relative">
                <span className="text-2xl">🚗</span>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">3 min</div>
              </div>
            </div>
            {/* Drop marker */}
            <div className="absolute bottom-4 left-8">
              <MapPin className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4">
          <button onClick={onBack} className="h-10 w-10 rounded-full bg-card shadow-elevated flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* ETA pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-elevated">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Navigation className="h-3.5 w-3.5" />
            <span>Arriving in 3 min</span>
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="bg-card rounded-t-[2rem] -mt-6 relative z-10 shadow-elevated">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
        <div className="px-6 pb-6">
          {/* Driver info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">SS</div>
            <div className="flex-1">
              <p className="text-sm font-bold">Suresh Sharma</p>
              <p className="text-xs text-muted-foreground">Maruti Dzire · RJ-14-CB-5678</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 fill-secondary text-secondary" />
                <span className="text-xs font-semibold">4.6</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="h-10 w-10 rounded-full">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-10 w-10 rounded-full">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Trip details */}
          <Card className="p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-success" />
                <div className="w-px h-6 bg-border" />
                <MapPin className="h-3 w-3 text-destructive" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">MI Road, Jaipur</p>
                  <span className="text-[10px] text-muted-foreground">Pickup</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Malviya Nagar</p>
                  <span className="text-[10px] text-muted-foreground">Drop</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~15 min</span>
              <span>6.2 km</span>
            </div>
            <span className="text-lg font-bold">₹180</span>
          </div>
        </div>
      </div>
    </div>
  );
}
