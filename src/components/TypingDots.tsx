import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Variant = "pill" | "bubble" | "inline";
type Tone = "auto" | "light" | "dark";
type Density = "cozy" | "airy";

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
  /** Aumenta espaçamento/padding para dar “respiro” */
  density?: Density;
};

const SIZES = {
  sm: { dot: 7, gap: 8, padX: 10, padY: 7, radius: "rounded-xl" },
  md: { dot: 9, gap: 11, padX: 14, padY: 9, radius: "rounded-2xl" },
  lg: { dot: 11, gap: 14, padX: 18, padY: 11, radius: "rounded-3xl" },
} as const;

const TOKENS = {
  light: {
    dot: "#2E79FF",
    dotDim: "rgba(46, 121, 255, 0.55)",
    container: "rgba(15, 23, 42, 0.05)",
    bubble: "rgba(15, 23, 42, 0.06)",
    border: "rgba(148, 163, 184, 0.28)",
    shadow: "0 8px 22px rgba(16,24,40,0.08)",
  },
  dark: {
    dot: "#5FA9FF",
    dotDim: "rgba(95, 169, 255, 0.55)",
    container: "rgba(148, 163, 184, 0.16)",
    bubble: "rgba(148, 163, 184, 0.22)",
    border: "rgba(148, 163, 184, 0.35)",
    shadow: "0 8px 24px rgba(16,24,40,0.18)",
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
  density = "airy",
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
    const onChange = (e: MediaQueryListEvent) =>
      setResolvedTone(e.matches ? "dark" : "light");
    setResolvedTone(media.matches ? "dark" : "light");
    try {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    } catch {
      // Safari antigo
      // @ts-ignore
      media.addListener(onChange);
      // @ts-ignore
      return () => media.removeListener(onChange);
    }
  }, [tone]);

  const base = SIZES[size];
  const tokens = TOKENS[resolvedTone];
  const prefersReduced = useReducedMotion();
  const effectivePaused = paused || prefersReduced;

  // densidade: “airy” aumenta gap/padding e radius sutilmente
  const airyFactor = density === "airy" ? 1.25 : 1;
  const s = {
    dot: base.dot,
    gap: Math.round(base.gap * airyFactor),
    padX: Math.round(base.padX * airyFactor),
    padY: Math.round(base.padY * airyFactor),
    radius:
      density === "airy" && base.radius === "rounded-2xl"
        ? "rounded-3xl"
        : base.radius,
  };

  // CSS vars (permite custom via tema)
  const cssVars = useMemo(
    () => ({
      // @ts-expect-error CSS vars inline
      "--dot": tokens.dot,
      "--dot-dim": tokens.dotDim,
      "--bg": variant === "bubble" ? tokens.bubble : tokens.container,
      "--border": tokens.border,
      "--shadow": tokens.shadow,
    }),
    [tokens, variant]
  );

  // animação “respirada”
  const baseDuration = 1.6; // mais lenta por padrão
  const duration = Math.max(0.5, baseDuration / Math.max(0.25, speed));
  const delays = [0, 0.22, 0.44]; // mais espaçadas

  const dotAnim = effectivePaused
    ? { opacity: [0.65, 1, 0.65] }
    : {
        y: [0, -3, -3, 0], // hold no topo
        opacity: [0.7, 1, 1, 0.7],
        scale: [1, 1.04, 1.04, 1],
        backgroundColor: ["var(--dot-dim)", "var(--dot)", "var(--dot)", "var(--dot-dim)"],
      };

  const dotTransition = effectivePaused
    ? { duration: duration * 1.1, repeat: Infinity, ease: "easeInOut" }
    : { duration, repeat: Infinity, ease: [0.4, 0.0, 0.2, 1] as any }; // easeInOut custom

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
              filter: "drop-shadow(0 1px 2px rgba(16,24,40,0.08))",
            }}
            animate={dotAnim}
            transition={{ ...dotTransition, delay }}
          />
        ))}
      </div>
    </div>
  );
}
