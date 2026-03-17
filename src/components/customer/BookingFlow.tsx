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
  type: 'Select Trip Type',
  form: 'Trip Details',
  summary: 'Review & Confirm',
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
  const [formData, setFormData] = useState<BookingFormData>(() => buildInitialFormData(initialData));

  const handleTypeSelect = (type: TripType) => {
    setFormData({ ...defaultFormData, tripType: type });
    setStep('form');
  };

  const stepIndex = step === 'type' ? 0 : step === 'form' ? 1 : 2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-6 pt-12 pb-6 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => {
              if (step === 'type') onBack();
              else if (step === 'form') setStep('type');
              else setStep('form');
            }}
            className="flex items-center gap-2 text-primary-foreground/70 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">{stepLabels[step]}</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Book any trip type</p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= stepIndex ? 'bg-secondary w-8' : 'bg-primary-foreground/20 w-4'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-4">
        {step === 'type' && (
          <div className="animate-slide-up pt-2">
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
