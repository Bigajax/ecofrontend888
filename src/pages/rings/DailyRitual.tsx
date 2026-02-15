import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRings } from '@/contexts/RingsContext';
import { useProgram } from '@/contexts/ProgramContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPremium } from '@/hooks/usePremiumContent';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import mixpanel from '@/lib/mixpanel';
import { RINGS_ARRAY } from '@/constants/rings';
import RitualStep from '@/components/rings/RitualStep';
import RitualCompletion from '@/components/rings/RitualCompletion';
import RingIcon from '@/components/rings/RingIcon';
import RitualGuestGate from '@/components/rings/RitualGuestGate';
import LoginGateModal from '@/components/LoginGateModal';
import type { RingType, RingResponse } from '@/types/rings';

export default function DailyRitual() {
  const navigate = useNavigate();
  const { currentRitual, startRitual, saveRingAnswer, completeRitual } = useRings();
  const { ongoingProgram, updateProgress } = useProgram();
  const { user, isGuestMode, isVipUser } = useAuth();
  const isPremium = useIsPremium();
  const { trackInteraction } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOVO: Guest mode state (VIP users bypass all gates)
  const isGuest = isGuestMode && !user && !isVipUser;
  const GUEST_RING_LIMIT = 2; // Guests podem completar apenas 2 anéis (Earth e Water)
  const [showGuestGate, setShowGuestGate] = useState(false);

  // FREE TIER: Weekly ritual limit
  const [showFreeGate, setShowFreeGate] = useState(false);
  const canCompleteRitualToday = () => {
    if (!user || isPremium) return true; // Premium = unlimited

    const storageKey = `eco.rings.lastCompletion.${user.id}`;
    const lastCompletion = localStorage.getItem(storageKey);

    if (!lastCompletion) return true; // Nunca completou

    const lastDate = new Date(lastCompletion);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSince >= 7; // Pode completar se faz 7+ dias
  };

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

    // NOVO: Guest mode - bloquear após completar 2 anéis (antes de chegar no Anel 3/Fire)
    if (isGuest && currentStep >= GUEST_RING_LIMIT - 1) {
      // Guest completou 2 anéis (Earth + Water)
      // Próximo passo seria Fire (index 2), mas bloqueamos

      // Track completion
      trackInteraction('page_view', {
        page: '/rings/ritual',
        rings_completed: currentStep + 1,
      });

      // Trigger conversão
      checkTrigger(ConversionSignals.ringsCompleted(currentStep + 1));

      // Mostrar gate
      setShowGuestGate(true);
      return;
    }

    // FREE TIER: Weekly ritual limit - block if trying to complete a second ritual this week
    if (user && !isPremium && !isGuest && isLastStep) {
      if (!canCompleteRitualToday()) {
        // Track limit hit
        mixpanel.track('Free Tier Limit Blocked', {
          limit_type: 'weekly_rings',
          user_id: user.id,
        });

        // Show free tier gate
        setShowFreeGate(true);
        return;
      }
    }

    if (isLastStep) {
      // Complete the ritual
      setIsCompleting(true);
      completeRitual()
        .then(() => {
          // FREE TIER: Save completion date for weekly limit
          if (user && !isPremium && !isGuest) {
            const storageKey = `eco.rings.lastCompletion.${user.id}`;
            localStorage.setItem(storageKey, new Date().toISOString());
          }

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
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
        {/* Back Button - Top left no flow normal */}
        <div className="mb-8">
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--eco-text)] shadow-md border border-[var(--eco-line)] transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

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

        {/* Progress indicator at bottom */}
        <div className="mt-12 flex justify-center gap-2">
          {RINGS_ARRAY.map((ring, index) => (
            <button
              key={ring.id}
              onClick={() => setCurrentStep(index)}
              disabled={index > currentStep || (isGuest && index >= GUEST_RING_LIMIT)}
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

      {/* NOVO: Guest Gate (bloqueio no Anel 3/Fire) */}
      {isGuest && (
        <RitualGuestGate
          open={showGuestGate}
          currentDay={currentRitual?.day || 1}
          completedRings={currentStep + 1}
          onBack={() => navigate('/app/rings')}
        />
      )}

      {/* FREE TIER: Weekly ritual limit gate */}
      {user && !isPremium && !isGuest && (
        <LoginGateModal
          isOpen={showFreeGate}
          onClose={() => {
            setShowFreeGate(false);
            navigate('/app/rings'); // Voltar para hub
          }}
          context="rings_weekly_limit"
          isSoftPrompt={false} // Bloqueante
        />
      )}
    </div>
  );
}
