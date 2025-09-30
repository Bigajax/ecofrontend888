import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

import EyeBubbleBase, { EyeBubbleToken } from '../EyeBubbleBase';
import { emotionEyelidSurface, getEmotionToken } from '../../pages/memory/emotionTokens';

type EmotionBubbleProps = {
  emotion?: string;
  className?: string;
  size?: number;
  'aria-label'?: string;
};

const EmotionBubble: React.FC<EmotionBubbleProps> = ({
  emotion,
  size = 44,
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

  return (
    <EyeBubbleBase
      className={className}
      token={token}
      size={size}
      reduceMotion={reduceMotion}
      label={label}
    />
  );
};

export default EmotionBubble;
