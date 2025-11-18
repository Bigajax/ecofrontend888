import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRings } from '@/contexts/RingsContext';
import { RINGS } from '@/constants/rings';
import RingIcon from '@/components/rings/RingIcon';

export default function RingDetail() {
  const { ringId } = useParams<{ ringId: string }>();
  const navigate = useNavigate();
  const { allRituals } = useRings();

  const ring = ringId ? RINGS[ringId] : null;

  if (!ring) {
    return (
      <div className="min-h-screen bg-[var(--eco-bg)]">
        <div className="mx-auto max-w-3xl px-4 py-8 text-center">
          <p className="text-[var(--eco-muted)]">Anel não encontrado</p>
          <button
            onClick={() => navigate('/app/rings')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--eco-user)] px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)]"
          >
            Voltar para os Cinco Anéis
          </button>
        </div>
      </div>
    );
  }

  // Get all responses for this ring
  const ringResponses = useMemo(() => {
    return allRituals
      .filter((r) => r.status === 'completed')
      .flatMap((ritual) =>
        ritual.answers
          .filter((a) => a.ringId === ringId)
          .map((answer) => ({
            ...answer,
            ritualDate: ritual.date,
          }))
      )
      .sort((a, b) => new Date(b.ritualDate).getTime() - new Date(a.ritualDate).getTime());
  }, [allRituals, ringId]);

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/app/rings')}
            className="rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-4 py-2 text-sm font-medium text-[var(--eco-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
          >
            ← Voltar
          </button>
        </div>

        {/* Ring hero section */}
        <div className="mb-12 rounded-2xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-6 md:gap-8">
            <div className="text-[var(--eco-text)]">
              <RingIcon ringId={ring.id as any} size={80} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">
                {ring.titlePt}
              </h1>
              <p className="mt-2 text-lg font-medium text-[var(--eco-user)]">{ring.subtitlePt}</p>
              <p className="mt-4 text-[var(--eco-muted)]">{ring.descriptionPt}</p>
              <p className="mt-4 italic text-[var(--eco-muted)]">"{ring.impactPhrase}"</p>
            </div>
          </div>
        </div>

        {/* Why it matters */}
        <div className="mb-12">
          <h2 className="mb-4 font-display text-2xl font-normal text-[var(--eco-text)]">
            Por que importa para disciplina?
          </h2>
          <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[var(--eco-muted)]">
              {ring.descriptionPt} O {ring.titlePt.toLowerCase()} é fundamental porque ajuda você a
              desenvolver consistência em todos os aspectos da vida.
            </p>
          </div>
        </div>

        {/* History */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-2xl font-normal text-[var(--eco-text)]">Histórico</h2>

          {ringResponses.length > 0 ? (
            <div className="space-y-4">
              {ringResponses.map((response, index) => {
                const date = new Date(response.ritualDate);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                let dateLabel = response.ritualDate === today.toISOString().split('T')[0] ? 'Hoje' :
                               response.ritualDate === yesterday.toISOString().split('T')[0] ? 'Ontem' :
                               date.toLocaleDateString('pt-BR');

                return (
                  <div key={index} className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <p className="mb-2 text-sm font-medium text-[var(--eco-muted)]">{dateLabel}</p>
                    <p className="rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-3 text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">{response.answer}</p>

                    {/* Show metadata */}
                    {response.metadata && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {response.metadata.focusScore !== undefined && (
                          <span className="rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            Foco: {response.metadata.focusScore}/10
                          </span>
                        )}
                        {response.metadata.emotionIntensity !== undefined && (
                          <span className="rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            Intensidade: {response.metadata.emotionIntensity}/10
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-8 text-center shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              <p className="text-[var(--eco-muted)]">Nenhuma resposta ainda para este anel</p>
              <button
                onClick={() => navigate('/app/rings/ritual')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--eco-user)] px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,132,108,0.25)]"
              >
                <span>Começar seu primeiro ritual</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
