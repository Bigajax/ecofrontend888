import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRings } from '@/contexts/RingsContext';
import { useProgram } from '@/contexts/ProgramContext';
import { RINGS_ARRAY } from '@/constants/rings';
import OnboardingModal from '@/components/rings/OnboardingModal';
import RingCard from '@/components/rings/RingCard';

export default function FiveRingsHub() {
  const navigate = useNavigate();
  const { showOnboarding, completeOnboarding, dismissOnboarding, currentRitual, progress } =
    useRings();
  const { ongoingProgram, updateProgress, resumeProgram } = useProgram();

  const ritualCompleted = currentRitual?.status === 'completed';

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resume program when page loads
  useEffect(() => {
    if (ongoingProgram?.id === 'rec_1') {
      resumeProgram();
    }
  }, [ongoingProgram?.id, resumeProgram]);

  // Update program progress continuously and handle completion
  useEffect(() => {
    if (ongoingProgram?.id === 'rec_1' && currentRitual) {
      // Calculate completion percentage based on current ritual responses
      const totalRings = RINGS_ARRAY.length;
      const ringResponses = currentRitual.responses?.length || 0;
      const completionPercentage = Math.round((ringResponses / totalRings) * 100);

      // Update progress with current state
      if (ritualCompleted) {
        // When ritual is 100% complete, mark as finished
        updateProgress(100, 'Ritual Completo! 🎉');
        // Note: completeProgram() will be called automatically when user returns to home
        // or on next mount detection
      } else if (ringResponses > 0) {
        // While in progress, update with current percentage
        const currentRing = RINGS_ARRAY[ringResponses - 1];
        updateProgress(completionPercentage, `${currentRing?.displayName || `Anel ${ringResponses}`} Completado`);
      }
    }
  }, [ongoingProgram?.id, currentRitual, ritualCompleted, updateProgress]);

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={completeOnboarding} onDismiss={dismissOnboarding} />
      )}

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate('/app')}
          className="mb-6 flex items-center gap-2 text-[14px] font-medium text-[var(--eco-user)] transition-all hover:gap-3"
        >
          <span>←</span>
          <span>Voltar para Home</span>
        </button>

        {/* Header */}
        <div className="mb-12 space-y-4">
          <div>
            <h1 className="font-display text-4xl font-normal text-[var(--eco-text)] md:text-5xl">
              Cinco Anéis da Disciplina
            </h1>
            <p className="mt-2 text-lg text-[var(--eco-muted)]">
              Um ritual diário para organizar foco, emoção e disciplina.
            </p>
          </div>

          {/* Status Card */}
          <div className="rounded-2xl border border-[var(--eco-line)] bg-gradient-to-r from-blue-50 to-purple-50 p-6 shadow-sm">
            {ritualCompleted ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--eco-muted)]">Ritual de Hoje</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--eco-user)]">
                    Concluído ✅
                  </p>
                  <p className="mt-2 text-sm text-[var(--eco-muted)]">
                    Volte amanhã para manter sua disciplina.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--eco-muted)]">Ritual de Hoje</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--eco-text)]">
                    Você ainda não fez o ritual de hoje
                  </p>
                  <p className="mt-2 text-sm text-[var(--eco-muted)]">
                    Dedique 2-3 minutos para responder os 5 anéis.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/app/rings/ritual')}
                  className="shrink-0 rounded-lg bg-[var(--eco-user)] px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Começar Ritual
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rings Grid */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {RINGS_ARRAY.map((ring) => (
            <RingCard
              key={ring.id}
              ring={ring}
              onViewMore={() => navigate(`/app/rings/detail/${ring.id}`)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate('/app/rings/timeline')}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--eco-line)] bg-white px-6 py-3 font-medium text-[var(--eco-text)] transition-all duration-300 hover:bg-gray-50 active:scale-95"
          >
            <span>📅</span>
            <span>Ver Linha do Tempo</span>
          </button>
          <button
            onClick={() => navigate('/app/rings/progress')}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--eco-line)] bg-white px-6 py-3 font-medium text-[var(--eco-text)] transition-all duration-300 hover:bg-gray-50 active:scale-95"
          >
            <span>📊</span>
            <span>Ver Progresso</span>
          </button>
        </div>

        {/* Stats Footer */}
        {progress && (
          <div className="mt-12 rounded-xl border border-[var(--eco-line)] bg-white/50 p-6 text-center">
            <p className="text-sm text-[var(--eco-muted)]">Seu compromisso</p>
            <p className="mt-2 font-display text-3xl font-normal text-[var(--eco-text)]">
              {progress.currentStreak} 🔥
            </p>
            <p className="mt-1 text-sm text-[var(--eco-muted)]">dias seguidos de disciplina</p>
          </div>
        )}
      </main>
    </div>
  );
}
