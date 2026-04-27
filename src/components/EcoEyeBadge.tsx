import React from 'react';
import clsx from 'clsx';
import { getEmotionToken } from '../pages/memory/emotionTokens';

type EcoEyeBadgeProps = {
  emotion?: string;
  className?: string;
  [key: string]: unknown;
};

const EcoEyeBadge: React.FC<EcoEyeBadgeProps> = ({ emotion, className }) => {
  const token = getEmotionToken(emotion);
  const [c1, c2] = token.gradient;

  return (
    <div
      role="img"
      aria-label={emotion ? `Emoção: ${token.label}` : 'Memória Eco'}
      className={clsx(
        'relative grid place-items-center rounded-2xl h-14 w-14 md:h-[60px] md:w-[60px] shrink-0',
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow: `0 4px 14px ${c2}55, inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      {/* Eyelid shimmer */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 55%)' }}
      />

      <svg viewBox="0 0 80 80" aria-hidden className="relative h-8 w-8 md:h-9 md:w-9">
        {/* Outer rings */}
        <circle cx="40" cy="40" r="27" stroke="white" strokeOpacity="0.15" strokeWidth="1.4" fill="none" />
        <circle cx="40" cy="40" r="18" stroke="white" strokeOpacity="0.22" strokeWidth="1.4" fill="none" />
        {/* Iris */}
        <circle cx="40" cy="40" r="11" fill="white" fillOpacity="0.20" />
        {/* Pupil */}
        <circle cx="40" cy="40" r="5.5" fill="white" fillOpacity="0.92" />
        {/* Catchlight */}
        <circle cx="43.5" cy="37" r="2" fill="white" fillOpacity="0.55" />
        {/* Eye shape */}
        <path
          d="M14 40c7-9.5 17.5-15.5 26-15.5S57 30.5 64 40c-7 9.5-17.5 15.5-26 15.5S21 49.5 14 40Z"
          stroke="white" strokeOpacity="0.20" strokeWidth="1.3"
          fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>

      {emotion ? <span className="sr-only">{token.label}</span> : null}
    </div>
  );
};

export default EcoEyeBadge;
