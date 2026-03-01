/**
 * Meditation Completion Screen
 *
 * Full-screen celebration shown after meditation completes (≥95% or ended).
 * Displays: "Muito bem!" + stoic card + streak + feedback
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Moon, Play, Lock } from 'lucide-react';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { useMeditationStreak } from '@/hooks/useMeditationStreak';
import { trackMeditationFeedback } from '@/analytics/meditation';
import { submitMeditationFeedback } from '@/api/meditationFeedback';
import DiarioEstoicoCard from '@/components/diario-estoico/DiarioEstoicoCard';
import MeditationFeedback from '@/components/meditation/MeditationFeedback';
import { trackDiarioViewedPostMeditation } from '@/lib/mixpanelDiarioEvents';
import { useAuth } from '@/contexts/AuthContext';

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
  const { currentStreak, updateStreak, isLoading: streakLoading } = useMeditationStreak();
  const { user } = useAuth();
  const todayMaxim = getTodayMaxim();

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
