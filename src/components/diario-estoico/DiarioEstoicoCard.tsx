/**
 * Diário Estoico Card Component
 *
 * Reusable card component for displaying daily stoic maxims.
 * Used in both DiarioEstoicoPage and MeditationCompletion screen.
 */

import React from 'react';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';

interface DiarioEstoicoCardProps {
  maxim: DailyMaxim;
  size?: 'small' | 'medium' | 'large';
  expandable?: boolean;
}

export default function DiarioEstoicoCard({
  maxim,
  size = 'medium',
  expandable = false,
}: DiarioEstoicoCardProps) {
  // Size-specific classes
  const sizeClasses = {
    small: 'min-h-[180px] md:min-h-[200px] px-6 py-8',
    medium: 'min-h-[240px] md:min-h-[280px] px-8 py-10 lg:px-10 lg:py-12',
    large: 'min-h-[300px] md:min-h-[350px] px-10 py-12 lg:px-12 lg:py-14',
  };

  const textClasses = {
    small: 'text-base md:text-lg',
    medium: 'text-lg md:text-xl lg:text-2xl',
    large: 'text-xl md:text-2xl lg:text-3xl',
  };

  const authorClasses = {
    small: 'text-xs md:text-sm',
    medium: 'text-sm md:text-base',
    large: 'text-base md:text-lg',
  };

  return (
    <div
      className={`
        relative rounded-2xl lg:rounded-3xl overflow-hidden
        shadow-lg hover:shadow-xl transition-shadow duration-300
        ${sizeClasses[size]}
      `}
      style={{
        backgroundImage: maxim.background || 'url("/images/meditacao-19-nov.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-4">
        {/* Quote text */}
        <p
          className={`
            font-display text-white
            ${textClasses[size]}
            leading-relaxed
            drop-shadow-lg
          `}
        >
          {maxim.text}
        </p>

        {/* Author */}
        <p
          className={`
            text-white/90 italic
            ${authorClasses[size]}
            drop-shadow-md
          `}
        >
          — {maxim.author}
        </p>
      </div>
    </div>
  );
}
