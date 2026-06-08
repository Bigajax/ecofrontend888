import React from 'react';
import { Volume2, Loader2, BookOpen, Pause } from 'lucide-react';
import { useReflectionAudio } from '@/hooks/useReflectionAudio';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';

interface TodayReflectionHeroProps {
  maxim: DailyMaxim;
  /** true → reflexão é exatamente a de hoje; false → última disponível (fallback). */
  isToday: boolean;
  /** Logado/premium → "Ler completa"; guest → CTA de cadastro. */
  canRead: boolean;
  onReadFull: () => void;
  onRegister: () => void;
}

/** Tira aspas tipográficas das pontas só para exibir a citação. */
const stripQuotes = (s: string) =>
  s.replace(/^[\s"“”'']+/, '').replace(/[\s"“”'']+$/, '').trim();

/**
 * Card-hero da reflexão do dia no Diário Estoico.
 * Estética editorial (imagem de fundo + vidro), com play de áudio (TTS — mesma voz da ECO
 * usada no chat) lendo título + citação + autor + comentário.
 */
const TodayReflectionHero: React.FC<TodayReflectionHeroProps> = ({
  maxim,
  isToday,
  canRead,
  onReadFull,
  onRegister,
}) => {
  const { toggle, isPlaying, loading, overlayNode } = useReflectionAudio('today_hero');

  const label = isToday ? 'Reflexão de hoje' : 'Última reflexão';

  return (
    <div className="w-full px-4 pt-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <article
          className="relative overflow-hidden rounded-[1.75rem] shadow-[0_18px_50px_rgba(46,38,30,0.22)]"
          style={{
            backgroundImage: maxim.background,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Véu para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/82" />

          {/* Conteúdo */}
          <div className="relative px-6 py-7 md:px-9 md:py-9 flex flex-col">
            {/* Selo superior */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E8C9A0]"
                style={{ boxShadow: '0 0 8px rgba(232,201,160,0.9)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#E8C9A0]">
                {label}
              </span>
              <span className="text-[10px] font-medium tracking-[0.18em] text-white/55 uppercase">
                · {maxim.date}
              </span>
            </div>

            {/* Título */}
            <h2
              className="font-display font-bold text-white leading-[1.08] tracking-tight"
              style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.5rem)', textShadow: '0 2px 22px rgba(0,0,0,0.55)' }}
            >
              {maxim.title}
            </h2>

            {/* Citação (serif, recortada) */}
            <blockquote
              className="mt-4 font-subtitle italic text-white/90 text-[15px] md:text-[17px] leading-[1.7]"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textShadow: '0 1px 12px rgba(0,0,0,0.5)',
              }}
            >
              “{stripQuotes(maxim.text)}”
            </blockquote>

            {/* Autor / fonte */}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
              {maxim.author}{maxim.source && <span className="text-white/45"> · {maxim.source}</span>}
            </p>

            {/* Ações */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => toggle(maxim, { is_today: isToday })}
                disabled={loading}
                aria-label={
                  loading ? 'Gerando áudio…' : isPlaying ? 'Parar áudio' : 'Ouvir a reflexão'
                }
                className="group inline-flex items-center gap-2.5 rounded-full pl-3.5 pr-5 py-2.5
                           bg-white text-[#2E261E] text-sm font-semibold
                           shadow-[0_6px_20px_rgba(0,0,0,0.28)]
                           hover:scale-[1.03] active:scale-95 transition-transform duration-200
                           disabled:opacity-70 disabled:pointer-events-none"
              >
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#E8C9A0]/30">
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-[#2E261E]" strokeWidth={2.2} />
                  ) : isPlaying ? (
                    <Pause size={15} className="text-[#2E261E]" strokeWidth={2.4} fill="currentColor" />
                  ) : (
                    <Volume2 size={16} className="text-[#2E261E]" strokeWidth={2.2} />
                  )}
                </span>
                {loading ? 'Preparando…' : isPlaying ? 'Ouvindo' : 'Ouvir'}
              </button>

              <button
                onClick={canRead ? onReadFull : onRegister}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5
                           border border-white/40 text-white text-sm font-medium
                           backdrop-blur-sm bg-white/5
                           hover:bg-white/15 active:scale-95 transition-all duration-200"
              >
                <BookOpen size={15} strokeWidth={1.8} />
                {canRead ? 'Ler completa' : 'Criar conta para ler'}
              </button>
            </div>
          </div>
        </article>
      </div>

      {overlayNode}
    </div>
  );
};

export default TodayReflectionHero;
