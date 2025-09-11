import React from 'react';
import clsx from 'clsx';

type GlassBubbleProps = {
  /** Tamanho: número (px) ou string (rem, vw, etc.) */
  size?: number | string;
  /** “clear” = vidro branco translúcido | “tint” = leve tonalidade */
  variant?: 'clear' | 'tint';
  /** Cor de tonalidade (usada só no variant="tint") */
  color?: string;
  className?: string;
};

const GlassBubble: React.FC<GlassBubbleProps> = ({
  size = 'clamp(14rem, 52vw, 22rem)',
  variant = 'clear',
  color = '#7FB2FF',
  className,
}) => {
  const toSize = typeof size === 'number' ? `${size}px` : size;

  // helper p/ alfa em hex (#RRGGBBAA) quando possível
  const a = (hex: string, alpha: number) =>
    hex.startsWith('#')
      ? `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
      : `color-mix(in oklab, ${hex} ${alpha * 100}%, transparent)`;

  // camadas do “vidro” — base muda se for clear vs tint
  const baseFill =
    variant === 'clear'
      ? `
          radial-gradient(35% 35% at 35% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.65) 14%, rgba(255,255,255,.35) 28%, rgba(255,255,255,.18) 46%, rgba(255,255,255,.10) 62%, rgba(255,255,255,.06) 78%, rgba(255,255,255,.04) 100%),
          radial-gradient(60% 60% at 50% 60%, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 70%)
        `
      : `
          radial-gradient(35% 35% at 35% 30%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.6) 14%, rgba(255,255,255,.3) 28%, rgba(255,255,255,.16) 46%, rgba(255,255,255,.08) 62%, rgba(255,255,255,.05) 78%, rgba(255,255,255,.04) 100%),
          radial-gradient(60% 60% at 50% 60%, ${a(color, .18)} 0%, rgba(255,255,255,0) 70%)
        `;

  return (
    <div
      aria-hidden
      className={clsx('relative select-none floating', className)}
      style={{ width: toSize, height: toSize, pointerEvents: 'none' }}
    >
      {/* halo suave ao redor */}
      <div
        className="absolute inset-[-10%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(2,6,23,.06) 0%, rgba(2,6,23,.02) 55%, transparent 70%)',
          filter: 'blur(10px)',
        }}
      />

      {/* disco principal (vidro) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: baseFill,
          border: '1px solid rgba(255,255,255,.8)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,.85),
            inset 0 -14px 22px rgba(2,6,23,.06),
            0 10px 28px rgba(2,6,23,.08)
          `,
          backdropFilter: 'blur(8px) saturate(1.05)',
          WebkitBackdropFilter: 'blur(8px) saturate(1.05)',
        }}
      />

      {/* aro externo leve (para dar “volume”) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            'inset 0 0 0 1px rgba(2,6,23,.06), inset 0 -30px 60px rgba(2,6,23,.03)',
        }}
      />

      {/* streak (reflexo alongado) */}
      <div
        className="absolute rounded-full"
        style={{
          width: '62%',
          height: '28%',
          top: '20%',
          left: '18%',
          transform: 'rotate(-32deg)',
          background:
            'linear-gradient(120deg, rgba(255,255,255,.90) 0%, rgba(255,255,255,.55) 45%, rgba(255,255,255,0) 85%)',
          filter: 'blur(1px)',
        }}
      />

      {/* highlight pontual */}
      <div
        className="absolute rounded-full"
        style={{
          width: '16%',
          height: '12%',
          top: '14%',
          left: '68%',
          background:
            'radial-gradient(circle, rgba(255,255,255,.96) 0%, rgba(255,255,255,0) 70%)',
          filter: 'blur(.7px)',
        }}
      />

      {/* sombra no “chão” */}
      <div
        className="absolute left-1/2 rounded-full -translate-x-1/2"
        style={{
          width: '70%',
          height: '14%',
          bottom: '-9%',
          background:
            'radial-gradient(ellipse at center, rgba(2,6,23,.22) 0%, transparent 70%)',
          filter: 'blur(12px)',
          opacity: 0.35,
        }}
      />
    </div>
  );
};

export default GlassBubble;
