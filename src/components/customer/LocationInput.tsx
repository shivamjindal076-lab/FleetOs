import { useState } from 'react';
import { MapPin, Info, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LocationInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon?: 'pickup' | 'drop';
}

const PLUS_CODE_REGEX = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}(\s.+)?$/i;

export function LocationInput({ value, onChange, placeholder, icon = 'drop' }: LocationInputProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const isPlusCode = PLUS_CODE_REGEX.test(value.trim());

  return (
    <div className="space-y-1">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {icon === 'pickup' ? (
            <div className="h-2.5 w-2.5 rounded-full bg-success" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10 h-12 rounded-lg"
        />
        <Popover open={infoOpen} onOpenChange={setInfoOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted flex items-center justify-center"
            >
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 text-sm" align="end">
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-foreground">How to share your exact location</p>
              <button onClick={() => setInfoOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-2 text-muted-foreground text-xs">
              <p><strong className="text-foreground">Option 1</strong> — Type your address normally</p>
              <p><strong className="text-foreground">Option 2</strong> — Use a Google Plus Code</p>
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">To get your Plus Code:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open Google Maps</li>
                  <li>Long press your exact location</li>
                  <li>Tap the Plus Code shown at the top</li>
                  <li>Copy and paste it here</li>
                </ol>
              </div>
              <p>Plus Codes work even without a street address.</p>
              <p className="font-medium text-foreground">Example: 7JVW+XG Jaipur</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {isPlusCode && (
        <p className="text-xs text-success ml-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Plus Code detected
        </p>
      )}
    </div>
  );
}
