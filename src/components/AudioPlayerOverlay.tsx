import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface AudioPlayerOverlayProps {
  audio: HTMLAudioElement;
  onClose: () => void;
  onProgress?: (info: { ratio: number; currentTime: number; duration: number }) => void;
  requiresManualStart?: boolean;
}

const AudioPlayerOverlay: React.FC<AudioPlayerOverlayProps> = ({
  audio,
  onClose,
  onProgress,
  requiresManualStart = false,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(audio);
  const progressRef = useRef<AudioPlayerOverlayProps["onProgress"]>(onProgress);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(() => !audio.paused && !audio.ended);
  const [currentTime, setCurrentTime] = useState(() => audio.currentTime || 0);
  const [duration, setDuration] = useState(() =>
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0,
  );
  const [manualStartNeeded, setManualStartNeeded] = useState(requiresManualStart);

  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    audioRef.current = audio;
    setIsPlaying(!audio.paused && !audio.ended);
    setCurrentTime(audio.currentTime || 0);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }, [audio]);

  useEffect(() => {
    setManualStartNeeded(requiresManualStart);
  }, [requiresManualStart]);

  const ensureContext = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const el = audio;
    if (!el) return;

    try {
      // @ts-ignore - suporte webkit
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx: AudioContext = new Ctx();
        const src = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = 1.35;

        src.connect(gain).connect(ctx.destination);

        audioCtxRef.current = ctx;
        sourceRef.current = src;
        gainRef.current = gain;

        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
      }
    } catch {
      /* noop */
    }

    return () => {
      try {
        sourceRef.current?.disconnect();
      } catch {}
      try {
        gainRef.current?.disconnect();
      } catch {}
      try {
        audioCtxRef.current?.close();
      } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      audioCtxRef.current = null;
    };
  }, [audio]);

  useEffect(() => {
    const el = audio;
    if (!el) return;

    const handleTimeUpdate = () => {
      const current = el.currentTime || 0;
      setCurrentTime(current);
      const baseDuration =
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
      if (baseDuration > 0) {
        const ratio = Math.min(1, Math.max(0, current / baseDuration));
        progressRef.current?.({ ratio, currentTime: current, duration: baseDuration });
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    };

    const handleDurationChange = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setManualStartNeeded(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setManualStartNeeded(true);
      setIsPlaying(false);
    };

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("durationchange", handleDurationChange);
    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("error", handleError);

    handleTimeUpdate();

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("durationchange", handleDurationChange);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("error", handleError);
    };
  }, [audio, duration]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        try {
          audio.pause();
        } catch {}
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [audio, onClose]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!isPlaying) {
      ensureContext();
      el
        .play()
        .then(() => {
          setManualStartNeeded(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setManualStartNeeded(true);
        });
    } else {
      el.pause();
    }
  }, [ensureContext, isPlaying]);

  const handleManualStart = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    ensureContext();
    el
      .play()
      .then(() => {
        setManualStartNeeded(false);
        setIsPlaying(true);
      })
      .catch(() => {
        setManualStartNeeded(true);
      });
  }, [ensureContext]);

  const seek = useCallback(
    (seconds: number) => {
      const el = audioRef.current;
      if (!el) return;
      const baseDuration =
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
      const limit = baseDuration || el.duration || 0;
      const next = Math.max(0, Math.min(limit, el.currentTime + seconds));
      el.currentTime = next;
      setCurrentTime(next);
    },
    [duration],
  );

  const seekToRatio = useCallback(
    (ratio: number) => {
      if (!duration) return;
      const el = audioRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min(duration, duration * ratio));
      el.currentTime = next;
      setCurrentTime(next);
    },
    [duration],
  );

  const onProgressClick: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (!duration) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      seekToRatio(ratio);
    },
    [duration, seekToRatio],
  );

  const formatTime = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    const min = Math.floor(safe / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(safe % 60)
      .toString()
      .padStart(2, "0");
    return `${min}:${sec}`;
  };

  const handleClose = useCallback(() => {
    try {
      audio.pause();
    } catch {}
    onClose();
  }, [audio, onClose]);

  const IconBtn = ({
    onClick,
    label,
    children,
    disabled = false,
  }: {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-eco-baby/50 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
    >
      {children}
    </button>
  );

  const PauseIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="6" y="4" width="3" height="16" rx="1.4" />
      <rect x="15" y="4" width="3" height="16" rx="1.4" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );

  const ArrowCircle = ({ direction }: { direction: "left" | "right" }) => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      {direction === "left" ? <path d="M13 8l-4 4 4 4" /> : <path d="M11 8l4 4-4 4" />}
    </svg>
  );

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-[80] flex justify-center px-3">
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Reprodutor de áudio"
        className="pointer-events-auto relative flex w-full max-w-[min(520px,92vw)] flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 text-slate-900 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-eco-baby/60"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-eco-baby/40"
        >
          <X className="h-4 w-4" strokeWidth={1.6} />
          <span className="sr-only">Fechar</span>
        </button>

        <div className="flex flex-col gap-3 pr-6 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-3">
            <IconBtn onClick={togglePlay} label={isPlaying ? "Pausar" : "Tocar"}>
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </IconBtn>

            {manualStartNeeded ? (
              <button
                type="button"
                onClick={handleManualStart}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-eco-baby/60"
              >
                <PlayIcon />
                <span>Tocar</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="relative h-2 w-40 cursor-pointer rounded-full bg-slate-200 transition-colors hover:bg-slate-300"
                  onClick={onProgressClick}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={currentTime}
                  aria-label="Posição do áudio"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-900 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {formatTime(currentTime)}
                  {duration ? ` / ${formatTime(duration)}` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <IconBtn
              onClick={() => seek(-15)}
              label="Voltar 15 segundos"
              disabled={manualStartNeeded || (!duration && !isPlaying)}
            >
              <ArrowCircle direction="left" />
            </IconBtn>
            <IconBtn
              onClick={() => seek(15)}
              label="Avançar 15 segundos"
              disabled={manualStartNeeded || (!duration && !isPlaying)}
            >
              <ArrowCircle direction="right" />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerOverlay;
