import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TripTypeSelector, TripType } from './TripTypeSelector';
import { BookingForm, BookingFormData, defaultFormData } from './BookingForm';
import { BookingSummary } from './BookingSummary';

interface BookingFlowProps {
  onBack: () => void;
  initialData?: { pickup?: string | null; drop?: string | null; trip_type?: string | null; fare?: number | null } | null;
}

type Step = 'type' | 'form' | 'summary';

const stepLabels: Record<Step, string> = {
  type: 'Trip type',
  form: 'Trip details',
  summary: 'Review and confirm',
};

// Maps DB trip_type values to BookingForm TripType
const dbTypeToTripType: Record<string, TripType> = {
  city: 'local',
  airport: 'airport',
  outstation: 'intercity',
  sightseeing: 'city_tour',
};

function buildInitialFormData(initialData: BookingFlowProps['initialData']): BookingFormData {
  if (!initialData) return defaultFormData;
  const tripType: TripType = dbTypeToTripType[initialData.trip_type ?? ''] ?? 'local';
  return {
    ...defaultFormData,
    tripType,
    pickup: initialData.pickup ?? '',
    drop: initialData.drop ?? '',
  };
}

export function BookingFlow({ onBack, initialData }: BookingFlowProps) {
  const [step, setStep] = useState<Step>(initialData ? 'form' : 'type');
const [formData, setFormData] = useState<BookingFormData>(() => {
    const base = buildInitialFormData(initialData);
    if (!base.date && !base.time) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      base.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      base.time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    return base;
  });
 const handleTypeSelect = (type: TripType) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFormData({
      ...defaultFormData,
      tripType: type,
      date: localDate,
      time: localTime,
    });
    setStep('form');
  };

  const stepIndex = step === 'type' ? 0 : step === 'form' ? 1 : 2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-6 pt-12 pb-6 rounded-b-xl">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              if (step === 'type') onBack();
              else if (step === 'form') setStep('type');
              else setStep('form');
            }}
            className="-ml-2 mb-4 flex min-h-[44px] items-center gap-2 px-2 text-primary-foreground/80"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">{stepLabels[step]}</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Step {stepIndex + 1} of 3</p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= stepIndex ? 'bg-primary-foreground w-8' : 'bg-primary-foreground/30 w-4'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 pb-8">
        {step === 'type' && (
          <div className="animate-slide-up">
            <TripTypeSelector selected={formData.tripType} onSelect={handleTypeSelect} />
          </div>
        )}

        {step === 'form' && (
          <BookingForm
            data={formData}
            onChange={setFormData}
            onNext={() => setStep('summary')}
          />
        )}

        {step === 'summary' && (
          <BookingSummary
            data={formData}
            onEdit={() => setStep('form')}
            onDone={onBack}
          />
        )}
      </div>
    </div>
  );
}
