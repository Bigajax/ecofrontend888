// TypingDots.tsx
import React from "react";
import { motion } from "framer-motion";

type Variant = "pill" | "bubble" | "inline";
type Tone = "auto" | "light" | "dark";

type Props = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: Tone;
};

const SIZES = {
  sm: { dot: 7, gap: 8, padX: 10, padY: 7, radius: "rounded-xl" },
  md: { dot: 9, gap: 11, padX: 14, padY: 9, radius: "rounded-2xl" },
  lg: { dot: 11, gap: 14, padX: 18, padY: 11, radius: "rounded-3xl" },
} as const;

const dotTransition = {
  repeat: Infinity,
  ease: [0.22, 1, 0.36, 1], // iOS-like
  duration: 1.2,
};

const toneTokens = {
  light: {
    dot: "rgba(0, 122, 255, 0.85)",
    dotDim: "rgba(27, 79, 255, 0.55)",
    container: "rgba(0, 122, 255, 0.14)",
    bubble: "rgba(0, 122, 255, 0.18)",
    border: "rgba(0, 122, 255, 0.36)",
    halo: "rgba(0, 122, 255, 0.18)",
    shadow: "0 4px 10px rgba(0, 76, 167, 0.14)",
  },
  dark: {
    dot: "rgba(118, 160, 255, 0.94)",
    dotDim: "rgba(91, 153, 255, 0.72)",
    container: "rgba(27, 79, 255, 0.22)",
    bubble: "rgba(27, 79, 255, 0.27)",
    border: "rgba(118, 160, 255, 0.42)",
    halo: "rgba(27, 79, 255, 0.26)",
    shadow: "0 4px 12px rgba(4, 20, 70, 0.32)",
  },
} as const;

const explicitTone = (tone: Exclude<Tone, "auto">): "light" | "dark" =>
  tone === "dark" ? "dark" : "light";

const TypingDots: React.FC<Props> = ({
  variant = "pill",
  size = "md",
  className = "",
  tone = "auto",
}) => {
  const [resolvedTone, setResolvedTone] = React.useState<"light" | "dark">(
    tone === "auto" ? "light" : explicitTone(tone)
  );

  React.useEffect(() => {
    if (tone === "auto") {
      if (typeof window === "undefined" || !window.matchMedia) {
        setResolvedTone("light");
        return;
      }

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (event: MediaQueryListEvent) => {
        setResolvedTone(event.matches ? "dark" : "light");
      };

      setResolvedTone(media.matches ? "dark" : "light");

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
      }

      media.addListener(handleChange);
      return () => media.removeListener(handleChange);
    }

    setResolvedTone(explicitTone(tone));
  }, [tone]);

  const s = SIZES[size];
  const tokens = toneTokens[resolvedTone];

  const baseDots = (
    <>
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.span
          key={i}
          role="presentation"
          className="inline-block rounded-full"
          style={{
            width: s.dot,
            height: s.dot,
            backgroundColor: tokens.dotDim,
          }}
          animate={{
            y: [0, -3, 0],
            backgroundColor: [tokens.dotDim, tokens.dot, tokens.dotDim],
          }}
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
      border
    `,
    bubble: `
      inline-flex items-center
      px-[${s.padX}px] py-[${s.padY}px] rounded-full
      gap-[${s.gap}px]
      border
    `,
    inline: `
      inline-flex items-center gap-[${s.gap}px]
      align-middle
    `,
  };

  const containerStyle =
    variant === "inline"
      ? undefined
      : {
          backgroundColor:
            variant === "bubble" ? tokens.bubble : tokens.container,
          borderColor: tokens.border,
          boxShadow: tokens.shadow,
        };

  // Halo suave (apenas para pill e bubble)
  const Halo = () =>
    variant === "inline" ? null : (
      <span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-[inherit]"
        style={{ backgroundColor: tokens.halo }}
      />
    );

  return (
    <div
      className={`relative ${containers[variant]} ${className}`}
      style={containerStyle}
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
