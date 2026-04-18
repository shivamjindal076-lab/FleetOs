import { Car, Users, AlertTriangle } from 'lucide-react';
import { useBookings, useDrivers } from '@/hooks/useSupabaseData';

export function BentoStats() {
  const { data: bookings = [] } = useBookings();
  const { data: drivers = [] } = useDrivers();

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'in-progress').length;
  const driversOnline  = drivers.filter(d => d.status === 'free' || d.status === 'on-trip').length;
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;

  const cards = [
    {
      label: 'Active Bookings',
      value: activeBookings,
      tint: 'bg-card',
      blob: true,
      Icon: Car,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badge: null as null | { text: string; className: string },
    },
    {
      label: 'Drivers Online',
      value: driversOnline,
      tint: 'bg-card',
      blob: false,
      Icon: Users,
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
      badge: driversOnline > 0
        ? { text: `${driversOnline} active`, className: 'text-secondary bg-secondary/10' }
        : null,
    },
    {
      label: 'Pending',
      value: pendingCount,
      tint: pendingCount > 0 ? 'bg-destructive/5' : 'bg-card',
      blob: false,
      Icon: AlertTriangle,
      iconBg: pendingCount > 0 ? 'bg-destructive/10' : 'bg-muted',
      iconColor: pendingCount > 0 ? 'text-destructive' : 'text-muted-foreground',
      badge: pendingCount > 0
        ? { text: 'ACTION REQUIRED', className: 'text-destructive bg-destructive/10 font-black' }
        : { text: 'All clear', className: 'text-muted-foreground bg-muted' },
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-6 p-8 pb-0">
      {cards.map(({ label, value, tint, blob, Icon, iconBg, iconColor, badge }) => (
        <div
          key={label}
          className={`relative overflow-hidden ${tint} p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 hover:scale-[1.01] transition-transform group`}
        >
          {blob && (
            <div className="absolute top-0 right-0 w-32 h-32 kinetic-gradient opacity-5 rounded-bl-full -mr-8 -mt-8 group-hover:opacity-10 transition-opacity" />
          )}
          <div className="flex items-start justify-between mb-6">
            <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            {badge && (
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${badge.className}`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground font-label mb-1">
            {label}
          </p>
          <p className="text-5xl font-extrabold font-display tracking-tighter text-foreground">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
