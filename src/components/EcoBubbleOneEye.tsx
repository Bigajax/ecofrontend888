import React from 'react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';

type EcoState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'focus';
type EcoVariant = 'icon' | 'avatar' | 'message' | 'voice';

export interface EcoBubbleOneEyeProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: EcoState;
  variant?: EcoVariant;
  size?: number;
  color?: string;
  accentColor?: string;
}

const DEFAULT_SIZES: Record<EcoVariant, number> = {
  icon: 24,
  avatar: 40,
  message: 30,
  voice: 240,
};

// Drift path: olho vagueia suavemente dentro do anel interno (max ±6 unidades)
const DRIFT_X = [0,  4, -3,  5, -5,  2, -4,  3,  0];
const DRIFT_Y = [0, -3,  4, -5,  2,  5, -2, -4,  0];

const EcoBubbleOneEye: React.FC<EcoBubbleOneEyeProps> = ({
  state = 'idle',
  variant = 'icon',
  size,
  color = '#0D2E4F',
  accentColor = '#6EC8FF',
  className,
  style,
  ...rest
}) => {
  const reduceMotion = useReducedMotion() ?? false;
  const dimension = size ?? DEFAULT_SIZES[variant];
  const sw = 7;

  // Breathing do anel inteiro
  const breatheAnim = reduceMotion ? {} : {
    scale: state === 'listening' ? [1, 1.06, 1] : [1, 1.03, 1],
  };
  const breatheTrans = {
    duration: state === 'listening' ? 1.4 : 3.4,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  // Drift: bolinha vagueia dentro do anel
  const driftDuration = state === 'thinking' ? 4 : state === 'listening' ? 3 : 9;
  const driftAnim = reduceMotion ? {} : { x: DRIFT_X, y: DRIFT_Y };
  const driftTrans = {
    duration: driftDuration,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    repeatType: 'mirror' as const,
  };

  // Blink: scaleY colapsa e reabre
  const blinkAnim = reduceMotion ? {} : { scaleY: [1, 1, 0.06, 1] };
  const blinkTrans = {
    duration: 0.42,
    times: [0, 0.68, 0.82, 1],
    repeat: Infinity,
    repeatDelay: state === 'idle' ? 4 : 1.4,
    ease: 'easeInOut' as const,
  };

  // Speaking: bolinha pulsa em tamanho
  const speakAnim = reduceMotion ? {} : { scale: [1, 1.18, 0.9, 1.12, 1] };
  const speakTrans = { duration: 0.85, repeat: Infinity, ease: 'easeInOut' as const };

  const dotAnim  = state === 'speaking' ? speakAnim  : blinkAnim;
  const dotTrans = state === 'speaking' ? speakTrans : blinkTrans;

  return (
    <div
      className={clsx('relative inline-flex select-none items-center justify-center', className)}
      style={{ width: dimension, height: dimension, ...style }}
      role="img"
      aria-label="ECO AI"
      {...rest}
    >
      <motion.svg
        viewBox="0 0 100 100"
        width={dimension}
        height={dimension}
        overflow="visible"
        animate={breatheAnim}
        transition={breatheTrans}
      >
        {/* Outer ring */}
        <circle cx="50" cy="50" r="43" fill="none" stroke={color} strokeWidth={sw} />

        {/* Inner ring */}
        <circle cx="50" cy="50" r="26" fill="none" stroke={color} strokeWidth={sw} />

        {/* Grupo que deriva — bolinha + highlight juntos */}
        <motion.g animate={driftAnim} transition={driftTrans}>
          {/* Bolinha central */}
          <motion.circle
            cx="50" cy="50" r={11}
            fill={accentColor}
            animate={dotAnim}
            transition={dotTrans}
            style={{ transformOrigin: '50px 50px' }}
          />
          {/* Specular highlight acompanha o drift */}
          <circle cx="44" cy="44" r="2.6" fill="rgba(255,255,255,0.70)" />
        </motion.g>
      </motion.svg>
    </div>
  );
};

export default EcoBubbleOneEye;
