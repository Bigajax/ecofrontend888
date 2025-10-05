// TypingDots.tsx
import React from "react";
import { motion, useReducedMotion } from "framer-motion";

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

const toneTokens = {
  light: {
    dot: "#007AFF",
    dotDim: "rgba(0, 122, 255, 0.55)",
    container: "rgba(15, 23, 42, 0.05)",
    bubble: "rgba(15, 23, 42, 0.06)",
    border: "rgba(148, 163, 184, 0.28)",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
  },
  dark: {
    dot: "#5FA9FF",
    dotDim: "rgba(95, 169, 255, 0.55)",
    container: "rgba(148, 163, 184, 0.16)",
    bubble: "rgba(148, 163, 184, 0.22)",
    border: "rgba(148, 163, 184, 0.35)",
    shadow: "0 1px 3px rgba(15, 23, 42, 0.55)",
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
  const prefersReducedMotion = useReducedMotion();

  const dotTransition = prefersReducedMotion
    ? undefined
    : {
        repeat: Infinity,
        ease: "linear" as const,
        duration: 1.4,
      };

  const baseDots = (
    <>
      {[0, 0.18, 0.36].map((delay, i) => (
        <motion.span
          key={i}
          role="presentation"
          className="inline-block rounded-full"
          style={{
            width: s.dot,
            height: s.dot,
            backgroundColor: prefersReducedMotion ? tokens.dot : tokens.dotDim,
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  y: [0, -2, 0],
                  backgroundColor: [tokens.dotDim, tokens.dot, tokens.dotDim],
                }
          }
          transition=
            dotTransition && delay
              ? { ...dotTransition, delay }
              : dotTransition || undefined
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

  return (
    <div
      className={`relative ${containers[variant]} ${className}`}
      style={containerStyle}
      aria-live="polite"
      aria-label="Eco está digitando"
      role="status"
    >
      <div className="flex items-center gap-[inherit]">
        {baseDots}
      </div>
    </div>
  );
};

export default TypingDots;
