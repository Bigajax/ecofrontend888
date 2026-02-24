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
      className="fixed inset-0 z-[9999] bg-black/70
                 flex items-center justify-center p-4 md:p-8
                 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full glass-shell-strong px-5 py-7 md:p-12
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
        <h2 className="font-display text-2xl md:text-3xl text-eco-text mb-6 leading-snug tracking-tight">
          {maxim.title}
        </h2>

        {/* Citação */}
        <blockquote className="border-l-4 border-eco-accent pl-7 mb-6">
          <p className="font-display text-lg md:text-xl italic
                       text-eco-text leading-[1.85]">
            "{maxim.text}"
          </p>
        </blockquote>

        {/* Autor */}
        <p className="font-primary text-sm font-semibold text-eco-accent tracking-wide uppercase mb-6 mt-2">
          — {maxim.author}
          {maxim.source && `, ${maxim.source}`}
        </p>

        {/* Separador */}
        {maxim.comment && <hr className="border-eco-line/40 my-6" />}

        {/* Comentário */}
        {maxim.comment && (
          <div className="max-w-none">
            <p className="font-primary text-xs font-semibold text-eco-muted tracking-[0.15em] uppercase mb-3">
              Comentário
            </p>
            <p className="font-primary text-[15px] md:text-base text-eco-text/90
                         leading-[1.8] whitespace-pre-line">
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
