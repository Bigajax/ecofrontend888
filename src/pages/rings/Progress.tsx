import { getTodayDate } from '@/utils/dataLocal';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { RINGS_ARRAY } from '@/constants/rings';
import ProgressCard from '@/components/rings/ProgressCard';

export default function Progress() {
  const navigate = useNavigate();
  const { progress, loadProgress, allRituals } = useRings();

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (!progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--eco-bg)]">
        <div className="text-center">
          <p className="text-[var(--eco-muted)]">Carregando progresso...</p>
        </div>
      </div>
    );
  }

  // Calculate some stats
  const completedToday = allRituals.some((r) => r.date === getTodayDate() && r.status === 'completed');

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">Progresso</h1>
            <p className="mt-2 text-[var(--eco-muted)]">Veja como sua disciplina está evoluindo</p>
          </div>
          <button
            onClick={() => navigate('/app/rings')}
            className="rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-4 py-2 text-sm font-medium text-[var(--eco-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          >
            ← Voltar
          </button>
        </div>

        {/* Overall stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {/* Total days */}
          <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[var(--eco-muted)]">Dias Completados</p>
            <p className="mt-2 font-display text-3xl font-normal text-[var(--eco-text)]">
              {progress.totalDaysCompleted}
            </p>
          </div>

          {/* Current streak */}
          <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[var(--eco-muted)]">Sequência Atual</p>
            <p className="mt-2 font-display text-3xl font-normal text-orange-500">
              {progress.currentStreak}
            </p>
          </div>

          {/* Longest streak */}
          <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <p className="text-sm text-[var(--eco-muted)]">Maior Sequência</p>
            <p className="mt-2 font-display text-3xl font-normal text-[var(--eco-text)]">
              {progress.longestStreak}
            </p>
          </div>
        </div>

        {/* Per-ring cards */}
        <div className="mb-8 space-y-4">
          <h2 className="font-display text-2xl font-normal text-[var(--eco-text)]">Por Anel</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {RINGS_ARRAY.map((ring) => (
              <ProgressCard key={ring.id} ring={ring} allRituals={allRituals} />
            ))}
          </div>
        </div>

        {/* Call to action */}
        {!completedToday && (
          <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-8 text-center shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
            <p className="text-lg font-medium text-[var(--eco-text)]">
              Complete o ritual de hoje para melhorar seu progresso!
            </p>
            <button
              onClick={() => navigate('/app/rings/ritual')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--eco-user)] px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)]"
            >
              <span>Fazer Ritual</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
