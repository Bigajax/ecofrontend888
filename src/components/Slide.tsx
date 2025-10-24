// src/components/Slide.tsx
import React, { useRef, useEffect, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import GlassBubble from './GlassBubble';

type EyeState = 'idle' | 'thinking';

interface SlideProps {
  title: string;
  text: string[];
  bubblePosition?: 'top' | 'middle' | 'bottom';
  background?: string;
  onNext?: () => void;
  onPrev?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  eyeBubble?: {
    enabled?: boolean;
    state?: EyeState;
    size?: number;
  };
  /** Pílulas opcionais (ex.: ["Beta gratuito", "7 min/dia", "Privado"]) */
  pills?: string[];
}

const MAX_PILLS = 3;

function pillEmoji(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes('beta')) return '✨';
  if (l.includes('min')) return '🕒';
  if (l.includes('privad')) return '🔒';
  if (l.includes('criptograf')) return '🔐';
  if (l.includes('sem julg')) return '🤝';
  if (l.includes('leve')) return '🫧';
  if (l.includes('pressão') || l.includes('pressao')) return '🌿';
  if (l.includes('chat')) return '💬';
  if (l.includes('voz')) return '🎧';
  if (l.includes('memór') || l.includes('memor')) return '🧠';
  if (l.includes('insight') || l.includes('padr')) return '💡';
  return null;
}

const Slide: React.FC<SlideProps> = ({
  title,
  text,
  bubblePosition = 'middle',
  background,
  eyeBubble,
  pills,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // IDs únicos para acessibilidade
  const titleId = useId();
  const descId = useId();

  // Fade-in suave ao montar
  useEffect(() => {
    const el = containerRef.current;
    if (!el || prefersReducedMotion) return;
    el.animate(
      [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'ease-out' }
    );
  }, [prefersReducedMotion]);

  const posClass =
    bubblePosition === 'top'
      ? 'justify-start'
      : bubblePosition === 'bottom'
      ? 'justify-end'
      : 'justify-center';

  const pillsToShow = (pills ?? []).slice(0, MAX_PILLS);
  const extraCount = Math.max((pills?.length ?? 0) - MAX_PILLS, 0);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-stretch overflow-visible"
      style={background ? { background } : undefined}
      role="group"
      aria-roledescription="slide"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="flex h-full w-full flex-col items-center px-6 md:px-10 pt-7 md:pt-8 pb-[120px] md:pb-[132px]">
        {/* Título */}
        <h2
          id={titleId}
          className="text-slate-900 font-semibold text-center"
          style={{
            fontFamily: `'Playfair Display', serif`,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            fontSize: 'clamp(1.5rem, 1.2rem + 0.9vw, 2rem)',
          }}
        >
          {title}
        </h2>

        {/* Pílulas (opcionais) */}
        {pillsToShow.length > 0 && (
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label="Destaques">
            {pillsToShow.map((p, i) => {
              const emo = pillEmoji(p);
              return (
                <li key={`${p}-${i}`}>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/5">
                    {emo ? <span aria-hidden="true">{emo}</span> : null}
                    <span>{p}</span>
                  </span>
                </li>
              );
            })}
            {extraCount > 0 && (
              <li>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/5">
                  +{extraCount}
                </span>
              </li>
            )}
          </ul>
        )}

        {/* Descrição */}
        <div id={descId} className="mt-3 md:mt-3.5 max-w-[38rem] w-full text-center text-slate-600">
          {(text ?? []).map((t, i) => (
            <p
              key={i}
              className={i === 0 ? 'mx-auto' : 'mx-auto mt-2'}
              style={{
                fontSize: 'clamp(1rem, 0.95rem + 0.4vw, 1.125rem)',
                lineHeight: 1.45,
                maxWidth: '34rem',
              }}
            >
              {t}
            </p>
          ))}
        </div>

        {/* Bolha */}
        <motion.div
          className={`mt-5 md:mt-7 flex-1 flex ${posClass} items-end md:items-end justify-center mb-2 overflow-visible mx-auto`}
          animate={
            eyeBubble?.enabled && eyeBubble.state === 'thinking' && !prefersReducedMotion
              ? { scale: [1, 1.04, 1] }
              : undefined
          }
          transition={
            eyeBubble?.enabled && eyeBubble.state === 'thinking' && !prefersReducedMotion
              ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
          aria-hidden="true"
        >
          {eyeBubble?.enabled ? (
            <EcoBubbleOneEye variant="voice" state={eyeBubble.state ?? 'idle'} size={eyeBubble.size ?? 240} />
          ) : (
            <GlassBubble variant="clear" size="clamp(11.5rem, 40vw, 16.5rem)" className="mx-auto" />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Slide;
