import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

import EyeBubbleBase, { EyeBubbleToken } from '../EyeBubbleBase';
import { appleShade } from '../../pages/memory/palette';
import { emotionEyelidSurface, getEmotionToken } from '../../pages/memory/emotionTokens';

type EmotionBubbleProps = {
  emotion?: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
};

const toRgb = (hex?: string) => {
  if (!hex) return null;
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) return null;
  const bigint = Number.parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const EmotionBubble: React.FC<EmotionBubbleProps> = ({
  emotion,
  size = 48,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const reduceMotion = useReducedMotion();
  const data = useMemo(() => getEmotionToken(emotion), [emotion]);

  const token: EyeBubbleToken = {
    gradient: data.gradient,
    highlight: data.highlight,
    irisGradient: data.irisGradient,
    irisHighlight: data.irisHighlight,
    pupilColor: data.pupilColor,
    irisScale: data.irisScale,
    pupilScale: data.pupilScale,
    eyelidOffset: data.eyelidOffset,
    blinkCadence: data.blinkCadence,
    microMotion: data.microMotion,
    eyelidSurface: emotionEyelidSurface,
  };

  const label = ariaLabel ?? `Emoção: ${data.label}`;

  const accentLight = useMemo(() => appleShade(data.accent, 0.22), [data.accent]);
  const accentDark = useMemo(() => appleShade(data.accent, -0.25), [data.accent]);
  const accentRgb = useMemo(() => toRgb(data.accent), [data.accent]);

  const frameShadow = 'none';

  const padding = Math.max(8, Math.round(size * 0.22));
  const frameSize = size + padding * 2;

  return (
    <div
      className={`group relative inline-flex items-center justify-center ${className}`}
      style={{ width: frameSize, height: frameSize }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[22px] transition duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
        style={{
          background: `linear-gradient(135deg, ${accentLight}, ${accentDark})`,
          boxShadow: frameShadow,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-[1.2px] rounded-[20px] border border-white/45 bg-white/35 backdrop-blur-2xl transition duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:bg-white/45"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[26px] opacity-0 transition duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:opacity-60"
        style={{
          background: accentRgb
            ? `radial-gradient(120% 120% at 20% 0%, rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.35), transparent 65%)`
            : 'radial-gradient(120% 120% at 20% 0%, rgba(79, 70, 229, 0.28), transparent 65%)',
        }}
      />

      <EyeBubbleBase
        className="relative transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:scale-[1.04]"
        token={token}
        size={size}
        reduceMotion={reduceMotion}
        label={label}
      />
    </div>
  );
};

export default EmotionBubble;
