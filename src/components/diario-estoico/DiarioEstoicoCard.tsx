/**
 * Diário Estoico Card Component
 *
 * Reusable card component for displaying daily stoic maxims.
 * Used in both DiarioEstoicoPage and MeditationCompletion screen.
 */

import React from 'react';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import ReflectionTeaserWrapper from './ReflectionTeaserWrapper';

interface DiarioEstoicoCardProps {
  maxim: DailyMaxim;
  size?: 'small' | 'medium' | 'large';
  expandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isGuestMode?: boolean; // NOVO: Indica se está em guest mode
  visiblePercentage?: number; // NOVO: Porcentagem visível em guest mode
}

export default function DiarioEstoicoCard({
  maxim,
  size = 'medium',
  expandable = false,
  isExpanded = false,
  onToggleExpand,
  isGuestMode = false,
  visiblePercentage = 45,
}: DiarioEstoicoCardProps) {
  // Size-specific classes
  const sizeClasses = {
    small: 'min-h-[220px] md:min-h-[240px] px-5 py-6 sm:px-6 sm:py-8',
    medium: 'min-h-[280px] md:min-h-[320px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12',
    large: 'min-h-[340px] md:min-h-[380px] px-8 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14',
  };

  const textClasses = {
    small: 'text-sm sm:text-base md:text-lg',
    medium: 'text-base sm:text-lg md:text-xl lg:text-2xl',
    large: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
  };

  const authorClasses = {
    small: 'text-xs sm:text-sm',
    medium: 'text-xs sm:text-sm md:text-base',
    large: 'text-sm sm:text-base md:text-lg',
  };

  // Card quote (sempre renderizado)
  const quoteCard = (
    <div
      className={`
        relative rounded-2xl lg:rounded-3xl overflow-hidden
        shadow-lg hover:shadow-xl transition-all duration-300
        ${sizeClasses[size]}
        ${expandable && !isGuestMode ? 'cursor-pointer' : ''}
      `}
      onClick={expandable && !isGuestMode ? onToggleExpand : undefined}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: maxim.background || 'url("/images/meditacao-19-nov.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for text readability - stronger on mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 md:space-y-6">
        {/* Quote text */}
        <p
          className={`
            font-display text-white
            ${textClasses[size]}
            leading-relaxed sm:leading-relaxed md:leading-loose
            drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]
            max-w-[90%] sm:max-w-full
          `}
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)' }}
        >
          {maxim.text}
        </p>

        {/* Author */}
        <p
          className={`
            text-white/95 italic
            ${authorClasses[size]}
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]
            max-w-[90%] sm:max-w-full
          `}
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.6)' }}
        >
          — {maxim.author}
          {maxim.source && `, ${maxim.source}`}
        </p>
      </div>
    </div>
  );

  // Se guest mode e expandido, renderizar com teaser
  if (isGuestMode && isExpanded && maxim.comment) {
    return (
      <ReflectionTeaserWrapper
        comment={maxim.comment}
        reflectionId={`${maxim.month}-${maxim.dayNumber}`}
        visiblePercentage={visiblePercentage}
      >
        {quoteCard}
      </ReflectionTeaserWrapper>
    );
  }

  // Authenticated user - renderizar normalmente
  return (
    <div>
      {quoteCard}

      {/* Expanded comment section (authenticated users) */}
      {isExpanded && maxim.comment && (
        <div className="relative bg-white p-6 lg:p-8 border-t border-gray-200 rounded-b-2xl lg:rounded-b-3xl shadow-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Comentário</h3>
            <p className="text-sm lg:text-base leading-relaxed text-gray-700 whitespace-pre-line">
              {maxim.comment}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
