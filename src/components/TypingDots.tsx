// TypingDots.tsx
import React from "react";
import { motion } from "framer-motion";

type Variant = "pill" | "bubble" | "inline";
type Props = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { dot: 7, gap: 8, padX: 10, padY: 7, radius: "rounded-xl" },
  md: { dot: 9, gap: 11, padX: 14, padY: 9, radius: "rounded-2xl" },
  lg: { dot: 11, gap: 14, padX: 18, padY: 11, radius: "rounded-3xl" },
};

const dotTransition = {
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1], // iOS-like
  duration: 1.2,
};

const TypingDots: React.FC<Props> = ({
  variant = "pill",
  size = "md",
  className = "",
}) => {
  const s = SIZES[size];

  const baseDots = (
    <>
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.span
          key={i}
          role="presentation"
          className="inline-block rounded-full bg-slate-400/70 dark:bg-slate-300/70"
          style={{ width: s.dot, height: s.dot }}
          animate={{ y: [0, -3, 0], opacity: [0.68, 1, 0.68] }}
          transition={{ ...dotTransition, delay }}
        />
      ))}
    </>
  );

  // Container styles por variante
  const containers: Record<Variant, string> = {
    pill: `
      inline-flex items-center
      px-[${s.padX}px] py-[${s.padY}px] ${s.radius}
      gap-[${s.gap}px]
      bg-white/65 dark:bg-white/10
      backdrop-blur-md
      border border-white/40 dark:border-white/15
      shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_rgba(0,0,0,0.06)]
    `,
    bubble: `
      inline-flex items-center
      px-[${s.padX}px] py-[${s.padY}px] rounded-full
      gap-[${s.gap}px]
      bg-[radial-gradient(120%_120%_at_30%_30%,rgba(255,255,255,0.9),rgba(255,255,255,0.55))]
      dark:bg-[radial-gradient(120%_120%_at_30%_30%,rgba(255,255,255,0.15),rgba(255,255,255,0.06))]
      backdrop-blur-xl
      border border-white/50 dark:border-white/10
      shadow-[0_10px_30px_rgba(0,0,0,0.08)]
      ring-1 ring-black/5
    `,
    inline: `
      inline-flex items-center gap-[${s.gap}px]
      align-middle
    `,
  };

  // Halo suave (apenas para pill e bubble)
  const Halo = () =>
    variant === "inline" ? null : (
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[inherit] blur-xl opacity-50
                   bg-[radial-gradient(60%_60%_at_50%_10%,#EEF2FF,transparent_70%)] dark:opacity-20"
      />
    );

  return (
    <div
      className={`relative ${containers[variant]} ${className}`}
      aria-live="polite"
      aria-label="Eco está digitando"
      role="status"
    >
      <Halo />
      {/* reduz animação para quem prefere menos movimento */}
      <div className="motion-reduce:animate-none motion-reduce:[&_*]:transition-none flex items-center gap-[inherit]">
        {baseDots}
      </div>
    </div>
  );
};

export default TypingDots;
