import React from 'react';
import { motion, MotionProps } from 'framer-motion';

import type { MicroMotionPattern } from '../pages/memory/emotionTokens';

export type MotionConfig = Pick<MotionProps, 'animate' | 'transition'>;

export type MotionFactory<T extends object = {}> = (options: { reduceMotion: boolean } & T) => MotionConfig;

export type EyeBubbleToken = {
  gradient: [string, string];
  highlight: [string, string];
  irisGradient: [string, string];
  irisHighlight: [string, string];
  pupilColor: string;
  irisScale: number;
  pupilScale: number;
  eyelidOffset: number;
  blinkCadence: number;
  microMotion: MicroMotionPattern;
  accent?: string;
  eyelidSurface?: string;
  animations?: {
    bubble?: MotionFactory;
    iris?: MotionFactory;
    pupil?: MotionFactory;
    eyelid?: MotionFactory<{ restingScale: number }>;
  };
};

const STATIC_MOTION: MotionConfig = { animate: { scale: 1 } };
const STATIC_PUPIL: MotionConfig = { animate: { scale: 1, x: 0, y: 0, opacity: 1 } };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createMicroMotion = (pattern: MicroMotionPattern, reduceMotion: boolean) => {
  if (reduceMotion) {
    return { bubble: STATIC_MOTION, iris: STATIC_MOTION, pupil: STATIC_PUPIL } as const;
  }

  switch (pattern) {
    case 'pulse':
      return {
        bubble: {
          animate: { scale: [1, 1.07, 1] },
          transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        },
        iris: {
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
        },
        pupil: {
          animate: { scale: [1, 0.94, 1] },
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
        },
      } as const;
    case 'breathing':
      return {
        bubble: {
          animate: { scale: [1, 1.04, 1] },
          transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
        },
        iris: {
          animate: { scale: [1, 1.03, 1] },
          transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
        },
        pupil: STATIC_PUPIL,
      } as const;
    case 'tremor':
      return {
        bubble: {
          animate: { rotate: [0, 2.2, -1.8, 2.2, 0] },
          transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        },
        iris: {
          animate: { rotate: [0, -1.5, 1.2, -1.2, 0] },
          transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        },
        pupil: {
          animate: { x: [0, -0.8, 0.6, -0.5, 0], y: [0, 0.6, -0.5, 0.4, 0] },
          transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
        },
      } as const;
    case 'tracking':
      return {
        bubble: {
          animate: { x: [0, 1.6, -1.2, 1.2, 0], y: [0, -1.4, 1.1, -0.9, 0] },
          transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
        },
        iris: STATIC_MOTION,
        pupil: {
          animate: { x: [0, -1.4, 1.6, -1.2, 0], y: [0, 1.2, -1.4, 1.1, 0] },
          transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
        },
      } as const;
    case 'shortOscillation':
      return {
        bubble: {
          animate: { rotate: [-1.6, 1.6, -1.2, 1.2, -1.6] },
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
        },
        iris: {
          animate: { scale: [1, 0.97, 1.02, 0.98, 1] },
          transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
        },
        pupil: STATIC_PUPIL,
      } as const;
    default:
      return { bubble: STATIC_MOTION, iris: STATIC_MOTION, pupil: STATIC_PUPIL } as const;
  }
};

const createBlinkTimeline = (
  cadence: number,
  restingScale: number,
  reduceMotion: boolean
): MotionConfig => {
  if (reduceMotion || !Number.isFinite(cadence) || cadence <= 0) {
    return { animate: { scaleY: restingScale } };
  }
  return {
    animate: { scaleY: [restingScale, restingScale, 1, restingScale] },
    transition: {
      duration: 1.1,
      times: [0, 0.7, 0.78, 1],
      repeat: Infinity,
      repeatDelay: cadence,
      ease: 'easeInOut',
    },
  };
};

export type EyeBubbleBaseProps = {
  size?: number;
  className?: string;
  token: EyeBubbleToken;
  reduceMotion?: boolean;
  label: string;
  role?: React.AriaRole;
};

const EyeBubbleBase: React.FC<EyeBubbleBaseProps> = ({
  size = 44,
  className = '',
  token,
  reduceMotion = false,
  label,
  role = 'img',
}) => {
  const dimension = size;
  const irisSize = dimension * clamp(token.irisScale ?? 0.4, 0.2, 0.75);
  const pupilSize = irisSize * clamp(token.pupilScale ?? 0.45, 0.1, 0.9);

  const micro = createMicroMotion(token.microMotion, reduceMotion);

  const bubbleMotion = token.animations?.bubble?.({ reduceMotion }) ?? micro.bubble;
  const irisMotion = token.animations?.iris?.({ reduceMotion }) ?? micro.iris;
  const pupilMotion = token.animations?.pupil?.({ reduceMotion }) ?? micro.pupil;

  const restingScale = clamp(token.eyelidOffset ?? 0, 0, 0.95);
  const eyelidMotion = token.animations?.eyelid?.({ reduceMotion, restingScale }) ??
    createBlinkTimeline(token.blinkCadence, restingScale, reduceMotion);

  return (
    <div
      className={`relative inline-flex select-none items-center justify-center ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <motion.div
        role={role}
        aria-label={label}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: dimension,
          height: dimension,
          background: `linear-gradient(135deg, ${token.gradient[0]}, ${token.gradient[1]})`,
          border: '1px solid rgba(255,255,255,0.28)',
          boxShadow:
            '0 18px 34px rgba(15,23,42,0.18), inset 0 1px 18px rgba(255,255,255,0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        animate={bubbleMotion.animate}
        transition={bubbleMotion.transition}
      >
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            inset: dimension * 0.18,
            background: `radial-gradient(circle at 68% 22%, ${token.highlight[0]}, ${token.highlight[1]})`,
          }}
        />

        <motion.div
          aria-hidden
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: irisSize,
            height: irisSize,
            background: `radial-gradient(120% 120% at 32% 24%, ${token.irisGradient[0]}, ${token.irisGradient[1]})`,
            boxShadow: 'inset 0 0 12px rgba(32, 54, 120, 0.35), inset 0 2px 8px rgba(255,255,255,0.45)',
          }}
          animate={irisMotion.animate}
          transition={irisMotion.transition}
        >
          <motion.span
            aria-hidden
            className="block rounded-full"
            style={{
              width: pupilSize,
              height: pupilSize,
              background: token.pupilColor,
              boxShadow: '0 4px 9px rgba(4, 10, 24, 0.45)',
            }}
            animate={pupilMotion.animate}
            transition={pupilMotion.transition}
          />

          <motion.span
            aria-hidden
            className="absolute inset-0 origin-top rounded-full"
            style={{
              background:
                token.eyelidSurface ?? 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.05))',
            }}
            animate={eyelidMotion.animate}
            transition={eyelidMotion.transition}
          />

          <span
            aria-hidden
            className="absolute -top-[18%] left-[18%] h-[34%] w-[34%] rounded-full"
            style={{
              background: `radial-gradient(60% 60% at 50% 45%, ${token.irisHighlight[0]}, ${token.irisHighlight[1]})`,
              filter: 'blur(0.4px)',
              opacity: 0.8,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EyeBubbleBase;
