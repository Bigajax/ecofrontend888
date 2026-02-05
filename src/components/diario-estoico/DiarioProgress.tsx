/**
 * DiarioProgress Component
 *
 * Progress bar showing reading completion.
 * Displays percentage and count of days read.
 */

import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface DiarioProgressProps {
  totalDays: number;
  readDays: Set<number>;
}

export default function DiarioProgress({
  totalDays,
  readDays,
}: DiarioProgressProps) {
  const percentage = totalDays > 0 ? (readDays.size / totalDays) * 100 : 0;
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="glass-shell p-4 rounded-xl mb-6 animate-fade-in relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-eco-text">
            Progresso
          </span>

          {/* Info icon with tooltip */}
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="p-1 rounded-full hover:bg-eco-accent/10 transition-colors"
              aria-label="Informação sobre progresso"
            >
              <Info size={14} className="text-eco-muted" />
            </button>

            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3
                            glass-shell rounded-lg shadow-eco animate-fade-in text-xs
                            pointer-events-auto">
                <p className="text-eco-text leading-relaxed">
                  📚 <strong>Como funciona:</strong> Leia a reflexão do dia e clique em
                  "Marcar como lida" para aumentar seu progresso!
                </p>
              </div>
            )}
          </div>
        </div>

        <span className="text-xs text-eco-muted">
          {readDays.size} de {totalDays} dias
        </span>
      </div>

      <div className="h-2 bg-eco-line/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-eco-baby
                     transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage label */}
      {percentage > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-eco-baby">
            {Math.round(percentage)}% concluído
          </span>
        </div>
      )}
    </div>
  );
}
