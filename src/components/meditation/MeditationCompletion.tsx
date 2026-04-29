/**
 * Meditation Completion Screen
 *
 * Full-screen celebration shown after meditation completes (≥95% or ended).
 * For sono guest locked: shows high-impact conversion hero instead of nextNight card.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SonoGuestPostFlow } from '@/components/sono/SonoGuestPostFlow';
import { ChevronLeft, Moon, Play, Lock, BookOpen, Loader2 } from 'lucide-react';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { useMeditationStreak } from '@/hooks/useMeditationStreak';
import { trackMeditationFeedback } from '@/analytics/meditation';
import { submitMeditationFeedback } from '@/api/meditationFeedback';
import DiarioEstoicoCard from '@/components/diario-estoico/DiarioEstoicoCard';
import MeditationFeedback from '@/components/meditation/MeditationFeedback';
import { trackDiarioViewedPostMeditation } from '@/lib/mixpanelDiarioEvents';
import { useAuth } from '@/contexts/AuthContext';

const BLUE_SOFT = 'rgba(148,136,196,0.12)';
const BLUE_BORDER = 'rgba(148,136,196,0.28)';

interface RelatedMeditation {
  id: string;
  title: string;
  duration: string;
  imageUrl: string;
  audioUrl: string;
  gradient: string;
  isPremium: boolean;
  category: string;
  returnTo: string;
  dayLabel?: string;
}

const RELATED_BY_CATEGORY: Record<string, RelatedMeditation[]> = {
  sono: [
    { id: 'night_1', title: 'Desligando o Estado de Alerta', duration: '5 min', imageUrl: '/images/desligando-estado-alerta.png', audioUrl: '/audio/desligando-estado-alerta.mp3', gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'night_2', title: 'Respiração que Induz o Sono', duration: '5 min', imageUrl: '/images/respiracao-induz-sono.webp', audioUrl: '/audio/respiracao-induz-sono.mp3', gradient: 'linear-gradient(to bottom, #6B5B95 0%, #251A45 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'night_3', title: 'Esvaziando Pensamentos Repetitivos', duration: '5 min', imageUrl: '/images/esvaziando-pensamentos.webp', audioUrl: '/audio/esvaziando-pensamentos.mp3', gradient: 'linear-gradient(to bottom, #5B6B95 0%, #1A2545 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'blessing_8', title: 'Meditação do Sono', duration: '15 min', imageUrl: '/images/meditacao-sono-new.webp', audioUrl: '/audio/meditacao-sono.mp3', gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)', isPremium: true, category: 'sono', returnTo: '/app/programas' },
  ],
  dr_joe_dispenza: [
    { id: 'blessing_2', title: 'Sintonize Novos Potenciais', duration: '5 min', imageUrl: '/images/meditacao-novos-potenciais.webp', audioUrl: '/audio/sintonizar-novos-potenciais-v3.mp3', gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #182864 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza', dayLabel: 'Dia 1' },
    { id: 'blessing_1', title: 'Bênção dos Centros de Energia', duration: '7 min', imageUrl: '/images/meditacao-bencao-energia.webp', audioUrl: '/audio/bencao-centros-energia.mp3', gradient: 'linear-gradient(to bottom, #F5C563 0%, #A63428 100%)', isPremium: false, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza', dayLabel: 'Dia 2' },
    { id: 'blessing_3', title: 'Recondicione Seu Corpo e Mente', duration: '7 min', imageUrl: '/images/meditacao-recondicionar.webp', audioUrl: '/audio/recondicione-corpo-mente.mp3', gradient: 'linear-gradient(to bottom, #9B79C9 0%, #3B2463 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza', dayLabel: 'Dia 3' },
    { id: 'blessing_5', title: 'Meditação Caminhando', duration: '5 min', imageUrl: '/images/meditacao-caminhando.webp', audioUrl: '/audio/meditacao-caminhando-nova.mp3', gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #2D1B3D 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza', dayLabel: 'Dia 4' },
    { id: 'blessing_6', title: 'Espaço-Tempo, Tempo-Espaço', duration: '5 min', imageUrl: '/images/meditacao-espaco-tempo.webp', audioUrl: '/audio/espaco-tempo-completa.mp3', gradient: 'linear-gradient(to bottom, #FCD670 0%, #C43520 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza', dayLabel: 'Dia 5' },
  ],
  default: [
    { id: 'blessing_7', title: 'Introdução à Meditação', duration: '8 min', imageUrl: '/images/meditacao-introducao.webp', audioUrl: '/audio/introducao-meditacao.mp3', gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #1F7BAD 100%)', isPremium: false, category: 'intro', returnTo: '/app/programas' },
    { id: 'blessing_10', title: 'Acolhendo sua respiração', duration: '7 min', imageUrl: '/images/acolhendo-respiracao.webp', audioUrl: '/audio/acolhendo-respiracao.mp3', gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #084D42 100%)', isPremium: false, category: 'respiracao', returnTo: '/app/programas' },
    { id: 'blessing_11', title: 'Liberando o Estresse', duration: '5 min', imageUrl: '/images/liberando-estresse.png', audioUrl: '/audio/liberando-estresse.mp3', gradient: 'linear-gradient(to bottom, #C4A0E8 0%, #341870 100%)', isPremium: false, category: 'relaxamento', returnTo: '/app/programas' },
    { id: 'blessing_1', title: 'Bênção dos Centros de Energia', duration: '7 min', imageUrl: '/images/meditacao-bencao-energia.webp', audioUrl: '/audio/bencao-centros-energia.mp3', gradient: 'linear-gradient(to bottom, #F5C563 0%, #A63428 100%)', isPremium: false, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
  ],
};

interface NextNightInfo {
  nightNumber: number;
  title: string;
  description: string;
  duration: string;
  isLocked: boolean;
  onPlay: () => void;
}

interface MeditationCompletionProps {
  meditationId: string;
  meditationTitle: string;
  meditationDuration: number;
  meditationCategory: string;
  onDismiss: () => void;
  nextNight?: NextNightInfo;
  sessionMetrics?: {
    pauseCount: number;
    skipCount: number;
    actualPlayTime: number;
  };
  // Sono guest conversion
  isSonoGuestMode?: boolean;
  onCheckout?: () => void;
  sonoCheckoutLoading?: boolean;
}

export default function MeditationCompletion({
  meditationId,
  meditationTitle,
  meditationDuration,
  meditationCategory,
  onDismiss,
  nextNight,
  sessionMetrics,
  isSonoGuestMode = false,
  onCheckout,
  sonoCheckoutLoading = false,
}: MeditationCompletionProps) {
  const navigate = useNavigate();
  const { currentStreak, updateStreak, isLoading: streakLoading } = useMeditationStreak();
  const { user } = useAuth();
  const todayMaxim = getTodayMaxim();

  // Sono guest locked = maximum conversion moment
  const isSonoGuestLocked = isSonoGuestMode && nextNight?.isLocked === true;

  // Post-flow overlay for sono guest (6-step sequence)
  const [showPostFlow, setShowPostFlow] = useState(false);

  const relatedMeditations = useMemo(() => {
    const pool = RELATED_BY_CATEGORY[meditationCategory] ?? RELATED_BY_CATEGORY.default;
    return pool.filter(m => m.id !== meditationId).slice(0, 4);
  }, [meditationCategory, meditationId]);

  const handleNavigateToMeditation = (med: RelatedMeditation) => {
    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: med.id,
          title: med.title,
          duration: med.duration,
          audioUrl: med.audioUrl,
          imageUrl: med.imageUrl,
          backgroundMusic: med.category === 'sono' ? 'Sono' : 'Cristais',
          gradient: med.gradient,
          category: med.category,
          isPremium: med.isPremium,
        },
        returnTo: med.returnTo,
      },
    });
  };

  const handleCtaClick = () => {
    if (onCheckout) { onCheckout(); return; }
    if (nextNight) nextNight.onPlay();
  };

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  useEffect(() => {
    if (!todayMaxim || isSonoGuestLocked) return;
    const completionPercentage = sessionMetrics?.actualPlayTime
      ? Math.round((sessionMetrics.actualPlayTime / meditationDuration) * 100)
      : 100;
    trackDiarioViewedPostMeditation({
      meditation_id: meditationId,
      meditation_completion: completionPercentage,
      reflection_date: todayMaxim.date,
      author: todayMaxim.author,
      user_id: user?.id || 'unknown',
    });
  }, [todayMaxim, meditationId, meditationDuration, sessionMetrics, user, isSonoGuestLocked]);

  const handleFeedbackSubmitted = async (vote: 'positive' | 'negative', reasons?: string[]) => {
    const payload = {
      vote,
      reasons,
      meditation_id: meditationId,
      meditation_title: meditationTitle,
      meditation_duration_seconds: meditationDuration,
      meditation_category: meditationCategory,
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
    } catch (error) {
      console.error('[MeditationCompletion] Failed to send feedback to backend:', error);
    }
    trackMeditationFeedback(
      vote,
      { meditationId, meditationTitle, meditationDuration, meditationCategory, actualPlayTime: sessionMetrics?.actualPlayTime, pauseCount: sessionMetrics?.pauseCount, skipCount: sessionMetrics?.skipCount },
      reasons
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.12 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.42 } },
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto font-primary"
      style={{ background: '#07090F' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: isSonoGuestLocked
            ? 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(148,136,196,0.13) 0%, transparent 70%)',
        }}
      />

      {/* Back button */}
      <button
        onClick={onDismiss}
        className="fixed top-3 left-3 sm:top-5 sm:left-5 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:shadow-lg"
        style={{ background: 'rgba(148,136,196,0.14)', border: '1px solid rgba(148,136,196,0.32)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
        aria-label="Voltar"
      >
        <ChevronLeft className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.88)' }} />
      </button>

      <div className="relative z-10 min-h-screen flex items-start justify-center py-20 px-4">
        <motion.div
          className="w-full max-w-2xl space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          {/* ── "Muito bem!" heading (standard flow only) ── */}
          {!isSonoGuestLocked && (
            <motion.div variants={itemVariants} className="flex justify-center">
              <h1
                className="font-display font-bold text-white"
                style={{ fontSize: '2.8rem', textShadow: '0 0 40px rgba(148,136,196,0.50)' }}
              >
                Muito bem!
              </h1>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              SONO GUEST LOCKED — Celebração + trigger do post-flow
              ══════════════════════════════════════════════════════ */}
          {isSonoGuestLocked && (
            <motion.div variants={itemVariants} className="flex flex-col items-center text-center py-6">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-8 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', color: '#C4B5FD' }}
              >
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#A78BFA', boxShadow: '0 0 4px rgba(167,139,250,0.7)' }} />
                Noite 1 · Protocolo Sono
              </div>

              <h1
                className="font-display text-[3rem] font-bold text-white mb-3 leading-none"
                style={{ textShadow: '0 0 40px rgba(167,139,250,0.40)' }}
              >
                Muito bem.
              </h1>
              <p className="text-[16px] mb-12" style={{ color: 'rgba(255,255,255,0.40)' }}>
                Você chegou até o fim.
              </p>

              <button
                onClick={() => setShowPostFlow(true)}
                className="w-full max-w-xs rounded-full py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)', boxShadow: '0 10px 36px rgba(107,79,187,0.50)' }}
              >
                O que isso significa →
              </button>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════
              STANDARD FLOW — Diário Estoico card
              ══════════════════════════════════════════════════════ */}
          {!isSonoGuestLocked && todayMaxim && (
            <motion.div variants={itemVariants} className="space-y-5">
              <DiarioEstoicoCard maxim={todayMaxim} size="medium" />
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/app/diario-estoico')}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ background: BLUE_SOFT, border: `1px solid ${BLUE_BORDER}`, color: 'rgba(192,180,224,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                >
                  <BookOpen className="h-4 w-4" />
                  Ler reflexão de hoje
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Streak ── */}
          {!streakLoading && currentStreak > 0 && (
            <motion.div className="flex justify-center" variants={itemVariants}>
              <div
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-semibold"
                style={{ background: BLUE_SOFT, border: `1px solid ${BLUE_BORDER}`, color: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(148,136,196,0.15)' }}
              >
                <span>{currentStreak} {currentStreak === 1 ? 'dia seguido!' : 'dias seguidos!'}</span>
                <span>🔥</span>
              </div>
            </motion.div>
          )}

          {/* ── Próxima noite (sono autenticado / não-guest) ── */}
          {!isSonoGuestLocked && nextNight && (
            <motion.div variants={itemVariants}>
              <div
                className="rounded-2xl px-5 py-5 sm:px-6"
                style={{ background: 'linear-gradient(135deg, rgba(74,78,138,0.30) 0%, rgba(20,23,46,0.60) 100%)', border: '1px solid rgba(74,91,138,0.30)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-4 w-4" style={{ color: '#8BA4E8' }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8BA4E8' }}>
                    Próxima meditação
                  </span>
                </div>
                <p className="text-base font-semibold text-white leading-snug">
                  Noite {nextNight.nightNumber} – {nextNight.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {nextNight.description}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={nextNight.onPlay}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 hover:-translate-y-0.5 ${
                      nextNight.isLocked ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'text-[#14172E] hover:brightness-110 shadow-md'
                    }`}
                    style={!nextNight.isLocked ? { background: '#8BA4E8' } : undefined}
                  >
                    {nextNight.isLocked ? (
                      <><Lock className="h-3.5 w-3.5" /> Desbloquear Noite {nextNight.nightNumber}</>
                    ) : (
                      <><Play className="h-3.5 w-3.5" fill="currentColor" /> Iniciar Noite {nextNight.nightNumber}</>
                    )}
                  </button>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{nextNight.duration}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Continue sua jornada (apenas standard) ── */}
          {!isSonoGuestLocked && relatedMeditations.length > 0 && (
            <motion.div variants={itemVariants}>
              <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.80)' }}>
                Continue sua jornada
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {relatedMeditations.map((med) => (
                  <button
                    key={med.id}
                    onClick={() => handleNavigateToMeditation(med)}
                    className="flex-shrink-0 w-40 sm:w-44 rounded-2xl overflow-hidden relative active:scale-95 transition-transform duration-150 snap-start"
                    style={{ height: '180px', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}
                    aria-label={`Meditar: ${med.title}`}
                  >
                    <img src={med.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    {med.dayLabel && (
                      <div
                        className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                      >
                        {med.dayLabel}
                      </div>
                    )}
                    {med.isPremium && (
                      <div className="absolute top-2 right-2 rounded-full p-1" style={{ background: 'rgba(251,191,36,0.85)', backdropFilter: 'blur(6px)' }}>
                        <Lock className="w-3 h-3 text-amber-900" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(148,136,196,0.22)', border: '1px solid rgba(148,136,196,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{med.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{med.duration}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Feedback ── */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl pt-2 pb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          >
            <MeditationFeedback
              meditationId={meditationId}
              meditationTitle={meditationTitle}
              meditationCategory={meditationCategory}
              meditationDuration={meditationDuration}
              sessionMetrics={sessionMetrics}
              onFeedbackSubmitted={handleFeedbackSubmitted}
              theme="dark"
            />
          </motion.div>

          {/* Linha separadora final */}
          <motion.div variants={itemVariants} className="flex items-center justify-center pb-8">
            <div className="flex items-center gap-3">
              <div className="h-px w-12" style={{ background: BLUE_BORDER }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(148,136,196,0.45)' }}>
                {meditationTitle}
              </span>
              <div className="h-px w-12" style={{ background: BLUE_BORDER }} />
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Sono Guest Post-Flow (6-step conversion sequence) ── */}
      <AnimatePresence>
        {showPostFlow && isSonoGuestLocked && onCheckout && (
          <SonoGuestPostFlow
            onCheckout={onCheckout}
            checkoutLoading={sonoCheckoutLoading}
            onDismiss={onDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
