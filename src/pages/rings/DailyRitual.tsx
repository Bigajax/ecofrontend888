import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { useProgram } from '@/contexts/ProgramContext';
import { RINGS_ARRAY } from '@/constants/rings';
import RitualStep from '@/components/rings/RitualStep';
import RitualCompletion from '@/components/rings/RitualCompletion';
import RingIcon from '@/components/rings/RingIcon';
import type { RingType, RingResponse } from '@/types/rings';

export default function DailyRitual() {
  const navigate = useNavigate();
  const { currentRitual, startRitual, saveRingAnswer, completeRitual } = useRings();
  const { ongoingProgram, updateProgress } = useProgram();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure ritual exists
    if (!currentRitual) {
      startRitual();
    }
  }, [currentRitual, startRitual]);

  useEffect(() => {
    // Update program progress as user moves through rings
    if (ongoingProgram?.id === 'rec_1' && currentStep >= 0) {
      const progressPercentage = Math.round(((currentStep + 1) / RINGS_ARRAY.length) * 100);
      const ringName = RINGS_ARRAY[currentStep]?.displayName || `Anel ${currentStep + 1}`;
      updateProgress(progressPercentage, `${ringName} em andamento`);
    }
  }, [currentStep, ongoingProgram?.id, updateProgress]);

  if (!currentRitual) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-[var(--eco-muted)]">Carregando ritual...</p>
        </div>
      </div>
    );
  }

  const ring = RINGS_ARRAY[currentStep];
  const isLastStep = currentStep === RINGS_ARRAY.length - 1;
  const answeredCount = currentRitual.answers.length;

  const handleAnswerSaved = (ringId: RingType, answer: string, metadata: RingResponse) => {
    saveRingAnswer(ringId, answer, metadata);

    if (isLastStep) {
      // Complete the ritual
      setIsCompleting(true);
      completeRitual()
        .then(() => {
          // Show completion screen with animation
          setCurrentStep(RINGS_ARRAY.length); // Trigger completion view
        })
        .catch((err) => {
          setError(String(err));
          setIsCompleting(false);
        });
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1);
    }
  };

  // Completion screen
  if (currentStep === RINGS_ARRAY.length) {
    return <RitualCompletion onBackHome={() => navigate('/app/rings')} />;
  }

  return (
    <div className="min-h-screen bg-white font-primary">
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-8 md:py-16">
        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex gap-2">
            {RINGS_ARRAY.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-colors duration-300 ${
                  index <= currentStep ? 'bg-[var(--eco-user)]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-[var(--eco-muted)]">
            Passo {currentStep + 1} de {RINGS_ARRAY.length}
          </p>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6">
            <div className="text-[var(--eco-text)]">
              <RingIcon ringId={ring.id as any} size={56} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">
                {ring.titlePt}
              </h1>
              <p className="mt-2 italic text-[var(--eco-muted)]">"{ring.impactPhrase}"</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step content */}
        <RitualStep
          ring={ring}
          onSave={handleAnswerSaved}
          isLoading={isCompleting}
          existingAnswer={currentRitual.answers.find((a) => a.ringId === ring.id)}
        />

        {/* Navigation buttons */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              // Save current progress before leaving
              if (ongoingProgram?.id === 'rec_1' && currentStep > 0) {
                const progressPercentage = Math.round(((currentStep + 1) / RINGS_ARRAY.length) * 100);
                const ringName = RINGS_ARRAY[currentStep]?.displayName || `Anel ${currentStep + 1}`;
                updateProgress(progressPercentage, `Ritual Pausado no ${ringName}`);
              }

              if (currentStep > 0) {
                setCurrentStep(currentStep - 1);
              } else {
                navigate('/app/rings');
              }
            }}
            className="rounded-lg border border-[var(--eco-line)] bg-white px-6 py-3 font-medium text-[var(--eco-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] active:translate-y-0"
          >
            Voltar
          </button>
        </div>

        {/* Progress indicator at bottom */}
        <div className="mt-12 flex justify-center gap-2">
          {RINGS_ARRAY.map((ring, index) => (
            <button
              key={ring.id}
              onClick={() => setCurrentStep(index)}
              disabled={index > currentStep}
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                index === currentStep
                  ? 'bg-[var(--eco-user)] text-white shadow-[0_4px_20px_rgba(167,132,108,0.25)]'
                  : index < currentStep
                    ? 'bg-green-500 text-white shadow-[0_2px_12px_rgba(34,197,94,0.15)]'
                    : 'border border-[var(--eco-line)] bg-white text-[var(--eco-text)] shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
              }`}
              title={ring.titlePt}
            >
              {index < currentStep ? (
                <span className="text-sm">✓</span>
              ) : (
                <span className="text-[12px]">
                  <RingIcon ringId={ring.id as any} size={16} strokeWidth={2} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
