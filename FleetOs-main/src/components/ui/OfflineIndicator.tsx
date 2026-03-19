import { WifiOff, Signal, Clock, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface OfflineIndicatorProps {
  type: 'banner' | 'tracking' | 'full';
  lastUpdated?: string;
  cachedLocation?: string;
  signalStrength?: 'weak' | 'none';
  pendingActions?: number;
}

export function OfflineIndicator({ type, lastUpdated = '3 min ago', cachedLocation, signalStrength = 'weak', pendingActions = 0 }: OfflineIndicatorProps) {
  if (type === 'banner') {
    return (
      <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 flex items-center gap-2">
        <WifiOff className="h-3.5 w-3.5 text-warning" />
        <span className="text-xs font-semibold text-warning">
          {signalStrength === 'none' ? 'No connection' : 'Weak signal'}
        </span>
        <span className="text-xs text-muted-foreground">· Last sync {lastUpdated}</span>
        {pendingActions > 0 && (
          <Badge variant="outline" className="ml-auto text-[10px] bg-warning/10 text-warning border-warning/30">
            {pendingActions} pending
          </Badge>
        )}
      </div>
    );
  }

  if (type === 'tracking') {
    return (
      <Card className="p-4 border-warning/30 bg-warning/5">
        <div className="flex items-center gap-2 mb-3">
          <Signal className="h-4 w-4 text-warning" />
          <span className="text-sm font-bold text-warning">Signal weak</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Driver location last updated <span className="font-semibold text-foreground">{lastUpdated}</span>
        </p>
        {cachedLocation && (
          <p className="text-xs text-muted-foreground">Last known: {cachedLocation}</p>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="text-xs flex-1">
            <MessageSquare className="h-3 w-3 mr-1" /> SMS Driver
          </Button>
          <Button size="sm" variant="outline" className="text-xs flex-1">
            Call Driver
          </Button>
        </div>
      </Card>
    );
  }

  // Full offline mode
  return (
    <Card className="p-5 border-destructive/30 bg-destructive/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
          <WifiOff className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="font-bold text-sm">You're offline</p>
          <p className="text-xs text-muted-foreground">App working in offline mode</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Trip recording
          </span>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Active</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pending sync</span>
          <span className="font-semibold">{pendingActions} actions</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Cached map</span>
          <Badge variant="outline" className="text-xs">Jaipur 50km radius</Badge>
        </div>
      </div>

      <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">What works offline:</p>
        <ul className="space-y-1">
          <li>✅ Trip start/stop recording</li>
          <li>✅ Fare calculation (cached rates)</li>
          <li>✅ Offline maps (pre-downloaded area)</li>
          <li>✅ SMS fallback for updates</li>
          <li>❌ Real-time tracking (paused)</li>
          <li>❌ New ride requests</li>
        </ul>
      </div>

      <Button className="w-full mt-4" variant="outline">
        Force Sync When Connected
      </Button>
    </Card>
  );
}
