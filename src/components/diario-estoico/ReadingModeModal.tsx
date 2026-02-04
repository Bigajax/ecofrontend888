/**
 * ReadingModeModal Component
 *
 * Fullscreen focused reading mode for daily reflections.
 * Removes all distractions for immersive reading experience.
 */

import React, { useEffect } from 'react';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';

interface ReadingModeModalProps {
  maxim: DailyMaxim | null;
  open: boolean;
  onClose: () => void;
}

export default function ReadingModeModal({
  maxim,
  open,
  onClose,
}: ReadingModeModalProps) {
  // ESC key to close
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !maxim) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md
                 flex items-center justify-center p-4 md:p-8
                 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full glass-shell-strong p-8 md:p-12
                   rounded-3xl overflow-y-auto max-h-[90vh]
                   animate-slide-up-fade"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge */}
        <div className="mb-6">
          <span className="inline-flex px-4 py-2 rounded-full
                         bg-eco-accent/20 text-eco-accent text-sm font-medium">
            {maxim.date}
          </span>
        </div>

        {/* Título */}
        <h2 className="font-display text-3xl md:text-4xl text-eco-text mb-8 leading-relaxed">
          {maxim.title}
        </h2>

        {/* Citação */}
        <blockquote className="border-l-4 border-eco-accent pl-6 mb-6">
          <p className="font-display text-xl md:text-2xl italic
                       text-eco-text leading-relaxed">
            "{maxim.text}"
          </p>
        </blockquote>

        {/* Autor */}
        <p className="font-primary text-lg font-medium text-eco-muted mb-8">
          — {maxim.author}
          {maxim.source && `, ${maxim.source}`}
        </p>

        {/* Comentário */}
        {maxim.comment && (
          <div className="prose prose-lg max-w-none">
            <p className="font-primary text-base md:text-lg text-eco-text
                         leading-relaxed whitespace-pre-line">
              {maxim.comment}
            </p>
          </div>
        )}

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="mt-8 w-full py-3 rounded-xl glass-shell
                     text-eco-text font-medium hover:bg-eco-accent/10
                     transition-all duration-300"
        >
          Fechar (ESC)
        </button>
      </div>
    </div>
  );
}
