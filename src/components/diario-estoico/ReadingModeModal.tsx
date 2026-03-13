/**
 * ReadingModeModal Component
 *
 * Fullscreen focused reading mode for daily reflections.
 * Removes all distractions for immersive reading experience.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
      if (e.key === 'Escape') onClose();
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

  const commentParagraphs = maxim.comment
    ? maxim.comment.split('\n\n').filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[2px]
                 flex items-end md:items-center justify-center
                 p-0 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl bg-white
                   rounded-t-[2rem] md:rounded-3xl
                   overflow-hidden max-h-[94svh] md:max-h-[88vh]
                   flex flex-col animate-slide-up-fade shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image com título sobreposto */}
        <div
          className="relative flex-shrink-0 h-52 md:h-64"
          style={{
            backgroundImage: maxim.background,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Gradiente forte para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/85" />

          {/* Botão X — canto superior direito */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 z-10
                       w-9 h-9 flex items-center justify-center
                       bg-black/40 hover:bg-black/60 active:scale-90
                       backdrop-blur-sm rounded-full border border-white/20
                       text-white transition-all duration-200"
          >
            <X size={17} strokeWidth={2.5} />
          </button>

          {/* Data + título no rodapé da imagem */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 md:px-7 md:pb-6">
            <span className="inline-flex mb-2.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20">
              <span className="text-[10px] font-semibold text-white tracking-widest uppercase">
                {maxim.date}
              </span>
            </span>
            <h2
              className="font-display text-white text-xl md:text-2xl leading-snug tracking-wide"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}
            >
              {maxim.title}
            </h2>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Citação */}
          <div className="px-6 pt-7 pb-6 md:px-8 md:pt-8 border-b border-gray-100">
            <p className="font-primary text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">
              {maxim.author}{maxim.source && ` · ${maxim.source}`}
            </p>
            <blockquote className="font-display text-[1.2rem] md:text-xl leading-[1.7] text-gray-800 italic">
              "{maxim.text}"
            </blockquote>
            <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-gray-400 font-primary">
              <span>⏱</span> Tempo de leitura: 1 minuto
            </p>
          </div>

          {/* Comentário */}
          {commentParagraphs.length > 0 && (
            <div className="px-6 py-7 md:px-8 md:py-8">
              <p className="font-primary text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-5">
                Comentário
              </p>
              <div className="space-y-5">
                {commentParagraphs.map((para, i) => (
                  <p
                    key={i}
                    className="font-primary text-[15px] md:text-base leading-[1.9] text-gray-700"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Espaço extra para scroll confortável */}
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
