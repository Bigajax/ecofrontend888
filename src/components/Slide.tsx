// src/components/Slide.tsx
import React, { useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import GlassBubble from './GlassBubble';

type EyeState = 'idle' | 'thinking';

interface SlideProps {
  title: string;
  text: string[];
  bubblePosition?: 'top' | 'middle' | 'bottom'; // opcional (não usado visualmente aqui)
  background?: string;
  onNext?: () => void;
  onPrev?: () => void;
  isFirst?: boolean;
  isLast?: boolean;

  /** Ativa a bolha com olho; se não passar, usa a GlassBubble como fallback */
  eyeBubble?: {
    enabled?: boolean;
    state?: EyeState;
    size?: number; // em px
  };
}

const Slide: React.FC<SlideProps> = ({
  title,
  text,
  background,
  eyeBubble,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.animate(
      [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'ease-out' }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-stretch justify-start overflow-visible"
      style={background ? { background } : undefined}
      aria-live="polite"
    >
      {/* padding extra no rodapé para os controles (setas + dots) */}
      <div className="flex h-full w-full flex-col items-center px-6 md:px-10 pt-7 md:pt-8 pb-[120px] md:pb-[132px]">
        {/* título */}
        <h1
          className="text-slate-900 font-semibold text-center"
          style={{
            fontFamily: `'Playfair Display', serif`,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            fontSize: 'clamp(1.5rem, 1.2rem + 0.9vw, 2rem)',
          }}
        >
          {title}
        </h1>

        {/* descrição */}
        <div className="mt-3 md:mt-3.5 max-w-[38rem] w-full text-center text-slate-600">
          {text.map((t, i) => (
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

        {/* bolha */}
        <motion.div
          className="mt-5 md:mt-7 flex-1 flex items-end justify-center mb-2 overflow-visible mx-auto"
          animate={
            eyeBubble?.enabled &&
            eyeBubble.state === 'thinking' &&
            !prefersReducedMotion
              ? { scale: [1, 1.04, 1] }
              : undefined
          }
          transition={
            eyeBubble?.enabled &&
            eyeBubble.state === 'thinking' &&
            !prefersReducedMotion
              ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        >
          {eyeBubble?.enabled ? (
            <EcoBubbleOneEye
              variant="voice"
              state={eyeBubble.state ?? 'idle'}
              size={eyeBubble.size ?? 240}
            />
          ) : (
            <GlassBubble
              variant="clear"
              // menorzinho e com limite mais conservador
              size="clamp(11.5rem, 40vw, 16.5rem)"
              className="mx-auto"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Slide;
