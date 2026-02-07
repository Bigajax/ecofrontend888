/**
 * TimelinePlaceholder Component
 *
 * Placeholder com blur para preview da timeline emocional em guest mode
 */

import React from 'react';

export default function TimelinePlaceholder() {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 p-6 h-64">
      {/* Simulação de timeline com barras */}
      <div className="absolute inset-0 flex items-end justify-around px-8 pb-8">
        <div className="w-8 h-32 bg-green-400/40 rounded-t-lg" />
        <div className="w-8 h-24 bg-blue-400/40 rounded-t-lg" />
        <div className="w-8 h-40 bg-purple-400/40 rounded-t-lg" />
        <div className="w-8 h-28 bg-pink-400/40 rounded-t-lg" />
        <div className="w-8 h-36 bg-indigo-400/40 rounded-t-lg" />
        <div className="w-8 h-20 bg-teal-400/40 rounded-t-lg" />
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 p-6">
        <div className="h-full border-l border-b border-gray-300/30" />
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
