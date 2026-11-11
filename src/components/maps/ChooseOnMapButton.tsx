import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapPinPicker } from './MapPinPicker';

interface ChooseOnMapButtonProps {
  /** Current text of the field, so the map opens on it. */
  value: string;
  /** Called with the address of the confirmed pin. */
  onPick: (address: string) => void;
  /** Heading of the sheet and accessible name of an icon-only button. */
  title?: string;
  iconOnly?: boolean;
  className?: string;
}

export function ChooseOnMapButton({ value, onPick, title = 'Choose on map', iconOnly = false, className }: ChooseOnMapButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? title : undefined}
        className={cn(
          iconOnly
            ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary'
            : 'inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <MapPin className="h-4 w-4" aria-hidden />
        {!iconOnly && 'Choose on map'}
      </button>
      {open && (
        <MapPinPicker
          open={open}
          onOpenChange={setOpen}
          initialAddress={value}
          title={title}
          onConfirm={(location) => onPick(location.address)}
        />
      )}
    </>
  );
}
