/**
 * DiarioNavigation Component
 *
 * Navigation component for moving between daily reflections.
 * Provides prev/next buttons with keyboard shortcuts.
 */

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DiarioNavigationProps {
  currentDayNumber: number;
  availableDays: number[];
  onNavigate: (dayNumber: number) => void;
}

export default function DiarioNavigation({
  currentDayNumber,
  availableDays,
  onNavigate,
}: DiarioNavigationProps) {
  const currentIndex = availableDays.indexOf(currentDayNumber);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < availableDays.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        onNavigate(availableDays[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onNavigate(availableDays[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext, availableDays, onNavigate]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
                    flex items-center gap-4 glass-shell px-6 py-3 rounded-full
                    shadow-eco animate-fade-in">
      <button
        disabled={!hasPrev}
        onClick={() => onNavigate(availableDays[currentIndex - 1])}
        className="p-2 rounded-full transition-all duration-300
                   hover:bg-eco-accent/10 disabled:opacity-30 disabled:cursor-not-allowed
                   text-eco-text"
        aria-label="Reflexão anterior"
      >
        <ChevronLeft size={20} />
      </button>

      <span className="text-sm font-medium text-eco-text px-2">
        {currentIndex + 1} de {availableDays.length}
      </span>

      <button
        disabled={!hasNext}
        onClick={() => onNavigate(availableDays[currentIndex + 1])}
        className="p-2 rounded-full transition-all duration-300
                   hover:bg-eco-accent/10 disabled:opacity-30 disabled:cursor-not-allowed
                   text-eco-text"
        aria-label="Próxima reflexão"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
