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
  /** Aumenta espaçamento/padding para dar "respiro" */
  density?: Density;
  /** Mostrar com label "Eco está digitando..." */
  withLabel?: boolean;
  /** Tempo em segundos que está digitando */
  elapsedTime?: number;
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
  ariaLabel = "Eco refletindo…",
  density = "airy",
  withLabel = false,
  elapsedTime = 0,
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
      ? "inline-flex items-center gap-2 align-middle"
      : "inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 bg-gradient-to-r from-eco-babySoft to-eco-babySoft/80 backdrop-blur border border-eco-baby/20 shadow-[0_2px_8px_rgba(10,122,255,0.12)]",
    "transition-all duration-200 ease-out",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dotClass = [
    "rounded-full bg-eco-baby",
    DOT_SIZES[size] ?? DOT_SIZES.md,
  ].join(" ");

  const pulseKeyframes = `
    @keyframes ecoDot {
      0%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      50% {
        transform: scale(1);
        opacity: 1;
      }
    }
    @keyframes ecoBreathing {
      0%, 100% {
        opacity: 0.7;
      }
      50% {
        opacity: 0.9;
      }
    }
  `;

  // Adicionar estilos de animação dinamicamente
  if (typeof document !== 'undefined') {
    let styleEl = document.getElementById('typing-dots-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'typing-dots-styles';
      styleEl.textContent = pulseKeyframes;
      document.head.appendChild(styleEl);
    }
  }

  return (
    <div className={containerClasses} aria-live="polite" role="status">
      <span className={srOnly}>{ariaLabel}</span>

      {/* Dots com animação sofisticada */}
      <div className="flex items-center gap-1.5">
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
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>

      {/* Label com tempo decorrido */}
      {withLabel && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-eco-text/80 whitespace-nowrap">
            Eco está digitando
          </span>
          {elapsedTime > 0 && elapsedTime < 60 && (
            <span
              className="text-xs text-eco-muted/60 font-light"
              style={{
                animation: 'ecoBreathing 2s ease-in-out infinite',
                animationPlayState: playState,
              }}
            >
              ({Math.round(elapsedTime)}s)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TypingDots;
