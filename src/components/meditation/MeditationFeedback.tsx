/**
 * Meditation Feedback Component
 *
 * Collects user feedback after meditation completion.
 * Two-level flow: thumbs up/down → (if negative) reasons → done
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

type FeedbackMode = 'ask' | 'reasons' | 'done';

interface MeditationFeedbackProps {
  meditationId: string;
  meditationTitle: string;
  meditationCategory: string;
  meditationDuration: number; // seconds
  sessionMetrics?: {
    pauseCount: number;
    skipCount: number;
    actualPlayTime: number;
  };
  onFeedbackSubmitted?: (vote: 'positive' | 'negative', reasons?: string[]) => void | Promise<void>;
  theme?: 'light' | 'dark';
}

const MEDITATION_FEEDBACK_REASONS = [
  { key: 'too_long', label: 'Muito longa' },
  { key: 'hard_to_focus', label: 'Difícil de focar' },
  { key: 'voice_music', label: 'Voz/música não agradou' },
  { key: 'other', label: 'Outro' },
] as const;

type ReasonKey = (typeof MEDITATION_FEEDBACK_REASONS)[number]['key'];

export default function MeditationFeedback({
  meditationId,
  meditationTitle,
  meditationCategory,
  meditationDuration,
  sessionMetrics,
  onFeedbackSubmitted,
  theme = 'light',
}: MeditationFeedbackProps) {
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<FeedbackMode>('ask');
  const [selectedReasons, setSelectedReasons] = useState<Set<ReasonKey>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePositiveVote = async () => {
    setIsSubmitting(true);
    try {
      await onFeedbackSubmitted?.('positive');
      setMode('done');
    } catch (error) {
      console.error('[MeditationFeedback] Error submitting positive feedback:', error);
      // Still transition to done state - error already logged in parent
      setMode('done');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNegativeVote = () => {
    setMode('reasons');
  };

  const toggleReason = (key: ReasonKey) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmitReasons = async () => {
    const reasonsArray = Array.from(selectedReasons);
    setIsSubmitting(true);
    try {
      await onFeedbackSubmitted?.('negative', reasonsArray);
      setMode('done');
    } catch (error) {
      console.error('[MeditationFeedback] Error submitting negative feedback:', error);
      // Still transition to done state - error already logged in parent
      setMode('done');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ask mode - thumbs up/down
  if (mode === 'ask') {
    return (
      <div className="flex flex-col items-center space-y-4 sm:space-y-5 py-6 px-4">
        <h3 className={`text-xl sm:text-2xl md:text-3xl font-semibold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Como foi a sua experiência?
        </h3>
        <p className={`text-sm sm:text-base md:text-lg text-center max-w-md ${isDark ? 'text-white/55' : 'text-gray-600'}`}>
          Queremos mostrar a você conteúdos semelhantes depois
        </p>

        <div className="flex items-center gap-8 sm:gap-10 mt-4 sm:mt-6">
          {/* Thumbs down */}
          <button
            onClick={handleNegativeVote}
            disabled={isSubmitting}
            className={`
              w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
              rounded-full border-2
              flex items-center justify-center
              hover:scale-110 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 shadow-sm
              ${isDark
                ? 'border-white/25 hover:border-red-400 hover:bg-red-400/10'
                : 'border-gray-300 hover:border-red-400 hover:bg-red-50'
              }
            `}
            aria-label="Não gostei"
          >
            <ThumbsDown className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          </button>

          {/* Thumbs up */}
          <button
            onClick={handlePositiveVote}
            disabled={isSubmitting}
            className={`
              w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24
              rounded-full border-2
              flex items-center justify-center
              hover:scale-110 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 shadow-sm
              ${isDark
                ? 'border-white/25 hover:border-green-400 hover:bg-green-400/10'
                : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
              }
            `}
            aria-label="Gostei"
          >
            <ThumbsUp className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>
    );
  }

  // Reasons mode - show reason checkboxes
  if (mode === 'reasons') {
    return (
      <div className="flex flex-col items-center space-y-6 sm:space-y-8 py-6 px-4">
        <h3 className={`text-xl sm:text-2xl md:text-3xl font-semibold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Por que não foi útil?
        </h3>

        <div className="flex flex-col gap-3 sm:gap-4 w-full max-w-md">
          {MEDITATION_FEEDBACK_REASONS.map((reason) => (
            <button
              key={reason.key}
              onClick={() => toggleReason(reason.key)}
              className={`
                px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-2 text-left font-medium
                transition-all duration-200
                ${selectedReasons.has(reason.key)
                  ? 'border-eco-600 bg-eco-600 text-white shadow-md scale-[1.02]'
                  : isDark
                    ? 'border-white/20 bg-white/5 text-white/80 hover:border-white/40 hover:bg-white/10'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-eco-400 hover:bg-eco-50'
                }
              `}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0
                    ${selectedReasons.has(reason.key)
                      ? 'border-white bg-white'
                      : isDark ? 'border-white/30' : 'border-gray-400'
                    }
                  `}
                >
                  {selectedReasons.has(reason.key) && (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-eco-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm sm:text-base md:text-lg">{reason.label}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmitReasons}
          disabled={selectedReasons.size === 0 || isSubmitting}
          className={`
            mt-6 px-12 sm:px-16 py-3 sm:py-4 rounded-full
            font-semibold text-base sm:text-lg
            active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 shadow-lg
            ${isDark ? 'bg-white text-gray-900 hover:bg-white/90' : 'bg-gray-900 text-white hover:bg-gray-800'}
          `}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    );
  }

  // Done mode - thank you message
  return (
    <div className="flex flex-col items-center space-y-4 py-8 px-4">
      <h3 className={`text-2xl sm:text-3xl md:text-4xl font-semibold text-center ${isDark ? 'text-white' : 'text-eco-700'}`}>
        Obrigado pelo feedback! 💛
      </h3>
      <p className={`text-sm sm:text-base text-center max-w-md ${isDark ? 'text-white/55' : 'text-gray-600'}`}>
        Suas respostas nos ajudam a melhorar sua experiência
      </p>
    </div>
  );
}
