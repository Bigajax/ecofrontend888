/**
 * Abundância Completion Screen
 *
 * Tela de conclusão temática dourada para o Código da Abundância.
 * Mostra progresso, próxima sessão e feedback — tudo no design escuro/dourado.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Lock, Sparkles } from 'lucide-react';
import { PROTOCOL_SESSIONS } from '@/data/protocolAbundancia';
import { useAbundanciaEntitlement } from '@/hooks/useAbundanciaEntitlement';
import { useAuth } from '@/contexts/AuthContext';
import MeditationFeedback from '@/components/meditation/MeditationFeedback';
import { submitMeditationFeedback } from '@/api/meditationFeedback';
import { trackMeditationFeedback } from '@/analytics/meditation';

const GOLD = '#FFB932';
const GOLD_DARK = '#C49A00';

const DAY_MESSAGES: Record<number, string> = {
  1: 'O diagnóstico está feito. Você já sabe o que estava te bloqueando.',
  2: 'O contrato antigo foi desfeito. Você está mais livre para receber.',
  3: 'Você sintonizou a frequência do receber. Algo mudou em você.',
  4: 'Seu cérebro agora carrega a memória do futuro próspero.',
  5: 'A gratidão genuína abriu novos caminhos de oportunidade.',
  6: 'Você se deu permissão para merecer. Sem culpa.',
  7: 'Em 7 dias, você reprogramou os padrões que afastavam a prosperidade. A abundância agora é parte de quem você é.',
};

interface Props {
  meditationId: string;
  meditationTitle: string;
  meditationDuration: number;
  onDismiss: () => void;
  sessionMetrics?: {
    pauseCount: number;
    skipCount: number;
    actualPlayTime: number;
  };
}

export default function AbundanciaCompletion({
  meditationId,
  meditationTitle,
  meditationDuration,
  onDismiss,
  sessionMetrics,
}: Props) {
  const navigate = useNavigate();
  const { isVipUser } = useAuth();
  const { hasAccess: hasAbundanciaEntitlement } = useAbundanciaEntitlement();
  const isPaid = isVipUser || hasAbundanciaEntitlement;

  const currentSessionNum = parseInt(meditationId.replace('abundancia_', ''), 10);
  const isAllComplete = currentSessionNum >= 7;

  const nextSession = useMemo(() => {
    if (isAllComplete) return null;
    return PROTOCOL_SESSIONS.find(s => s.session === currentSessionNum + 1) ?? null;
  }, [currentSessionNum, isAllComplete]);

  const isNextLocked = nextSession ? (!nextSession.isFree && !isPaid) : false;

  const handlePlayNext = () => {
    if (!nextSession) return;
    if (isNextLocked) {
      navigate('/app/codigo-da-abundancia');
      return;
    }
    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: nextSession.id,
          title: `Dia ${nextSession.session} – ${nextSession.title}`,
          duration: nextSession.duration,
          audioUrl: nextSession.audioUrl,
          imageUrl: nextSession.imageUrl ?? '/images/abundancia-diagnostico.webp',
          backgroundMusic: 'Abundância',
          gradient: nextSession.gradient,
          category: 'abundancia',
          isPremium: !nextSession.isFree,
        },
        returnTo: '/app/codigo-da-abundancia',
      },
    });
  };

  const handleFeedbackSubmitted = async (vote: 'positive' | 'negative', reasons?: string[]) => {
    const payload = {
      vote,
      reasons,
      meditation_id: meditationId,
      meditation_title: meditationTitle,
      meditation_duration_seconds: meditationDuration,
      meditation_category: 'abundancia',
      actual_play_time_seconds: sessionMetrics?.actualPlayTime || meditationDuration,
      completion_percentage: sessionMetrics?.actualPlayTime
        ? Math.round((sessionMetrics.actualPlayTime / meditationDuration) * 100)
        : 100,
      pause_count: sessionMetrics?.pauseCount || 0,
      skip_count: sessionMetrics?.skipCount || 0,
      seek_count: 0,
      feedback_source: 'meditation_completion',
    };
    try {
      await submitMeditationFeedback(payload);
    } catch {
      // não bloqueia a UX
    }
    trackMeditationFeedback(
      vote,
      {
        meditationId,
        meditationTitle,
        meditationDuration,
        meditationCategory: 'abundancia',
        actualPlayTime: sessionMetrics?.actualPlayTime,
        pauseCount: sessionMetrics?.pauseCount,
        skipCount: sessionMetrics?.skipCount,
      },
      reasons
    );
  };

  const message = DAY_MESSAGES[currentSessionNum] ?? 'Sessão concluída.';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-primary" style={{ background: '#09090F' }}>

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 10%, rgba(255,185,50,0.09) 0%, transparent 70%)' }}
      />

      {/* Back button */}
      <button
        onClick={onDismiss}
        className="fixed top-3 left-3 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-95"
        style={{ background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.35)' }}
        aria-label="Voltar"
      >
        <ChevronLeft className="w-5 h-5" style={{ color: GOLD }} />
      </button>

      <div className="min-h-screen flex items-center justify-center py-20 px-5">
        <motion.div
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >

          {/* Icon + título */}
          <div className="text-center space-y-3">
            <motion.div
              className="flex justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(255,185,50,0.15)',
                  border: `2px solid rgba(255,185,50,0.45)`,
                  boxShadow: '0 0 32px rgba(255,185,50,0.18)',
                }}
              >
                <Sparkles className="w-7 h-7" style={{ color: GOLD }} />
              </div>
            </motion.div>

            <motion.h1
              className="text-3xl font-bold font-display"
              style={{ color: GOLD, textShadow: '0 2px 20px rgba(255,185,50,0.35)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isAllComplete ? 'Código Ativado!' : 'Muito bem!'}
            </motion.h1>

            <motion.p
              className="text-sm leading-relaxed px-2"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {message}
            </motion.p>
          </div>

          {/* Badge dia X de 7 */}
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <div
              className="px-5 py-2 rounded-full text-sm font-semibold"
              style={{
                background: 'rgba(255,185,50,0.10)',
                border: '1px solid rgba(255,185,50,0.28)',
                color: GOLD,
              }}
            >
              Dia {currentSessionNum} de 7 concluído ✨
            </div>
          </motion.div>

          {/* Barra de progresso com pontos */}
          <motion.div
            className="flex justify-center items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i + 1 === currentSessionNum ? 28 : 8,
                  height: 8,
                  background: i + 1 <= currentSessionNum ? GOLD : 'rgba(255,185,50,0.18)',
                  boxShadow: i + 1 === currentSessionNum ? `0 0 8px ${GOLD}` : 'none',
                }}
              />
            ))}
          </motion.div>

          {/* Card próxima sessão */}
          {nextSession && (
            <motion.div
              className="rounded-2xl px-5 py-5"
              style={{
                background: 'rgba(255,185,50,0.06)',
                border: '1px solid rgba(255,185,50,0.22)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(255,185,50,0.5)' }}
              >
                Próxima sessão
              </p>
              <p className="text-base font-semibold text-white leading-snug">
                Dia {nextSession.session} – {nextSession.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {nextSession.description}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handlePlayNext}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 hover:scale-105"
                  style={isNextLocked
                    ? { background: 'rgba(255,185,50,0.10)', color: 'rgba(255,185,50,0.45)', border: '1px solid rgba(255,185,50,0.2)' }
                    : { background: GOLD, color: '#09090F', boxShadow: `0 4px 18px rgba(255,185,50,0.35)` }
                  }
                >
                  {isNextLocked
                    ? <><Lock className="h-3.5 w-3.5" /> Desbloquear</>
                    : <><Play className="h-3.5 w-3.5" fill="currentColor" /> Iniciar Dia {nextSession.session}</>
                  }
                </button>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {nextSession.duration}
                </span>
              </div>
            </motion.div>
          )}

          {/* Protocolo completo */}
          {isAllComplete && (
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <button
                onClick={() => navigate('/app/codigo-da-abundancia')}
                className="w-full rounded-full py-3.5 text-sm font-semibold transition-all active:scale-95 hover:scale-105"
                style={{ background: GOLD, color: '#09090F', boxShadow: `0 4px 24px rgba(255,185,50,0.35)` }}
              >
                Ver meu progresso completo
              </button>
              <button
                onClick={() => navigate('/app')}
                className="w-full rounded-full py-3 text-sm transition-all active:scale-95"
                style={{ color: 'rgba(255,185,50,0.5)' }}
              >
                Explorar outros programas
              </button>
            </motion.div>
          )}

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,185,50,0.12)' }} />

          {/* Feedback — reutiliza componente existente com override de cor via CSS var */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <MeditationFeedback
              meditationId={meditationId}
              meditationTitle={meditationTitle}
              meditationCategory="abundancia"
              meditationDuration={meditationDuration}
              sessionMetrics={sessionMetrics}
              onFeedbackSubmitted={handleFeedbackSubmitted}
              theme="dark"
            />
          </motion.div>

          {/* Espaço no fim */}
          <div style={{ height: 16 }} />

        </motion.div>
      </div>
    </div>
  );
}
