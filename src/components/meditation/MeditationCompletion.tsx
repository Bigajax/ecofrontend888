/**
 * Meditation Completion Screen
 *
 * Full-screen celebration shown after meditation completes (≥95% or ended).
 * Displays: "Muito bem!" + stoic card + streak + feedback
 */

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Moon, Play, Lock, BookOpen } from 'lucide-react';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { useMeditationStreak } from '@/hooks/useMeditationStreak';
import { trackMeditationFeedback } from '@/analytics/meditation';
import { submitMeditationFeedback } from '@/api/meditationFeedback';
import DiarioEstoicoCard from '@/components/diario-estoico/DiarioEstoicoCard';
import MeditationFeedback from '@/components/meditation/MeditationFeedback';
import { trackDiarioViewedPostMeditation } from '@/lib/mixpanelDiarioEvents';
import { useAuth } from '@/contexts/AuthContext';

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
}

const RELATED_BY_CATEGORY: Record<string, RelatedMeditation[]> = {
  sono: [
    { id: 'night_1', title: 'Desligando o Estado de Alerta', duration: '5 min', imageUrl: '/images/desligando-estado-alerta.png', audioUrl: '/audio/desligando-estado-alerta.mp3', gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'night_2', title: 'Respiração que Induz o Sono', duration: '5 min', imageUrl: '/images/respiracao-induz-sono.webp', audioUrl: '/audio/respiracao-induz-sono.mp3', gradient: 'linear-gradient(to bottom, #6B5B95 0%, #251A45 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'night_3', title: 'Esvaziando Pensamentos Repetitivos', duration: '5 min', imageUrl: '/images/esvaziando-pensamentos.webp', audioUrl: '/audio/esvaziando-pensamentos.mp3', gradient: 'linear-gradient(to bottom, #5B6B95 0%, #1A2545 100%)', isPremium: false, category: 'sono', returnTo: '/app/meditacoes-sono' },
    { id: 'blessing_8', title: 'Meditação do Sono', duration: '15 min', imageUrl: '/images/meditacao-sono-new.webp', audioUrl: '/audio/meditacao-sono.mp3', gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)', isPremium: true, category: 'sono', returnTo: '/app/programas' },
  ],
  dr_joe_dispenza: [
    { id: 'blessing_1', title: 'Bênção dos Centros de Energia', duration: '7 min', imageUrl: '/images/meditacao-bencao-energia.webp', audioUrl: '/audio/energy-blessings-meditation.mp3', gradient: 'linear-gradient(to bottom, #F5C563 0%, #A63428 100%)', isPremium: false, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
    { id: 'blessing_2', title: 'Sintonize Novos Potenciais', duration: '5 min', imageUrl: '/images/meditacao-novos-potenciais.webp', audioUrl: '/audio/sintonizar-novos-potenciais-v3.mp3', gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #182864 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
    { id: 'blessing_3', title: 'Recondicione Seu Corpo e Mente', duration: '7 min', imageUrl: '/images/meditacao-recondicionar.webp', audioUrl: '/audio/recondicionar-corpo-nova-mente.mp3', gradient: 'linear-gradient(to bottom, #9B79C9 0%, #3B2463 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
    { id: 'blessing_5', title: 'Meditação Caminhando', duration: '5 min', imageUrl: '/images/meditacao-caminhando.webp', audioUrl: '/audio/meditacao-caminhando.mp3', gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #2D1B3D 100%)', isPremium: true, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
  ],
  default: [
    { id: 'blessing_7', title: 'Introdução à Meditação', duration: '8 min', imageUrl: '/images/meditacao-introducao.webp', audioUrl: '/audio/introducao-meditacao.mp3', gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #1F7BAD 100%)', isPremium: false, category: 'intro', returnTo: '/app/programas' },
    { id: 'blessing_10', title: 'Acolhendo sua respiração', duration: '7 min', imageUrl: '/images/acolhendo-respiracao.webp', audioUrl: '/audio/acolhendo-respiracao.mp3', gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #084D42 100%)', isPremium: false, category: 'respiracao', returnTo: '/app/programas' },
    { id: 'blessing_11', title: 'Liberando o Estresse', duration: '5 min', imageUrl: '/images/liberando-estresse.png', audioUrl: '/audio/liberando-estresse.mp3', gradient: 'linear-gradient(to bottom, #C4A0E8 0%, #341870 100%)', isPremium: false, category: 'relaxamento', returnTo: '/app/programas' },
    { id: 'blessing_1', title: 'Bênção dos Centros de Energia', duration: '7 min', imageUrl: '/images/meditacao-bencao-energia.webp', audioUrl: '/audio/energy-blessings-meditation.mp3', gradient: 'linear-gradient(to bottom, #F5C563 0%, #A63428 100%)', isPremium: false, category: 'dr_joe_dispenza', returnTo: '/app/dr-joe-dispenza' },
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
  meditationDuration: number; // seconds
  meditationCategory: string;
  onDismiss: () => void;
  nextNight?: NextNightInfo;
  sessionMetrics?: {
    pauseCount: number;
    skipCount: number;
    actualPlayTime: number;
  };
}

export default function MeditationCompletion({
  meditationId,
  meditationTitle,
  meditationDuration,
  meditationCategory,
  onDismiss,
  nextNight,
  sessionMetrics,
}: MeditationCompletionProps) {
  const navigate = useNavigate();
  const { currentStreak, updateStreak, isLoading: streakLoading } = useMeditationStreak();
  const { user } = useAuth();
  const todayMaxim = getTodayMaxim();

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

  // Update streak on mount
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // Track viewing reflection post-meditation
  useEffect(() => {
    if (todayMaxim) {
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
    }
  }, [todayMaxim, meditationId, meditationDuration, sessionMetrics, user]);

  const handleFeedbackSubmitted = async (vote: 'positive' | 'negative', reasons?: string[]) => {
    // Build payload for backend
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
      seek_count: 0, // TODO: Add seek tracking
      feedback_source: 'meditation_completion',
    };

    try {
      // Send to backend API
      await submitMeditationFeedback(payload);
      console.log('[MeditationCompletion] Feedback sent to backend successfully');
    } catch (error) {
      // Log error but don't block the user experience
      console.error('[MeditationCompletion] Failed to send feedback to backend:', error);
    }

    // Always send to Mixpanel analytics (even if backend fails)
    trackMeditationFeedback(
      vote,
      {
        meditationId,
        meditationTitle,
        meditationDuration,
        meditationCategory,
        actualPlayTime: sessionMetrics?.actualPlayTime,
        pauseCount: sessionMetrics?.pauseCount,
        skipCount: sessionMetrics?.skipCount,
      },
      reasons
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Back button - top left */}
      <button
        onClick={onDismiss}
        className="
          fixed top-3 left-3 sm:top-4 sm:left-4 z-20
          w-9 h-9 sm:w-10 sm:h-10 rounded-full
          flex items-center justify-center
          bg-white/90 backdrop-blur-sm border border-gray-200
          hover:bg-gray-100 shadow-md
          transition-all duration-200
        "
        aria-label="Voltar"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
      </button>

      {/* Scrollable content container */}
      <div className="min-h-screen flex items-center justify-center py-16 sm:py-20 px-4">
        <motion.div
          className="w-full max-w-2xl space-y-6 sm:space-y-8 md:space-y-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        {/* Diário Estoico Card with "Muito bem!" overlay */}
        {todayMaxim && (
          <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6">
            {/* "Muito bem!" title - centered above card */}
            <div className="flex justify-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 drop-shadow-sm">
                Muito bem!
              </h1>
            </div>

            <DiarioEstoicoCard maxim={todayMaxim} size="medium" />

            {/* Button to Diário Estoico */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/app/diario-estoico')}
                className="
                  flex items-center gap-2 px-5 py-2.5 rounded-full
                  bg-amber-50 border border-amber-200
                  text-amber-800 text-sm font-medium
                  hover:bg-amber-100 active:scale-95
                  transition-all duration-200 shadow-sm
                "
              >
                <BookOpen className="w-4 h-4" />
                Ler reflexão de hoje
              </button>
            </div>
          </motion.div>
        )}

        {/* Streak counter */}
        {!streakLoading && currentStreak > 0 && (
          <motion.div
            className="flex justify-center"
            variants={itemVariants}
          >
            <div className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-eco-100/50 text-eco-700 text-base sm:text-lg md:text-xl font-semibold shadow-sm">
              {currentStreak} {currentStreak === 1 ? 'dia seguido!' : 'dias seguidos!'} 🔥
            </div>
          </motion.div>
        )}

        {/* Next sleep night (only for sono category) */}
        {nextNight && (
          <motion.div variants={itemVariants}>
            <div className="rounded-2xl border border-[#4A5B8A]/25 bg-gradient-to-br from-[#14172E] to-[#1A2045] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="h-4 w-4 text-[#8BA4E8]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#8BA4E8]">
                  Próxima meditação
                </span>
              </div>
              <p className="text-base font-semibold text-white leading-snug">
                Noite {nextNight.nightNumber} – {nextNight.title}
              </p>
              <p className="mt-1 text-sm text-white/55 leading-relaxed">
                {nextNight.description}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={nextNight.onPlay}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    nextNight.isLocked
                      ? 'bg-white/10 text-white/60 hover:bg-white/15'
                      : 'bg-[#8BA4E8] text-[#14172E] hover:brightness-110 hover:scale-105 shadow-md'
                  }`}
                >
                  {nextNight.isLocked ? (
                    <><Lock className="h-3.5 w-3.5" /> Desbloquear Noite {nextNight.nightNumber}</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" fill="currentColor" /> Iniciar Noite {nextNight.nightNumber}</>
                  )}
                </button>
                <span className="text-xs text-white/35">{nextNight.duration}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Related Meditations */}
        {relatedMeditations.length > 0 && (
          <motion.div variants={itemVariants}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">
              Continue sua jornada
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {relatedMeditations.map((med) => (
                <button
                  key={med.id}
                  onClick={() => handleNavigateToMeditation(med)}
                  className="flex-shrink-0 w-40 sm:w-44 rounded-2xl overflow-hidden relative shadow-md active:scale-95 transition-transform duration-150 snap-start"
                  style={{ height: '180px' }}
                  aria-label={`Meditar: ${med.title}`}
                >
                  <img
                    src={med.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  {med.isPremium && (
                    <div className="absolute top-2 right-2 bg-amber-400/90 backdrop-blur-sm rounded-full p-1">
                      <Lock className="w-3 h-3 text-amber-900" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                    <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{med.title}</p>
                    <p className="text-white/70 text-xs mt-0.5">{med.duration}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feedback */}
        <motion.div
          className="pt-4 sm:pt-6"
          variants={itemVariants}
        >
          <MeditationFeedback
            meditationId={meditationId}
            meditationTitle={meditationTitle}
            meditationCategory={meditationCategory}
            meditationDuration={meditationDuration}
            sessionMetrics={sessionMetrics}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
