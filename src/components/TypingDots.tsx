import React, { useMemo } from "react";

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

const DOT_DELAYS = [0, 120, 240];
const DOT_SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const srOnly =
  "sr-only absolute -m-px h-px w-px overflow-hidden p-0 whitespace-nowrap border-0";

const clampSpeed = (speed: number | undefined): number => {
  if (typeof speed !== "number" || !Number.isFinite(speed) || speed <= 0) {
    return 1;
  }
  return speed;
};

const TypingDots: React.FC<Props> = ({
  variant = "pill",
  size = "md",
  className = "",
  tone = "auto",
  paused = false,
  speed = 1,
  ariaLabel = "Eco está digitando",
  density = "airy",
}) => {
  void tone;
  void density;

  const animationDuration = useMemo(() => {
    const base = 1.2;
    const normalizedSpeed = clampSpeed(speed);
    return Math.max(0.48, base / normalizedSpeed);
  }, [speed]);

  const playState: React.CSSProperties["animationPlayState"] = paused
    ? "paused"
    : "running";

  const resolvedVariant = variant === "inline" ? "inline" : "bubble";

  const containerClasses = [
    resolvedVariant === "inline"
      ? "inline-flex items-center gap-1.5 align-middle"
      : "inline-flex h-6 min-w-[56px] items-center justify-center gap-1.5 rounded-full px-2 bg-white/70 backdrop-blur border border-zinc-200/60",
    "transition-colors duration-150 ease-out",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dotClass = [
    "rounded-full bg-[#0A7AFF]",
    DOT_SIZES[size] ?? DOT_SIZES.md,
  ].join(" ");

  return (
    <div className={containerClasses} aria-live="polite" role="status">
      <span className={srOnly}>{ariaLabel}</span>
      {DOT_DELAYS.map((delay, index) => (
        <span
          key={delay + index}
          role="presentation"
          aria-hidden="true"
          className={dotClass}
          style={{
            animation: `ecoDot ${animationDuration}s ease-in-out infinite`,
            animationDelay: `${delay}ms`,
            animationPlayState: playState,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
};

export default TypingDots;
