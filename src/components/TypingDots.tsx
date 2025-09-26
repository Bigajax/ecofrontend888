// TypingDots.tsx
import React, { memo } from 'react';
import { motion } from 'framer-motion';

type Variant = 'pill' | 'bubble' | 'inline';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

const SIZES: Record<Size, { dot: number; gap: number; padX: number; padY: number; radius: string }> = {
  sm: { dot: 6, gap: 6, padX: 8, padY: 6, radius: 'rounded-xl' },
  md: { dot: 8, gap: 8, padX: 12, padY: 8, radius: 'rounded-2xl' },
  lg: { dot: 10, gap: 10, padX: 16, padY: 10, radius: 'rounded-3xl' },
};

const dotTransition = {
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1],
  duration: 1.2,
};

const TypingDotsComponent: React.FC<Props> = ({ variant = 'pill', size = 'md', className = '' }) => {
  const s = SIZES[size];

  const dots = [0, 0.18, 0.36].map((delay, i) => (
    <motion.span
      key={i}
      role="presentation"
      className="inline-block rounded-full bg-[rgba(100,116,139,0.75)]"
      style={{ width: s.dot, height: s.dot }}
      animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
      transition={{ ...dotTransition, delay }}
    />
  ));

  const containers: Record<Variant, string> = {
    pill: `inline-flex items-center gap-[${s.gap}px] px-[${s.padX}px] py-[${s.padY}px] ${s.radius}
      bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-lg border border-[rgba(255,255,255,0.65)]
      shadow-[var(--shadow-xs)] text-[color:var(--muted)]`,
    bubble: `inline-flex items-center gap-[${s.gap}px] px-[${s.padX}px] py-[${s.padY}px] rounded-full
      bg-[color-mix(in_srgb,var(--surface-strong)_90%,transparent)] backdrop-blur-xl border border-[rgba(255,255,255,0.75)]
      shadow-[var(--shadow-xs)] text-[color:var(--muted)]`,
    inline: `inline-flex items-center gap-[${s.gap}px] align-middle`,
  };

  return (
    <div
      className={`relative ${containers[variant]} ${className}`}
      aria-live="polite"
      aria-label="Eco está digitando"
      role="status"
    >
      <div className="flex items-center gap-[inherit] motion-reduce:animate-none motion-reduce:[&_*]:transition-none">
        {dots}
      </div>
    </div>
  );
};

export default memo(TypingDotsComponent);
