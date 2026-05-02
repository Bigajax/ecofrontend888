import { useEffect, useRef, useState, useCallback } from 'react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { useMediaSession } from '@/hooks/useMediaSession';
import {
  trackGuestAudio25,
  trackGuestAudio50,
  trackGuestAudio75,
  trackGuestAudioCompleted,
} from '@/lib/mixpanelSonoGuestEvents';
import { SoundOption, SOUND_URLS, LS_KEYS } from './types';

interface PlaybackScreenProps {
  selectedSound: SoundOption;
  startTime: number;
  onComplete: () => void;
  onCutoffReached?: (time: number) => boolean;
  resumeSignal?: number;
}

const night1 = PROTOCOL_NIGHTS[0];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function saveProgress(time: number): void {
  try {
    localStorage.setItem(
      LS_KEYS.progress,
      JSON.stringify({ time, savedAt: Date.now() })
    );
  } catch {
    // Storage unavailable
  }
}

export function PlaybackScreen({
  selectedSound,
  startTime,
  onComplete,
  onCutoffReached,
  resumeSignal = 0,
}: PlaybackScreenProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgRef = useRef<HTMLAudioElement>(null);
  const completedRef = useRef(false);
  const cutoffTriggeredRef = useRef(false);
  const analyticsRef = useRef({ fired25: false, fired50: false, fired75: false });
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [isDimmed, setIsDimmed] = useState(false);
  const [bgVolume, setBgVolume] = useState(0.35);
  const [showMutedWarning, setShowMutedWarning] = useState(false);
  const [showCutoffWarning, setShowCutoffWarning] = useState(false);
  const cutoffWarnedRef = useRef(false);

  // Sync bg audio volume
  useEffect(() => {
    if (bgRef.current) bgRef.current.volume = bgVolume;
  }, [bgVolume]);

  const handlePlay = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    bgRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
    bgRef.current?.pause();
    setIsPlaying(false);
    if (audioRef.current) saveProgress(audioRef.current.currentTime);
  }, []);

  const handleToggle = useCallback(() => {
    if (isPlaying) handlePause();
    else handlePlay();
  }, [isPlaying, handlePlay, handlePause]);

  useEffect(() => {
    if (resumeSignal <= 0) return;
    handlePlay();
  }, [handlePlay, resumeSignal]);

  useMediaSession({
    title: night1.title,
    artist: 'Ecotopia — Protocolo Sono',
    artwork: night1.imageUrl,
    audioRef,
    isPlaying,
    duration,
    currentTime,
    onPlay: handlePlay,
    onPause: handlePause,
    onSeekBackward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
      }
    },
    onSeekForward: () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(
          audioRef.current.duration || 0,
          audioRef.current.currentTime + 15
        );
      }
    },
  });

  // Mount: start audio at startTime
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = startTime;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    const tryPlay = () => {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          // Check muted state 3s after play starts
          setTimeout(() => {
            if (audio.muted || audio.volume === 0) setShowMutedWarning(true);
          }, 3000);
        })
        .catch(() => {
          // Autoplay blocked — user will tap play
        });
      bgRef.current?.play().catch(() => {});
    };

    tryPlay();

    // Dim screen after 30s
    const dimTimer = setTimeout(() => setIsDimmed(true), 30_000);

    // Save progress every 15s
    saveIntervalRef.current = setInterval(() => {
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
    }, 15_000);

    // Save on visibility change (user switches app)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && audio.currentTime > 0) {
        saveProgress(audio.currentTime);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Save on page unload
    const onBeforeUnload = () => {
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearTimeout(dimTimer);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track currentTime updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      const d = audio.duration;
      setCurrentTime(t);

      // Warn 30s before cutoff
      if (t >= 210 && !cutoffWarnedRef.current && !cutoffTriggeredRef.current && onCutoffReached) {
        cutoffWarnedRef.current = true;
        setShowCutoffWarning(true);
      }

      if (t >= 240 && !cutoffTriggeredRef.current && onCutoffReached?.(t)) {
        cutoffTriggeredRef.current = true;
        setShowCutoffWarning(false);
        saveProgress(t);
        audio.pause();
        bgRef.current?.pause();
        setIsPlaying(false);
        return;
      }

      if (!d || d === 0) return;
      const pct = (t / d) * 100;

      if (!analyticsRef.current.fired25 && pct >= 25) {
        analyticsRef.current.fired25 = true;
        trackGuestAudio25();
      }
      if (!analyticsRef.current.fired50 && pct >= 50) {
        analyticsRef.current.fired50 = true;
        trackGuestAudio50();
      }
      if (!analyticsRef.current.fired75 && pct >= 75) {
        analyticsRef.current.fired75 = true;
        trackGuestAudio75();
      }
    };

    const onEnded = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      setIsPlaying(false);
      saveProgress(0); // Clear progress on completion
      trackGuestAudioCompleted();
      // Wait 1s then fade to post-meditation screen
      setTimeout(onComplete, 1000);
    };

    const onPauseEvent = () => {
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPauseEvent);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPauseEvent);
    };
  }, [onComplete, onCutoffReached]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-hidden"
      style={{ background: '#060411' }}
    >
      <style>{`
        @keyframes float-p {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.15; }
          50% { transform: translateY(-28px) scale(1.06); opacity: 0.4; }
        }
        .particle { animation: float-p var(--dur, 7s) ease-in-out infinite; }
      `}</style>

      {/* Hidden audio elements */}
      <audio ref={audioRef} src={night1.audioUrl} preload="auto" />
      {SOUND_URLS[selectedSound] && (
        <audio ref={bgRef} src={SOUND_URLS[selectedSound]!} preload="auto" loop />
      )}

      {/* Progress bar — thin line at top */}
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: '#7C6EF6' }}
        />
      </div>

      {/* Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { top: '20%', left: '15%', size: 6, dur: '8s', delay: '0s' },
          { top: '40%', left: '75%', size: 8, dur: '11s', delay: '2s' },
          { top: '65%', left: '30%', size: 5, dur: '9s', delay: '4s' },
          { top: '30%', left: '55%', size: 4, dur: '13s', delay: '1s' },
          { top: '75%', left: '80%', size: 7, dur: '10s', delay: '6s' },
          { top: '85%', left: '10%', size: 5, dur: '7s', delay: '3s' },
        ].map((p, i) => (
          <div
            key={i}
            className="particle absolute rounded-full"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: 'rgba(124,110,246,0.6)',
              '--dur': p.dur,
              animationDelay: p.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Dim overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-[3000ms]"
        style={{ background: '#000', opacity: isDimmed ? 0.4 : 0 }}
      />

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        {/* Artwork */}
        <div className="relative h-44 w-44 overflow-hidden rounded-full shadow-2xl" style={{ boxShadow: '0 0 60px rgba(124,110,246,0.3)' }}>
          {night1.imageUrl ? (
            <img src={night1.imageUrl} alt={night1.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: night1.gradient }} />
          )}
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-4xl font-light tabular-nums" style={{ color: '#F5F0E8', opacity: isDimmed ? 0.6 : 1, transition: 'opacity 1s' }}>
            {formatTime(currentTime)}
          </p>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.35)' }}>
            / {formatTime(duration)}
          </p>
        </div>
      </div>

      {/* Cutoff approach warning */}
      {showCutoffWarning && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: 'rgba(167,139,250,0.14)',
            border: '1px solid rgba(167,139,250,0.28)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: 'rgba(196,181,253,0.85)' }}>
            ✨ Em instantes, uma reflexão rápida
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex w-full flex-col items-center gap-4 pb-12 px-8">
        {/* Muted warning */}
        {showMutedWarning && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-sm" style={{ color: 'rgba(245,240,232,0.7)' }}>
              🔇 Som desativado — toque para ativar
            </span>
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.muted = false;
                setShowMutedWarning(false);
              }}
              className="text-sm font-medium"
              style={{ color: '#9B8BFF' }}
            >
              Ativar
            </button>
          </div>
        )}

        {/* Background volume slider */}
        {selectedSound !== 'silence' && (
          <div className="flex w-full items-center gap-3">
            <span className="text-xs" style={{ color: 'rgba(245,240,232,0.3)' }}>🎵</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgVolume}
              onChange={(e) => setBgVolume(Number(e.target.value))}
              className="w-full accent-violet-400 opacity-50"
            />
          </div>
        )}

        {/* Pause button */}
        <button
          onClick={handleToggle}
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          aria-label={isPlaying ? 'Pausar' : 'Retomar'}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(245,240,232,0.8)">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(245,240,232,0.8)">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
