import { useState } from 'react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import {
  SoundOption,
  SOUND_LABELS,
  SOUND_EMOJIS,
} from './types';

interface PlayerScreenProps {
  resumeTime: number | null;
  onPlay: (sound: SoundOption, resumeFrom?: number) => void;
}

const SOUND_OPTIONS: SoundOption[] = ['rain', 'forest', 'ocean', 'silence'];

const night1 = PROTOCOL_NIGHTS[0];

export function PlayerScreen({ resumeTime, onPlay }: PlayerScreenProps) {
  const [selectedSound, setSelectedSound] = useState<SoundOption>('rain');

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-between"
      style={{ background: '#0C0A1D' }}
    >
      <style>{`
        @keyframes pulse-play {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124,110,246,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(124,110,246,0); }
        }
        .play-btn-pulse { animation: pulse-play 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="w-full px-5 pt-6">
        <img
          src="/images/ECOTOPIA.webp"
          alt="Ecotopia"
          className="h-7 w-auto opacity-80"
        />
      </header>

      {/* Main content */}
      <main className="flex w-full max-w-sm flex-col items-center gap-6 px-6 py-4 text-center">
        {/* Night artwork */}
        <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '1/1' }}>
          {night1.imageUrl ? (
            <img
              src={night1.imageUrl}
              alt={night1.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: night1.gradient }}
            />
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, #0C0A1D 0%, transparent 60%)' }}
          />
          {/* Night badge */}
          <span
            className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold tracking-widest"
            style={{
              background: 'rgba(124,110,246,0.25)',
              border: '1px solid rgba(124,110,246,0.4)',
              color: '#C4BBFF',
            }}
          >
            NOITE 1 DE 7
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold leading-tight" style={{ color: '#F5F0E8' }}>
            {night1.title}
          </h1>
          <p className="text-base" style={{ color: 'rgba(245,240,232,0.6)' }}>
            Deite-se. Feche os olhos. Dê play.
          </p>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.4)' }}>
            {night1.duration}
          </p>
        </div>

        {/* Sound selector */}
        <div className="flex gap-3">
          {SOUND_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSound(s)}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all"
              style={{
                background:
                  selectedSound === s
                    ? 'rgba(124,110,246,0.25)'
                    : 'rgba(255,255,255,0.05)',
                border:
                  selectedSound === s
                    ? '1px solid rgba(124,110,246,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-xl">{SOUND_EMOJIS[s]}</span>
              <span className="text-xs" style={{ color: 'rgba(245,240,232,0.7)' }}>
                {SOUND_LABELS[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Volume reminder */}
        <p className="text-xs" style={{ color: 'rgba(245,240,232,0.35)' }}>
          🔊 Verifique se o volume do celular está ligado
        </p>

        {/* Play button */}
        <button
          onClick={() => onPlay(selectedSound)}
          className="play-btn-pulse flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, #7C6EF6 0%, #9B8BFF 100%)',
          }}
          aria-label="Iniciar meditação"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>
      </main>

      {/* Resume banner */}
      {resumeTime !== null && resumeTime > 10 && (
        <div
          className="w-full px-5 pb-8"
          style={{ color: 'rgba(245,240,232,0.7)' }}
        >
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-sm">Continuar de onde parou?</span>
            <div className="flex gap-3">
              <button
                onClick={() => onPlay(selectedSound, resumeTime)}
                className="text-sm font-medium"
                style={{ color: '#9B8BFF' }}
              >
                Retomar
              </button>
              <button
                onClick={() => onPlay(selectedSound, 0)}
                className="text-sm"
                style={{ color: 'rgba(245,240,232,0.4)' }}
              >
                Recomeçar
              </button>
            </div>
          </div>
        </div>
      )}

      {!resumeTime && <div className="pb-8" />}
    </div>
  );
}
