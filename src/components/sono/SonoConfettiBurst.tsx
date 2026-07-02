import { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Confete de celebração do funil do sono — feito à mão com framer-motion (sem
 * dependência nova). ~26 pedaços nas cores do tema (lilás/roxo/dourado/orb)
 * caindo do topo do bloco, 1 disparo e some. Usado na chegada à oferta vinda da
 * conquista da Noite 1 ("Continuar para a Noite 2").
 *
 * Respeita prefers-reduced-motion (não renderiza). O pai desmonta via onDone.
 */
const COLORS = ['#C4B5FD', '#A78BFA', '#7C3AED', '#EEC079', '#F0C4E8', '#E9DEFF'];
const PIECES = 26;

interface SonoConfettiBurstProps {
  /** Chamado ao fim da animação — o pai zera o estado e desmonta o burst. */
  onDone?: () => void;
}

export function SonoConfettiBurst({ onDone }: SonoConfettiBurstProps) {
  const reduced = useReducedMotion();

  // Geometria sorteada uma vez por montagem (useMemo): espalhamento horizontal
  // a partir do centro, queda com rotação e fade — cada pedaço com timing próprio.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const r = Math.random;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          x: (r() - 0.5) * 320,
          y: 200 + r() * 240,
          rotate: (r() - 0.5) * 540,
          scale: 0.7 + r() * 0.8,
          delay: r() * 0.25,
          duration: 1.3 + r() * 0.9,
          w: 5 + Math.round(r() * 4),
          h: 8 + Math.round(r() * 6),
          round: r() > 0.65,
        };
      }),
    [],
  );

  // Fim do show: maior delay+duration possível ≈ 2.45s — desmonta com folga.
  useEffect(() => {
    const t = window.setTimeout(() => onDone?.(), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[440px] overflow-hidden"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-4"
          style={{
            width: p.w,
            height: p.round ? p.w : p.h,
            borderRadius: p.round ? 9999 : 2,
            background: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: p.scale }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.15, 0.65, 0.35, 1] }}
        />
      ))}
    </div>
  );
}
