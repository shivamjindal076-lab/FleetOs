import { tripTypeIcon } from '@/lib/tripTypeIcons';
import { cn } from '@/lib/utils';

export type TripType = 'local' | 'airport' | 'city_tour' | 'intercity' | 'multiday';

interface TripTypeSelectorProps {
  selected: TripType | null;
  onSelect: (type: TripType) => void;
  compact?: boolean;
}

const tripTypes: { id: TripType; label: string; desc: string }[] = [
  { id: 'local', label: 'Local drop', desc: 'Point to point' },
  { id: 'airport', label: 'Airport', desc: 'Flight tracked' },
  { id: 'city_tour', label: 'City tour', desc: 'Multi-stop day' },
  { id: 'intercity', label: 'Intercity', desc: 'One way or return' },
  { id: 'multiday', label: 'Multi-day', desc: 'Driver stays with you' },
];

export const tripTypeConfig = tripTypes;

export function TripTypeSelector({ selected, onSelect, compact = false }: TripTypeSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', compact && 'gap-2')}>
      {tripTypes.map((t, i) => {
        const isActive = selected === t.id;
        const isLast = i === tripTypes.length - 1;
        const Icon = tripTypeIcon(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            aria-pressed={isActive}
            className={cn(
              'min-h-[44px] rounded-xl border bg-card text-card-foreground transition-colors flex items-center',
              compact ? 'p-3 gap-2 text-left' : 'p-4 gap-2 flex-col text-center',
              isLast && !compact && 'col-span-2',
              isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            )}
          >
            <Icon className={cn('text-primary', compact ? 'h-5 w-5' : 'h-6 w-6')} aria-hidden />
            <span>
              <span className={cn('block font-semibold', compact ? 'text-xs' : 'text-sm')}>{t.label}</span>
              {!compact && <span className="block text-xs text-muted-foreground">{t.desc}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
