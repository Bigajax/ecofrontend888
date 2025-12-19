/**
 * Meditation Completion Screen
 *
 * Full-screen celebration shown after meditation completes (≥95% or ended).
 * Displays: "Muito bem!" + stoic card + streak + feedback
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { getTodayMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { useMeditationStreak } from '@/hooks/useMeditationStreak';
import { trackMeditationFeedback } from '@/analytics/meditation';
import DiarioEstoicoCard from '@/components/diario-estoico/DiarioEstoicoCard';
import MeditationFeedback from '@/components/meditation/MeditationFeedback';

interface MeditationCompletionProps {
  meditationId: string;
  meditationTitle: string;
  meditationDuration: number; // seconds
  meditationCategory: string;
  onDismiss: () => void;
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
  sessionMetrics,
}: MeditationCompletionProps) {
  const { currentStreak, updateStreak, isLoading: streakLoading } = useMeditationStreak();
  const todayMaxim = getTodayMaxim();

  // Update streak on mount
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  const handleFeedbackSubmitted = (vote: 'positive' | 'negative', reasons?: string[]) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-y-auto">
      {/* Back button - top left */}
      <button
        onClick={onDismiss}
        className="
          fixed top-4 left-4 z-10
          w-10 h-10 rounded-full
          flex items-center justify-center
          bg-gray-100 hover:bg-gray-200
          transition-colors duration-200
        "
        aria-label="Voltar"
      >
        <ChevronLeft className="w-6 h-6 text-gray-600" />
      </button>

      {/* Scrollable content */}
      <motion.div
        className="w-full max-w-2xl px-4 py-8 md:px-8 md:py-12 space-y-6 md:space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Diário Estoico Card with "Muito bem!" overlay */}
        {todayMaxim && (
          <motion.div variants={itemVariants} className="relative pt-10">
            {/* "Muito bem!" title overlaid on card */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
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
            <div className="px-4 py-2 rounded-full bg-eco-100/50 text-eco-700 text-sm md:text-base font-medium">
              {currentStreak} {currentStreak === 1 ? 'dia seguido!' : 'dias seguidos!'} 🔥
            </div>
          </motion.div>
        )}

        {/* Feedback */}
        <motion.div
          className="pt-4"
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
  );
}
