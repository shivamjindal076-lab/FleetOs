import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type TripType = 'local' | 'airport' | 'city_tour' | 'intercity' | 'multiday';

interface TripTypeSelectorProps {
  selected: TripType | null;
  onSelect: (type: TripType) => void;
  compact?: boolean;
}

const tripTypes: { id: TripType; emoji: string; label: string; desc: string }[] = [
  { id: 'local', emoji: '🚗', label: 'Local Drop', desc: 'Point to point' },
  { id: 'airport', emoji: '✈️', label: 'Airport', desc: 'Flight tracked' },
  { id: 'city_tour', emoji: '🗺️', label: 'City Tour', desc: 'Multi-stop day' },
  { id: 'intercity', emoji: '🛣️', label: 'Intercity', desc: 'One way / return' },
  { id: 'multiday', emoji: '📅', label: 'Multi-day', desc: 'Driver stays with customer' },
];

export const tripTypeConfig = tripTypes;

export function TripTypeSelector({ selected, onSelect, compact = false }: TripTypeSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', compact && 'gap-2')}>
      {tripTypes.map((t, i) => {
        const isActive = selected === t.id;
        const isLast = i === tripTypes.length - 1;
        return (
          <Card
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={cn(
              'cursor-pointer transition-all rounded-xl border-2 flex items-center',
              compact ? 'p-3 gap-2' : 'p-5 flex-col gap-1',
              isLast && !compact && 'col-span-2',
              isActive
                ? 'border-secondary bg-secondary/10 shadow-md'
                : 'border-transparent hover:border-muted-foreground/20'
            )}
          >
            <span className={compact ? 'text-xl' : 'text-3xl'}>{t.emoji}</span>
            <div className={compact ? '' : 'text-center'}>
              <p className={cn('font-bold', compact ? 'text-xs' : 'text-sm')}>{t.label}</p>
              {!compact && <p className="text-xs text-muted-foreground">{t.desc}</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
