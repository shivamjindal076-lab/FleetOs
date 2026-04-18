import { useDrivers, getDriverInitials, type SupabaseDriver } from '@/hooks/useSupabaseData';

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  free:             { label: 'Free',       dot: 'bg-success',     badge: 'bg-success/10 text-success' },
  'on-trip':        { label: 'In Transit', dot: 'bg-accent',      badge: 'bg-accent/10 text-amber-700' },
  offline:          { label: 'Offline',    dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive' },
  pending_approval: { label: 'Pending',    dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

interface DriverFleetListProps {
  onAssign: (driver: SupabaseDriver) => void;
}

export function DriverFleetList({ onAssign }: DriverFleetListProps) {
  const { data: drivers = [], isLoading } = useDrivers();

  return (
    <div className="col-span-5 bg-card rounded-[2rem] shadow-xl shadow-slate-200/40 p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-lg text-foreground">Driver Fleet</h3>
        <span className="text-xs text-muted-foreground font-label">{drivers.length} total</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No drivers yet</p>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
          {drivers.map(driver => {
            const cfg = statusConfig[driver.status ?? 'offline'] ?? statusConfig.offline;
            return (
              <div
                key={driver.id}
                className="bg-background p-4 rounded-2xl flex items-center gap-4 hover:shadow-lg transition-all"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full kinetic-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {getDriverInitials(driver.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{driver.name ?? 'Unknown'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-xs font-label px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Assign button */}
                {driver.status === 'free' && (
                  <button
                    onClick={() => onAssign(driver)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl kinetic-gradient text-white hover:opacity-90 transition-opacity flex-shrink-0"
                  >
                    Assign
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
