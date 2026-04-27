import React from 'react';
import clsx from 'clsx';
import { getEmotionToken, resolveEmotionKey } from '../pages/memory/emotionTokens';

type EmotionOrbProps = {
  emotion?: string;
  className?: string;
  size?: number;
};

type IconFn = (s: number) => React.ReactNode;

const icons: Record<string, IconFn> = {
  alegria: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 17 L19 7" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2.5"/>
      <circle cx="5" cy="17" r="2.5" fill="white" fillOpacity="0.9"/>
      <circle cx="12" cy="12" r="2.5" fill="white" fillOpacity="0.9"/>
      <circle cx="19" cy="7" r="2.5" fill="white" fillOpacity="0.9"/>
    </svg>
  ),

  calmo: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 9 Q5.5 6.5 9 9 Q12.5 11.5 16 9 Q19.5 6.5 22 9"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.9"/>
      <path d="M2 13 Q5.5 10.5 9 13 Q12.5 15.5 16 13 Q19.5 10.5 22 13"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.6"/>
      <path d="M2 17 Q5.5 14.5 9 17 Q12.5 19.5 16 17 Q19.5 14.5 22 17"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.32"/>
    </svg>
  ),

  tristeza: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4 C12 4 6 11 6 15 C6 18.3 8.7 21 12 21 C15.3 21 18 18.3 18 15 C18 11 12 4 12 4Z"
        fill="white" fillOpacity="0.85"
      />
    </svg>
  ),

  raiva: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13.5 3 L6 14 L11 14 L9 21 L18.5 10 L13 10 Z"
        fill="white" fillOpacity="0.88"/>
    </svg>
  ),

  surpresa: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4 L12 20 M4 12 L20 12 M6.3 6.3 L17.7 17.7 M17.7 6.3 L6.3 17.7"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.88"
      />
    </svg>
  ),

  medo: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 L21 19.5 L3 19.5 Z"
        stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
        fill="white" fillOpacity="0.12"
      />
      <path d="M12 9.5 L12 14.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="12" cy="17.5" r="1.4" fill="white"/>
    </svg>
  ),

  antecipacao: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 15 L12 9 L18 15"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"/>
      <path d="M6 20 L12 14 L18 20"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.42"/>
    </svg>
  ),

  frustracao: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8 L20 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.9"/>
      <path d="M6.5 13 L17.5 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.62"/>
      <path d="M10 18 L14 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.36"/>
    </svg>
  ),

  irritado: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12 L7 7 L11 14 L15 7 L19 14 L21 12"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"
      />
    </svg>
  ),

  nojo: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5.5 C17.5 5.5 20.5 9 20.5 13 C20.5 17 16.7 19.5 12 19.5 C8.2 19.5 6 17.2 6 14.5 C6 12 8 10.8 10.5 10.8 C12.8 10.8 14 12 14 13.8"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.9"
      />
    </svg>
  ),

  incerteza: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 9.5 C9.5 7.5 10.7 6 12 6 C13.3 6 14.5 7.2 14.5 9 C14.5 11 12 11.8 12 14"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9"
      />
      <circle cx="12" cy="17.5" r="1.5" fill="white" fillOpacity="0.9"/>
    </svg>
  ),

  neutro: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.6" strokeOpacity="0.82"/>
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.4" strokeOpacity="0.52"/>
      <circle cx="12" cy="12" r="1.5" fill="white" fillOpacity="0.85"/>
    </svg>
  ),
};

const EmotionOrb: React.FC<EmotionOrbProps> = ({ emotion, className, size = 44 }) => {
  const token = getEmotionToken(emotion);
  const key = resolveEmotionKey(emotion);
  const [c1, c2] = token.gradient;
  const iconFn = icons[key] ?? icons.neutro;
  const iconSize = Math.round(size * 0.46);

  return (
    <div
      role="img"
      aria-label={emotion ? `Emoção: ${token.label}` : 'Memória Eco'}
      className={clsx('relative grid place-items-center rounded-full shrink-0 overflow-hidden', className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 38% 32%, ${c1}, ${c2})`,
        boxShadow: `0 4px 14px ${c2}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }}
    >
      {/* Soft highlight */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: '52%',
          height: '38%',
          top: '7%',
          left: '10%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.26) 0%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10">{iconFn(iconSize)}</div>

      {emotion ? <span className="sr-only">{token.label}</span> : null}
    </div>
  );
};

export default EmotionOrb;
