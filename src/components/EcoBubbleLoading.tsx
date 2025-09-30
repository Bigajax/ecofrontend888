import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import EyeBubbleBase from "./EyeBubbleBase";
import { emotionTokens, type EmotionKey } from "../pages/memory/emotionTokens";

type LoadingVariant = "global" | "memories";

type Props = {
  size?: number; // px (default 64)
  className?: string; // classes extras
  text?: string; // texto opcional abaixo da bolha
  breathingSec?: number; // duração de um ciclo base (default 2s)
  variant?: LoadingVariant;
};

const RING_CONFIG = [
  { scale: [1, 1.08, 1], opacity: [0.35, 0.85, 0.35], duration: 2.6 },
  { scale: [1, 1.12, 1], opacity: [0.28, 0.75, 0.28], duration: 3.3 },
  { scale: [1, 1.16, 1], opacity: [0.18, 0.6, 0.18], duration: 4.1 },
];

const AVAILABLE_EMOTIONS = Object.keys(emotionTokens) as EmotionKey[];

const pickRandomEmotionKeys = (count: number): EmotionKey[] => {
  const shuffled = [...AVAILABLE_EMOTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

type GlobalLoadingProps = {
  size: number;
  breathingSec: number;
  reduceMotion: boolean;
};

const GlobalLoading: React.FC<GlobalLoadingProps> = ({ size, breathingSec, reduceMotion }) => {
  const irisSize = size * 0.58;
  const pupilSize = irisSize * 0.42;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {!reduceMotion &&
        RING_CONFIG.map((config, index) => {
          const ringSize = size * (1.1 + index * 0.22);
          return (
            <motion.div
              key={index}
              data-testid="global-ring"
              data-duration={(breathingSec * config.duration).toFixed(2)}
              aria-hidden
              className="absolute rounded-full border border-indigo-100/40 shadow-[0_0_18px_rgba(79,70,229,0.18)]"
              style={{
                width: ringSize,
                height: ringSize,
              }}
              animate={{
                scale: config.scale,
                opacity: config.opacity,
              }}
              transition={{
                duration: breathingSec * config.duration,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.2 * (index + 1),
              }}
            />
          );
        })}

      <motion.div
        aria-hidden
        className="relative flex items-center justify-center rounded-full shadow-xl"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(200,210,255,0.5))",
          border: "1px solid rgba(200, 220, 255, 0.45)",
          boxShadow: "0 18px 46px rgba(79,70,229,0.22)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
        transition={{
          duration: breathingSec * 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.span
          aria-hidden
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: irisSize,
            height: irisSize,
            background:
              "radial-gradient(120% 120% at 32% 24%, rgba(130,162,255,0.92), rgba(64,82,200,0.72))",
            boxShadow: "inset 0 0 18px rgba(32, 54, 120, 0.4)",
          }}
          animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.04, 1] }}
          transition={{
            duration: breathingSec * 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.span
            aria-hidden
            className="rounded-full"
            style={{
              width: pupilSize,
              height: pupilSize,
              background: "radial-gradient(125% 125% at 40% 35%, rgba(16,23,42,0.96), rgba(3,5,15,0.72))",
              boxShadow: "0 8px 12px rgba(4, 6, 20, 0.55)",
            }}
            animate={reduceMotion ? { scale: 1 } : { scale: [1, 0.94, 1] }}
            transition={{
              duration: breathingSec,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <span
            aria-hidden
            className="absolute -top-[18%] left-[18%] h-[32%] w-[32%] rounded-full"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 45%, rgba(255,255,255,0.8), rgba(255,255,255,0.15))",
              filter: "blur(0.4px)",
            }}
          />
        </motion.span>
      </motion.div>
    </div>
  );
};

type MemoriesLoadingProps = {
  size: number;
  reduceMotion: boolean;
  tokens: EmotionKey[];
};

const TRACKING_SEQUENCE = {
  x: [0, -6, 4, -3, 6, 0],
  y: [0, 1.5, -1.5, 0.5, -1, 0],
};

const MemoriesLoading: React.FC<MemoriesLoadingProps> = ({ size, reduceMotion, tokens }) => {
  const bubbleSize = Math.max(28, Math.min(size, 56));

  return (
    <div className="flex items-center justify-center gap-4">
      {tokens.map((tokenKey, index) => {
        const token = emotionTokens[tokenKey];
        const delay = index * 0.45;
        return (
          <motion.div
            key={`${tokenKey}-${index}`}
            data-testid="memories-eye"
            data-emotion={token.label}
            data-delay={delay.toFixed(2)}
            className="relative"
            animate={
              reduceMotion
                ? { scale: 1 }
                : {
                    x: TRACKING_SEQUENCE.x,
                    y: TRACKING_SEQUENCE.y,
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 3.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay,
                  }
            }
          >
            <EyeBubbleBase
              size={bubbleSize}
              token={{
                ...token,
                irisScale: Math.min(token.irisScale + 0.08, 0.62),
                pupilScale: token.pupilScale,
                blinkCadence: Math.max(token.blinkCadence, 3.2),
              }}
              reduceMotion={reduceMotion}
              label={`Bolha de emoção ${token.label}`}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

const EcoBubbleLoading: React.FC<Props> = ({
  size = 64,
  className = "",
  text = "Carregando...",
  breathingSec = 2,
  variant = "global",
}) => {
  const reduceMotion = useReducedMotion();
  const selectedTokens = React.useMemo(
    () => (variant === "memories" ? pickRandomEmotionKeys(3) : []),
    [variant]
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className={`flex flex-col items-center justify-center text-center ${className}`}
    >
      {variant === "memories" ? (
        <MemoriesLoading size={size} reduceMotion={reduceMotion} tokens={selectedTokens} />
      ) : (
        <GlobalLoading size={size} breathingSec={breathingSec} reduceMotion={reduceMotion} />
      )}
      {text && (
        <span className="mt-4 text-sm text-slate-500 select-none" data-testid="loading-text">
          {text}
        </span>
      )}
    </div>
  );
};

export default EcoBubbleLoading;
