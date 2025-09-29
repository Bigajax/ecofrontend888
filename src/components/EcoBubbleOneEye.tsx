import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type EcoState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'focus';
type EcoVariant = 'icon' | 'avatar' | 'message' | 'voice';

export interface EcoBubbleOneEyeProps {
  state?: EcoState;
  variant?: EcoVariant;
  size?: number;
}

const STATE_LABELS: Record<EcoState, string> = {
  idle: 'ECO em repouso',
  listening: 'ECO escutando',
  speaking: 'ECO respondendo',
  thinking: 'ECO refletindo',
  focus: 'ECO em foco',
};

const DEFAULT_SIZES: Record<EcoVariant, number> = {
  icon: 24,
  avatar: 40,
  message: 30,
  voice: 240,
};

type MotionConfig = {
  animate: any;
  transition?: any;
};

const STATIC_BUBBLE: MotionConfig = {
  animate: { scale: 1, rotate: 0, x: 0, y: 0 },
};

const STATIC_EYE: MotionConfig = {
  animate: { scaleY: 1, scale: 1 },
};

const STATIC_PUPIL: MotionConfig = {
  animate: { x: 0, y: 0, scale: 1, opacity: 1 },
};

const getBubbleMotion = (state: EcoState, reduceMotion: boolean): MotionConfig => {
  if (reduceMotion) {
    if (state === 'focus') return { animate: { scale: 1.02 } };
    return STATIC_BUBBLE;
  }

  switch (state) {
    case 'listening':
      return {
        animate: { scale: [1, 1.07, 1] },
        transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'speaking':
      return {
        animate: { rotate: [-2.2, 2.2, -2.2] },
        transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'thinking':
      return {
        animate: { x: [0, 1.8, -1.8, 0], y: [0, -1.6, 1.6, 0] },
        transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'focus':
      return {
        animate: { scale: [1, 1.04, 1] },
        transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
      };
    default:
      return STATIC_BUBBLE;
  }
};

const getEyeMotion = (state: EcoState, reduceMotion: boolean): MotionConfig => {
  if (reduceMotion) return STATIC_EYE;

  if (state === 'idle') {
    return {
      animate: { scaleY: [1, 1, 0.15, 1] },
      transition: {
        duration: 2.4,
        times: [0, 0.72, 0.82, 1],
        repeat: Infinity,
        repeatDelay: 3.4,
        ease: 'easeInOut',
      },
    };
  }

  if (state === 'listening') {
    return {
      animate: { scale: [1, 1.02, 1] },
      transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
    };
  }

  return STATIC_EYE;
};

const getPupilMotion = (state: EcoState, reduceMotion: boolean): MotionConfig => {
  if (reduceMotion) return STATIC_PUPIL;

  switch (state) {
    case 'speaking':
      return {
        animate: { scale: [1, 1.08, 0.96, 1] },
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'thinking':
      return {
        animate: {
          x: [0, -1.2, 1.4, -0.8, 0],
          y: [0, 1.2, -1, 0.8, 0],
        },
        transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'listening':
      return {
        animate: { opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] },
        transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
      };
    default:
      return STATIC_PUPIL;
  }
};

const EcoBubbleOneEye: React.FC<EcoBubbleOneEyeProps> = ({
  state = 'idle',
  variant = 'icon',
  size,
}) => {
  const reduceMotion = useReducedMotion();
  const dimension = size ?? DEFAULT_SIZES[variant];
  const irisScale = variant === 'voice' ? 0.44 : variant === 'avatar' ? 0.42 : variant === 'message' ? 0.4 : 0.38;
  const irisSize = dimension * irisScale;
  const pupilSize = irisSize * 0.45;

  const bubbleMotion = getBubbleMotion(state, reduceMotion);
  const eyeMotion = getEyeMotion(state, reduceMotion);
  const pupilMotion = getPupilMotion(state, reduceMotion);

  const label = STATE_LABELS[state] || 'ECO';
  const haloSize = dimension * (variant === 'voice' ? 1.4 : 1.2);
  const glowSize = dimension * (variant === 'voice' ? 1.5 : 1.35);

  const showListeningHalo = state === 'listening';
  const showFocusGlow = state === 'focus';

  return (
    <div
      className="relative inline-flex select-none items-center justify-center"
      style={{ width: dimension, height: dimension }}
    >
      {showFocusGlow && (
        <motion.span
          aria-hidden
          className="absolute pointer-events-none rounded-full blur-2xl"
          style={{
            width: glowSize,
            height: glowSize,
            background: 'radial-gradient(60% 60% at 50% 50%, rgba(120, 170, 255, 0.42), transparent)',
          }}
          animate={
            reduceMotion
              ? { opacity: 0.55 }
              : { opacity: [0.45, 0.75, 0.45], scale: [1, 1.06, 1] }
          }
          transition={{ duration: 2.4, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
        />
      )}

      {showListeningHalo && (
        <motion.span
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            width: haloSize,
            height: haloSize,
            background: 'radial-gradient(60% 60% at 50% 50%, rgba(102, 160, 255, 0.3), transparent)',
          }}
          animate={
            reduceMotion
              ? { opacity: 0.5 }
              : { opacity: [0.35, 0.75, 0.35], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 1.6, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.div
        role="img"
        aria-label={label}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: dimension,
          height: dimension,
          background:
            'radial-gradient(135% 135% at 32% 20%, rgba(255,255,255,0.96), rgba(208,222,255,0.4))',
          border: '1px solid rgba(140, 174, 255, 0.45)',
          boxShadow:
            '0 18px 38px rgba(15, 23, 42, 0.16), inset 0 0 18px rgba(255,255,255,0.45)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
        animate={bubbleMotion.animate}
        transition={bubbleMotion.transition}
      >
        <span
          aria-hidden
          className="absolute inset-[18%] rounded-full"
          style={{
            background:
              'radial-gradient(120% 120% at 75% 20%, rgba(255,255,255,0.6), rgba(182, 206, 255, 0.25))',
          }}
        />

        <motion.div
          aria-hidden
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: irisSize,
            height: irisSize,
            background:
              'radial-gradient(120% 120% at 30% 25%, rgba(158, 189, 255, 0.85), rgba(74, 110, 196, 0.65))',
            boxShadow:
              'inset 0 0 12px rgba(32, 54, 120, 0.45), inset 0 2px 8px rgba(255,255,255,0.45)',
          }}
          animate={eyeMotion.animate}
          transition={eyeMotion.transition}
        >
          <motion.span
            aria-hidden
            className="block rounded-full"
            style={{
              width: pupilSize,
              height: pupilSize,
              background:
                'radial-gradient(120% 120% at 30% 30%, rgba(20,27,45,0.95), rgba(2,5,12,0.65))',
              boxShadow: '0 4px 8px rgba(4, 10, 24, 0.45)',
            }}
            animate={pupilMotion.animate}
            transition={pupilMotion.transition}
          />
          <span
            aria-hidden
            className="absolute -top-[18%] left-[18%] h-[35%] w-[35%] rounded-full"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 45%, rgba(255,255,255,0.85), rgba(255,255,255,0.1))',
              filter: 'blur(0.4px)',
              opacity: 0.8,
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EcoBubbleOneEye;
