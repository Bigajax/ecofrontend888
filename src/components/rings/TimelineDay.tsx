import { useState } from 'react';
import type { DailyRitual, Ring } from '@/types/rings';
import RingIcon from './RingIcon';

interface TimelineDayProps {
  ritual: DailyRitual;
  dateFormatted: string;
  rings: Record<string, Ring>;
}

export default function TimelineDay({ ritual, dateFormatted, rings }: TimelineDayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full text-left transition-all active:scale-95"
    >
      {/* Summary row */}
      <div className="rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <p className="mb-3 font-medium text-[var(--eco-text)]">
          {dateFormatted && <span className="text-[var(--eco-muted)]">{dateFormatted}</span>}
          {ritual.status === 'completed' && <span className="ml-2">✅</span>}
        </p>

        {/* Ring tags summary */}
        <div className="flex flex-wrap gap-2">
          {ritual.answers.map((answer) => {
            const ring = rings[answer.ringId];
            if (!ring) return null;

            let tagText = '';
            switch (answer.ringId) {
              case 'earth':
                tagText = `Foco: ${answer.metadata.distraction || 'n/a'}`;
                break;
              case 'water':
                tagText = `Ajuste: ${answer.metadata.adjustment || 'n/a'}`;
                break;
              case 'fire':
                tagText = `Emoção: ${answer.metadata.emotion || 'n/a'}`;
                break;
              case 'wind':
                tagText = `Aprendizado: ${answer.metadata.learning || 'n/a'}`;
                break;
              case 'void':
                tagText = `Identidade: ${answer.metadata.identity || 'n/a'}`;
                break;
            }

            return (
              <span
                key={answer.ringId}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <span className="text-[12px]">
                  <RingIcon ringId={answer.ringId} size={14} />
                </span>
                <span className="truncate">{tagText}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 rounded-xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-6 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
          <div className="space-y-6">
            {ritual.answers.map((answer) => {
              const ring = rings[answer.ringId];
              if (!ring) return null;

              return (
                <div key={answer.ringId} className="border-l-4 border-blue-300 pl-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-[var(--eco-text)]">
                      <RingIcon ringId={answer.ringId} size={32} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--eco-text)] break-words">{ring.titlePt}</h4>
                      <p className="mt-2 text-sm text-[var(--eco-muted)] break-words">{ring.question}</p>
                      <p className="mt-3 rounded-lg border border-[var(--eco-line)] bg-white/60 backdrop-blur-md p-3 text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] break-words overflow-wrap-anywhere">
                        {answer.answer}
                      </p>

                      {/* Show metadata if available */}
                      {answer.metadata && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {answer.metadata.focusScore !== undefined && (
                            <span className="rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                              Foco: {answer.metadata.focusScore}/10
                            </span>
                          )}
                          {answer.metadata.focusReasons && answer.metadata.focusReasons.length > 0 && (
                            <span className="rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                              {answer.metadata.focusReasons[0]}
                            </span>
                          )}
                          {answer.metadata.emotionIntensity !== undefined && (
                            <span className="rounded-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-[var(--eco-text)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                              Intensidade: {answer.metadata.emotionIntensity}/10
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </button>
  );
}
