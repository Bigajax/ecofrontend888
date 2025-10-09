import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Variant = "pill" | "bubble" | "inline";
type Tone = "auto" | "light" | "dark";

type Props = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: Tone;
  /** Pausa a animação (ex.: durante transições) */
  paused?: boolean;
  /** Velocidade da animação. 1 = padrão */
  speed?: number;
  /** Rótulo acessível (sr-only). Default: "Eco está digitando" */
  ariaLabel?: string;
};

const SIZES = {
  sm: { dot: 7, gap: 8, padX: 10, padY: 7, radius: "rounded-xl" },
  md: { dot: 9, gap: 11, padX: 14, padY: 9, radius: "rounded-2xl" },
  lg: { dot: 11, gap: 14, padX: 18, padY: 11, radius: "rounded-3xl" },
} as const;

const TOKENS = {
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

const srOnly =
  "sr-only absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap border-0";

export default function TypingDots({
  variant = "pill",
  size = "md",
  className = "",
  tone = "auto",
  paused = false,
  speed = 1,
  ariaLabel = "Eco está digitando",
}: Props) {
  const [resolvedTone, setResolvedTone] = useState<"light" | "dark">(
    tone === "auto" ? "light" : explicitTone(tone)
  );

  // resolve tema com prefers-color-scheme (SSR-safe)
  useEffect(() => {
    if (tone !== "auto") {
      setResolvedTone(explicitTone(tone));
      return;
    }
    if (typeof window === "undefined" || !window.matchMedia) {
      setResolvedTone("light");
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setResolvedTone(e.matches ? "dark" : "light");
    setResolvedTone(media.matches ? "dark" : "light");
    try {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    } catch {
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    }
  }, [tone]);

  const s = SIZES[size];
  const tokens = TOKENS[resolvedTone];
  const prefersReduced = useReducedMotion();
  const effectivePaused = paused || prefersReduced;

  // CSS vars para estilizar via Tailwind/tema se quiser
  const cssVars = useMemo(
    () => ({
      // @ts-expect-error – inline CSS vars
      "--dot": tokens.dot,
      "--dot-dim": tokens.dotDim,
      "--bg": variant === "bubble" ? tokens.bubble : tokens.container,
      "--border": tokens.border,
      "--shadow": tokens.shadow,
    }),
    [tokens, variant]
  );

  // animação
  const baseDuration = 1.4; // s
  const duration = Math.max(0.4, baseDuration / Math.max(0.25, speed));
  const dotTransition = effectivePaused
    ? undefined
    : { repeat: Infinity as const, ease: "linear" as const, duration };

  const delays = [0, 0.18, 0.36];

  const containers: Record<Variant, string> = {
    pill: `
      inline-flex items-center
      px-[${s.padX}px] py-[${s.padY}px] ${s.radius}
      gap-[${s.gap}px] border
    `,
    bubble: `
      inline-flex items-center
      px-[${s.padX}px] py-[${s.padY}px] rounded-full
      gap-[${s.gap}px] border
    `,
    inline: `
      inline-flex items-center gap-[${s.gap}px] align-middle
    `,
  };

  const containerStyle =
    variant === "inline"
      ? (cssVars as React.CSSProperties)
      : ({
          ...(cssVars as React.CSSProperties),
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow)",
        } as React.CSSProperties);

  return (
    <div
      className={`relative ${containers[variant]} ${className}`}
      style={containerStyle}
      aria-live="polite"
      role="status"
    >
      <span className={srOnly}>{ariaLabel}</span>

      <div className="flex items-center gap-[inherit]">
        {delays.map((delay, i) => (
          <motion.span
            key={i}
            role="presentation"
            aria-hidden="true"
            className="inline-block rounded-full"
            style={{
              width: s.dot,
              height: s.dot,
              backgroundColor: effectivePaused ? "var(--dot)" : "var(--dot-dim)",
            }}
            animate={
              effectivePaused
                ? { opacity: [0.6, 1, 0.6] } // pulse suave para reduced motion/pausado
                : {
                    y: [0, -2, 0],
                    backgroundColor: ["var(--dot-dim)", "var(--dot)", "var(--dot-dim)"],
                  }
            }
            transition={
              dotTransition
                ? { ...dotTransition, delay }
                : { repeat: Infinity, duration: 1.6, ease: "easeInOut" }
            }
          />
        ))}
      </div>
    </div>
  );
}
