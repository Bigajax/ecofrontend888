import { useState, useEffect } from 'react';
import type { Ring, RingAnswer, RingResponse } from '@/types/rings';
import {
  FOCUS_REASON_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  EMOTION_OPTIONS,
  LEARNING_SOURCE_OPTIONS,
  IDENTITY_KEYWORDS,
} from '@/constants/rings';
import CategoryIcon from './CategoryIcon';

interface RitualStepProps {
  ring: Ring;
  onSave: (ringId: string, answer: string, metadata: RingResponse) => void;
  isLoading?: boolean;
  existingAnswer?: RingAnswer;
}

export default function RitualStep({ ring, onSave, isLoading = false, existingAnswer }: RitualStepProps) {
  const [mainAnswer, setMainAnswer] = useState(existingAnswer?.answer || '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    existingAnswer?.metadata?.focusReasons || existingAnswer?.metadata?.adjustmentType || existingAnswer?.metadata?.emotionType || existingAnswer?.metadata?.learningSource || existingAnswer?.metadata?.identityKeyword || []
  );
  const [score, setScore] = useState<number | undefined>(
    existingAnswer?.metadata?.focusScore || existingAnswer?.metadata?.emotionIntensity
  );

  // Reset form state when ring changes
  useEffect(() => {
    setMainAnswer(existingAnswer?.answer || '');
    setSelectedOptions(
      existingAnswer?.metadata?.focusReasons || existingAnswer?.metadata?.adjustmentType || existingAnswer?.metadata?.emotionType || existingAnswer?.metadata?.learningSource || existingAnswer?.metadata?.identityKeyword || []
    );
    setScore(existingAnswer?.metadata?.focusScore || existingAnswer?.metadata?.emotionIntensity);
  }, [ring.id, existingAnswer]);

  const getOptionsForRing = () => {
    switch (ring.id) {
      case 'earth':
        return FOCUS_REASON_OPTIONS;
      case 'water':
        return ADJUSTMENT_TYPE_OPTIONS;
      case 'fire':
        return EMOTION_OPTIONS;
      case 'wind':
        return LEARNING_SOURCE_OPTIONS;
      case 'void':
        return IDENTITY_KEYWORDS;
      default:
        return [];
    }
  };

  const getMetadata = (): RingResponse => {
    const base = { [ring.id === 'earth' ? 'distraction' : 'answer']: mainAnswer };

    switch (ring.id) {
      case 'earth':
        return {
          distraction: mainAnswer,
          focusReason: selectedOptions[0],
          focusReasons: selectedOptions as any,
          focusScore: score,
        };
      case 'water':
        return {
          adjustment: mainAnswer,
          adjustmentType: selectedOptions as any,
        };
      case 'fire':
        return {
          emotion: mainAnswer,
          emotionType: selectedOptions as any,
          emotionIntensity: score,
          actionFromEmotion: mainAnswer,
        };
      case 'wind':
        return {
          learning: mainAnswer,
          learningSource: selectedOptions as any,
        };
      case 'void':
        return {
          identity: mainAnswer,
          identityKeyword: selectedOptions as any,
        };
      default:
        return {} as RingResponse;
    }
  };

  const handleSave = () => {
    if (!mainAnswer.trim()) {
      alert('Por favor, responda a pergunta');
      return;
    }

    const metadata = getMetadata();
    onSave(ring.id, mainAnswer, metadata);
  };

  const options = getOptionsForRing();
  const showScore = ring.id === 'earth' || ring.id === 'fire';
  const showOptions = options.length > 0;

  return (
    <div className="space-y-8">
      {/* Main answer textarea */}
      <div>
        <label className="mb-3 block text-sm font-medium text-[var(--eco-text)]">
          {ring.question}
        </label>
        <textarea
          value={mainAnswer}
          onChange={(e) => setMainAnswer(e.target.value)}
          placeholder="Digite sua resposta aqui..."
          className="w-full rounded-xl border border-[var(--eco-line)] bg-white px-4 py-3 text-[var(--eco-text)] placeholder:text-[var(--eco-muted)] focus:border-[var(--eco-user)] focus:outline-none focus:ring-1 focus:ring-[var(--eco-user)]"
          rows={4}
          disabled={isLoading}
        />
      </div>

      {/* Options */}
      {showOptions && (
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--eco-text)]">
            Como categorizar?
          </p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  if (selectedOptions.includes(option.id)) {
                    setSelectedOptions(selectedOptions.filter((o) => o !== option.id));
                  } else {
                    // For most rings, only one can be selected
                    if (ring.id === 'earth' || ring.id === 'water' || ring.id === 'fire' || ring.id === 'wind' || ring.id === 'void') {
                      setSelectedOptions([option.id]);
                    }
                  }
                }}
                disabled={isLoading}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all active:scale-95 ${
                  selectedOptions.includes(option.id)
                    ? 'border-2 border-[var(--eco-user)] bg-white text-[var(--eco-user)]'
                    : 'border border-[var(--eco-line)] bg-white text-[var(--eco-text)] hover:bg-gray-50'
                }`}
              >
                <span className="text-[var(--eco-user)]">
                  <CategoryIcon categoryId={option.id} size={18} />
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Score/Intensity slider */}
      {showScore && (
        <div>
          <label className="mb-3 block text-sm font-medium text-[var(--eco-text)]">
            {ring.id === 'earth' ? 'Quanto seu foco foi afetado?' : 'Intensidade da emoção?'}
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="10"
              value={score || 5}
              onChange={(e) => setScore(Number(e.target.value))}
              className="flex-1"
              disabled={isLoading}
            />
            <span className="min-w-12 rounded-lg bg-[var(--eco-user)] px-3 py-1 text-center font-semibold text-white">
              {score || 5}/10
            </span>
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isLoading || !mainAnswer.trim()}
        className="w-full rounded-lg bg-[var(--eco-user)] px-6 py-3 font-medium text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Salvando...' : 'Próximo'}
      </button>
    </div>
  );
}
