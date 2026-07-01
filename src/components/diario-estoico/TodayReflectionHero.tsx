import React, { useLayoutEffect, useRef, useState } from 'react';
import { Volume2, Loader2, BookOpen, Pause, ChevronDown } from 'lucide-react';
import { useReflectionAudio } from '@/hooks/useReflectionAudio';
import { DIARIO_GUEST } from '@/constants/diarioGuestCopy';
import type { DailyMaxim } from '@/utils/diarioEstoico/getTodayMaxim';
import { buildReflectionSpeech } from '@/utils/diarioEstoico/reflectionSpeech';

interface TodayReflectionHeroProps {
  maxim: DailyMaxim;
  /** true → reflexão é exatamente a de hoje; false → última disponível (fallback). */
  isToday: boolean;
  /** Logado → conteúdo completo; guest → prévia de 40% + gate de cadastro. */
  canRead: boolean;
  onReadFull: () => void;
  onRegister: () => void;
}

/** Tira aspas tipográficas das pontas só para exibir a citação. */
const stripQuotes = (s: string) =>
  s.replace(/^[\s"“”'']+/, '').replace(/[\s"“”'']+$/, '').trim();

/** Corta um texto em ~n caracteres, recuando até o fim da última palavra. */
const cutAtWord = (s: string, n: number): string => {
  if (n <= 0) return '';
  if (s.length <= n) return s;
  const slice = s.slice(0, n);
  const i = slice.lastIndexOf(' ');
  return (i > 40 ? slice.slice(0, i) : slice).trim();
};

/** Fração da reflexão (citação + comentário) liberada para o guest. */
const GUEST_PREVIEW_RATIO = 0.4;

/**
 * Card-hero da reflexão do dia no Diário Estoico.
 * - Logado: citação (com "Ver mais") + Ouvir (lê tudo) + Ler completa (modal).
 * - Guest: prévia de 40% da reflexão (citação + comentário) com fade + gate de cadastro;
 *   o Ouvir lê apenas essa prévia (cortado).
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
  const quote = stripQuotes(maxim.text);
  const comment = (maxim.comment ?? '').trim();

  // ── Prévia do guest: 40% da reflexão inteira (citação + comentário) ──────────
  const fullLen = quote.length + comment.length;
  const budget = Math.floor(fullLen * GUEST_PREVIEW_RATIO);
  const quoteShown = budget >= quote.length ? quote : cutAtWord(quote, budget);
  const commentBudget = Math.max(0, budget - quote.length);
  const commentPreview = commentBudget > 0 ? cutAtWord(comment, commentBudget) : '';
  const hasMoreForGuest = quoteShown.length < quote.length || commentPreview.length < comment.length;
  // Texto que o áudio lê no modo guest (apenas a prévia) — normalizado p/ TTS
  // com as mesmas pausas e limpeza da reflexão completa.
  const guestAudioText = buildReflectionSpeech({
    title: maxim.title,
    text: quoteShown,
    author: maxim.author,
    source: maxim.source,
    comment: commentPreview,
  });

  // ── Expandir citação (apenas logado) ────────────────────────────────────────
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const quoteRef = useRef<HTMLQuoteElement | null>(null);

  useLayoutEffect(() => {
    if (!canRead || expanded) return;
    const el = quoteRef.current;
    if (!el) return;
    const measure = () => setIsClamped(el.scrollHeight - el.clientHeight > 2);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [maxim.text, expanded, canRead]);

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

            {canRead ? (
              /* ───────── Logado: citação com "Ver mais" ───────── */
              <>
                <blockquote
                  ref={quoteRef}
                  className="mt-4 font-subtitle italic text-white/90 text-[15px] md:text-[17px] leading-[1.7]"
                  style={{
                    textShadow: '0 1px 12px rgba(0,0,0,0.5)',
                    ...(expanded
                      ? {}
                      : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
                  }}
                >
                  “{quote}”
                </blockquote>

                {(isClamped || expanded) && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-2 self-start inline-flex items-center gap-1 text-[12px] font-semibold
                               text-[#E8C9A0] hover:text-white transition-colors duration-200"
                  >
                    {expanded ? 'Ver menos' : 'Ver mais'}
                    <ChevronDown
                      size={14}
                      className="transition-transform duration-300 motion-reduce:transition-none"
                      style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                )}

                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                  {maxim.author}{maxim.source && <span className="text-white/45"> · {maxim.source}</span>}
                </p>
              </>
            ) : (
              /* ───────── Guest: prévia de 40% + gate ───────── */
              <>
                <div
                  className="mt-4"
                  style={hasMoreForGuest
                    ? { WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent)', maskImage: 'linear-gradient(to bottom, black 62%, transparent)' }
                    : undefined}
                >
                  <blockquote
                    className="font-subtitle italic text-white/90 text-[15px] md:text-[17px] leading-[1.7]"
                    style={{ textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
                  >
                    “{quoteShown}{quoteShown.length < quote.length ? '…' : ''}”
                  </blockquote>

                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
                    {maxim.author}{maxim.source && <span className="text-white/45"> · {maxim.source}</span>}
                  </p>

                  {commentPreview && (
                    <p className="mt-4 font-primary text-white/80 text-[14px] md:text-[15px] leading-[1.8] whitespace-pre-line"
                      style={{ textShadow: '0 1px 10px rgba(0,0,0,0.45)' }}>
                      {commentPreview}…
                    </p>
                  )}
                </div>

                {hasMoreForGuest && (
                  <p className="mt-3 text-[12px] font-medium text-[#E8C9A0]">
                    Crie sua conta grátis para ler a reflexão completa.
                  </p>
                )}
              </>
            )}

            {/* Ações */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => toggle(maxim, { is_today: isToday, guest: !canRead }, canRead ? undefined : guestAudioText)}
                disabled={loading}
                aria-label={
                  loading ? 'Gerando áudio…' : isPlaying ? 'Parar áudio' : canRead ? 'Ouvir a reflexão' : 'Ouvir a prévia'
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
                {loading ? 'Preparando…' : isPlaying ? 'Ouvindo' : canRead ? 'Ouvir' : 'Ouvir prévia'}
              </button>

              <button
                onClick={canRead ? onReadFull : onRegister}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5
                           border border-white/40 text-white text-sm font-medium
                           backdrop-blur-sm bg-white/5
                           hover:bg-white/15 active:scale-95 transition-all duration-200"
              >
                <BookOpen size={15} strokeWidth={1.8} />
                {canRead ? 'Ler completa' : DIARIO_GUEST.primaryCta}
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
