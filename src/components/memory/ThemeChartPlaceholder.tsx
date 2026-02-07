/**
 * ThemeChartPlaceholder Component
 *
 * Placeholder com blur para preview do chart de temas em guest mode
 */

import React from 'react';

export default function ThemeChartPlaceholder() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 p-6 h-64">
      {/* Simulação de pie chart */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Círculo dividido em segmentos */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-amber-400/40" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)' }} />
            <div className="absolute inset-0 bg-orange-400/40" style={{ clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%)' }} />
            <div className="absolute inset-0 bg-red-400/40" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 50% 100%)' }} />
            <div className="absolute inset-0 bg-pink-400/40" style={{ clipPath: 'polygon(50% 50%, 50% 100%, 0% 100%)' }} />
            <div className="absolute inset-0 bg-purple-400/40" style={{ clipPath: 'polygon(50% 50%, 0% 100%, 0% 50%)' }} />
            <div className="absolute inset-0 bg-indigo-400/40" style={{ clipPath: 'polygon(50% 50%, 0% 50%, 0% 0%, 50% 0%)' }} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 opacity-40">
        <div className="text-xs flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span>Trabalho</span>
        </div>
        <div className="text-xs flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span>Família</span>
        </div>
        <div className="text-xs flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span>Saúde</span>
        </div>
      </div>

      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[8px] bg-white/20" />

      {/* Lock icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
      </div>
    </div>
  );
}
