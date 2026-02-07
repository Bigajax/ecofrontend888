import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useRings } from '@/contexts/RingsContext';
import { useProgram } from '@/contexts/ProgramContext';
import { useAuth } from '@/contexts/AuthContext';
import { RINGS_ARRAY } from '@/constants/rings';
import OnboardingModal from '@/components/rings/OnboardingModal';
import RingCard from '@/components/rings/RingCard';
import HomeHeader from '@/components/home/HomeHeader';
import { ArrowLeft, Lock } from 'lucide-react';

export default function FiveRingsHub() {
  const navigate = useNavigate();
  const { showOnboarding, completeOnboarding, dismissOnboarding, currentRitual, progress } =
    useRings();
  const { ongoingProgram, updateProgress, resumeProgram } = useProgram();
  const { user, isGuestMode } = useAuth();

  const ritualCompleted = currentRitual?.status === 'completed';
  const isGuest = isGuestMode && !user;

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
    <div className="min-h-screen bg-white font-primary">
      {/* Header */}
      <HomeHeader />

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={completeOnboarding} onDismiss={dismissOnboarding} />
      )}

      <main className="relative mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/app')}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--eco-text)] shadow-md border border-[var(--eco-line)] transition-all hover:bg-gray-50 hover:shadow-lg active:scale-95 md:left-8 md:top-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-12 space-y-4 pt-16 md:pt-4">
          <div>
            <h1 className="font-display text-4xl font-normal text-[var(--eco-text)] md:text-5xl">
              Cinco Anéis da Disciplina
            </h1>
            <p className="mt-2 text-lg text-[var(--eco-muted)]">
              Um ritual diário para organizar foco, emoção e disciplina.
            </p>
          </div>

          {/* NOVO: Guest Mode Info Banner */}
          {isGuest && (
            <div className="rounded-2xl border-2 border-eco-accent/30 bg-gradient-to-br from-eco-accent/5 to-eco-user/5 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Lock size={24} className="text-eco-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-eco-text mb-2">
                    Experimente o Five Rings
                  </h3>
                  <p className="text-sm text-eco-text/80 leading-relaxed mb-3">
                    Como convidado, você pode experimentar os primeiros 2 dias do programa.
                    Complete os Anéis da Terra e da Água para sentir a prática.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-eco-muted">
                    <span>✓ 2 dias de prática</span>
                    <span>•</span>
                    <span>✓ Todos os 5 anéis</span>
                    <span>•</span>
                    <span>🔒 28 dias restantes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className="rounded-2xl border border-[var(--eco-line)] bg-white p-6 shadow-sm">
            {ritualCompleted ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--eco-muted)]">Ritual de Hoje</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--eco-user)]">
                    Concluído ✅
                  </p>
                  <p className="mt-2 text-sm text-[var(--eco-muted)]">
                    {isGuest
                      ? 'Crie sua conta para continuar sua jornada de 30 dias.'
                      : 'Volte amanhã para manter sua disciplina.'}
                  </p>
                </div>
                {isGuest && (
                  <button
                    onClick={() => navigate('/register?returnTo=/app/rings')}
                    className="shrink-0 rounded-lg bg-gradient-to-r from-eco-user to-eco-accent px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Criar Conta
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--eco-muted)]">Ritual de Hoje</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--eco-text)]">
                    Você ainda não fez o ritual de hoje
                  </p>
                  <p className="mt-2 text-sm text-[var(--eco-muted)]">
                    {isGuest
                      ? 'Dedique 2-3 minutos para experimentar os primeiros anéis.'
                      : 'Dedique 2-3 minutos para responder os 5 anéis.'}
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
