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
  onFeedbackSubmitted?: (vote: 'positive' | 'negative', reasons?: string[]) => void;
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
}: MeditationFeedbackProps) {
  const [mode, setMode] = useState<FeedbackMode>('ask');
  const [selectedReasons, setSelectedReasons] = useState<Set<ReasonKey>>(new Set());

  const handlePositiveVote = () => {
    setMode('done');
    onFeedbackSubmitted?.('positive');
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

  const handleSubmitReasons = () => {
    const reasonsArray = Array.from(selectedReasons);
    setMode('done');
    onFeedbackSubmitted?.('negative', reasonsArray);
  };

  // Ask mode - thumbs up/down
  if (mode === 'ask') {
    return (
      <div className="flex flex-col items-center space-y-4 py-6">
        <h3 className="text-lg md:text-xl font-medium text-gray-800 text-center">
          Como foi a sua experiência?
        </h3>
        <p className="text-sm md:text-base text-gray-600 text-center max-w-md">
          Queremos mostrar a você conteúdos semelhantes depois
        </p>

        <div className="flex items-center gap-6 mt-4">
          {/* Thumbs down */}
          <button
            onClick={handleNegativeVote}
            className="
              w-16 h-16 md:w-20 md:h-20
              rounded-full border-2 border-gray-300
              flex items-center justify-center
              hover:border-eco-500 hover:scale-105
              active:bg-eco-50
              transition-all duration-200
            "
            aria-label="Não gostei"
          >
            <ThumbsDown className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
          </button>

          {/* Thumbs up */}
          <button
            onClick={handlePositiveVote}
            className="
              w-16 h-16 md:w-20 md:h-20
              rounded-full border-2 border-gray-300
              flex items-center justify-center
              hover:border-eco-500 hover:scale-105
              active:bg-eco-50
              transition-all duration-200
            "
            aria-label="Gostei"
          >
            <ThumbsUp className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
          </button>
        </div>
      </div>
    );
  }

  // Reasons mode - show reason checkboxes
  if (mode === 'reasons') {
    return (
      <div className="flex flex-col items-center space-y-6 py-6">
        <h3 className="text-lg md:text-xl font-medium text-gray-800 text-center">
          Por que não foi útil?
        </h3>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          {MEDITATION_FEEDBACK_REASONS.map((reason) => (
            <button
              key={reason.key}
              onClick={() => toggleReason(reason.key)}
              className={`
                px-4 py-3 rounded-lg border-2 text-left font-medium
                transition-all duration-200
                ${
                  selectedReasons.has(reason.key)
                    ? 'border-eco-600 bg-eco-600 text-white shadow-md'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-eco-400'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                    ${
                      selectedReasons.has(reason.key)
                        ? 'border-white bg-white'
                        : 'border-gray-400'
                    }
                  `}
                >
                  {selectedReasons.has(reason.key) && (
                    <svg className="w-3 h-3 text-eco-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm md:text-base">{reason.label}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmitReasons}
          disabled={selectedReasons.size === 0}
          className="
            mt-6 px-10 py-3 rounded-full
            bg-gray-900 text-white font-semibold text-base
            hover:bg-gray-800 active:scale-95
            disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50
            transition-all duration-200
            shadow-lg
          "
        >
          Enviar
        </button>
      </div>
    );
  }

  // Done mode - thank you message
  return (
    <div className="flex flex-col items-center space-y-4 py-6">
      <h3 className="text-xl md:text-2xl font-medium text-eco-700 text-center">
        Obrigado pelo feedback! 💛
      </h3>
    </div>
  );
}
