/**
 * RitualDetailModal - Full-screen modal showing all ritual answers
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';
import { RINGS_ARRAY } from '@/constants/rings';
import type { DailyRitual } from '@/types/rings';

interface RitualDetailModalProps {
  ritual: DailyRitual;
  onClose: () => void;
}

export default function RitualDetailModal({ ritual, onClose }: RitualDetailModalProps) {
  const dateFormatted = format(new Date(ritual.date), "d 'de' MMMM", { locale: ptBR });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-shell rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-inherit z-10 pb-4 border-b border-eco-line">
          <h2 className="font-display text-2xl text-eco-text">{dateFormatted}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-eco-accent/10 transition"
          >
            <X size={20} className="text-eco-muted" />
          </button>
        </div>

        {/* Notes (if any) */}
        {ritual.notes && (
          <div className="mb-6 p-4 rounded-lg bg-eco-accent/5">
            <p className="text-sm text-eco-muted mb-1">Notas</p>
            <p className="text-eco-text">{ritual.notes}</p>
          </div>
        )}

        {/* Answers */}
        <div className="space-y-6">
          {ritual.answers && ritual.answers.length > 0 ? (
            ritual.answers.map((answer) => {
              const ring = RINGS_ARRAY.find((r) => r.id === answer.ringId);
              if (!ring) return null;

              return (
                <div
                  key={answer.ringId}
                  className="border-l-4 pl-4"
                  style={{ borderColor: `var(--eco-${ring.color})` }}
                >
                  {/* Ring header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{ring.icon}</span>
                    <div>
                      <h3 className="font-semibold text-eco-text">{ring.titlePt}</h3>
                      <p className="text-xs text-eco-muted">{ring.subtitlePt}</p>
                    </div>
                  </div>

                  {/* Question */}
                  <p className="text-eco-muted text-sm mb-2 italic">{ring.question}</p>

                  {/* Answer */}
                  <p className="text-eco-text whitespace-pre-wrap">{answer.answer}</p>

                  {/* Metadata (scores, tags) */}
                  {answer.metadata && Object.keys(answer.metadata).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* Focus score (Earth) */}
                      {answer.ringId === 'earth' && typeof answer.metadata.focusScore === 'number' && (
                        <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                          Foco: {answer.metadata.focusScore}/10
                        </span>
                      )}

                      {/* Emotion intensity (Fire) */}
                      {answer.ringId === 'fire' && typeof answer.metadata.emotionIntensity === 'number' && (
                        <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                          Intensidade: {answer.metadata.emotionIntensity}/10
                        </span>
                      )}

                      {/* Focus reasons (Earth) */}
                      {answer.ringId === 'earth' && Array.isArray(answer.metadata.focusReasons) && (
                        answer.metadata.focusReasons.map((reason: string) => (
                          <span key={reason} className="text-xs px-2 py-1 rounded bg-eco-accent/10 text-eco-text">
                            {reason.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}

                      {/* Adjustment types (Water) */}
                      {answer.ringId === 'water' && Array.isArray(answer.metadata.adjustmentType) && (
                        answer.metadata.adjustmentType.map((type: string) => (
                          <span key={type} className="text-xs px-2 py-1 rounded bg-eco-accent/10 text-eco-text">
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}

                      {/* Emotion types (Fire) */}
                      {answer.ringId === 'fire' && Array.isArray(answer.metadata.emotionType) && (
                        answer.metadata.emotionType.map((type: string) => (
                          <span key={type} className="text-xs px-2 py-1 rounded bg-eco-accent/10 text-eco-text">
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}

                      {/* Learning sources (Wind) */}
                      {answer.ringId === 'wind' && Array.isArray(answer.metadata.learningSource) && (
                        answer.metadata.learningSource.map((source: string) => (
                          <span key={source} className="text-xs px-2 py-1 rounded bg-eco-accent/10 text-eco-text">
                            {source.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}

                      {/* Identity keywords (Void) */}
                      {answer.ringId === 'void' && Array.isArray(answer.metadata.identityKeyword) && (
                        answer.metadata.identityKeyword.map((keyword: string) => (
                          <span key={keyword} className="text-xs px-2 py-1 rounded bg-eco-accent/10 text-eco-text">
                            {keyword.replace(/_/g, ' ')}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-eco-muted py-8">Nenhuma resposta encontrada</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-eco-line">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg bg-eco-user text-white font-medium hover:opacity-90 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
