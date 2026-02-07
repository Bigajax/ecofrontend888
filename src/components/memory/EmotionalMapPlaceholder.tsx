/**
 * EmotionalMapPlaceholder Component
 *
 * Placeholder com blur para preview do mapa emocional em guest mode
 */

import React from 'react';

export default function EmotionalMapPlaceholder() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 p-6 h-64">
      {/* Simulação de chart com formas abstratas */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full">
          {/* Círculos simulando data points */}
          <div className="absolute top-1/4 left-1/4 w-16 h-16 rounded-full bg-blue-400/40" />
          <div className="absolute top-1/3 right-1/3 w-20 h-20 rounded-full bg-purple-400/40" />
          <div className="absolute bottom-1/4 left-1/2 w-12 h-12 rounded-full bg-pink-400/40" />
          <div className="absolute bottom-1/3 right-1/4 w-14 h-14 rounded-full bg-indigo-400/40" />

          {/* Linhas conectando */}
          <svg className="absolute inset-0 w-full h-full" opacity="0.3">
            <line x1="25%" y1="25%" x2="66%" y2="33%" stroke="#8B5CF6" strokeWidth="2" />
            <line x1="66%" y1="33%" x2="50%" y2="75%" stroke="#8B5CF6" strokeWidth="2" />
            <line x1="50%" y1="75%" x2="75%" y2="66%" stroke="#8B5CF6" strokeWidth="2" />
          </svg>
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
