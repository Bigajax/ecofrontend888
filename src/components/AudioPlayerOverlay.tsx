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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(() => !audio.paused && !audio.ended);
  const [currentTime, setCurrentTime] = useState(() => audio.currentTime || 0);
  const [duration, setDuration] = useState(() =>
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0,
  );
  const [manualStartNeeded, setManualStartNeeded] = useState(requiresManualStart);
  // "preparando": stream conectando / bufferizando antes do primeiro som.
  const [buffering, setBuffering] = useState(
    () => !requiresManualStart && audio.paused && (audio.currentTime || 0) === 0,
  );

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

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;

        // áudio: src → gain → destino; análise: gain → analyser (sem ir ao destino).
        src.connect(gain).connect(ctx.destination);
        gain.connect(analyser);

        audioCtxRef.current = ctx;
        sourceRef.current = src;
        gainRef.current = gain;
        analyserRef.current = analyser;

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
        analyserRef.current?.disconnect();
      } catch {}
      try {
        audioCtxRef.current?.close();
      } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      analyserRef.current = null;
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

    const handlePlaying = () => {
      setIsPlaying(true);
      setBuffering(false);
    };

    const handleCanPlay = () => {
      setBuffering(false);
    };

    const handleWaiting = () => {
      setBuffering(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setBuffering(false);
    };

    const handleError = () => {
      setManualStartNeeded(true);
      setIsPlaying(false);
      setBuffering(false);
    };

    el.addEventListener("timeupdate", handleTimeUpdate);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("durationchange", handleDurationChange);
    el.addEventListener("play", handlePlay);
    el.addEventListener("playing", handlePlaying);
    el.addEventListener("canplay", handleCanPlay);
    el.addEventListener("waiting", handleWaiting);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);
    el.addEventListener("error", handleError);

    handleTimeUpdate();

    return () => {
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("durationchange", handleDurationChange);
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("playing", handlePlaying);
      el.removeEventListener("canplay", handleCanPlay);
      el.removeEventListener("waiting", handleWaiting);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
      el.removeEventListener("error", handleError);
    };
  }, [audio, duration]);

  // Onda de áudio animada (baby-blue). Lê o AnalyserNode quando tocando; pulso suave quando
  // bufferizando/pausado.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const bars = 28;
    const gap = 3;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      const amplitudes: number[] = [];

      if (analyser && isPlaying) {
        const bins = analyser.frequencyBinCount;
        const data = new Uint8Array(bins);
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / bars) * bins);
          amplitudes.push(data[idx] / 255);
        }
      } else {
        phase += buffering ? 0.14 : 0.05;
        for (let i = 0; i < bars; i++) {
          const base = buffering ? 0.3 : 0.1;
          const swing = buffering ? 0.42 : 0.1;
          amplitudes.push(base + Math.abs(Math.sin(phase + i * 0.45)) * swing);
        }
      }

      const barW = Math.max(2, (w - gap * (bars - 1)) / bars);
      ctx2d.fillStyle = isPlaying ? "#38bdf8" : "rgba(56,189,248,0.5)"; // sky-400 / soft
      for (let i = 0; i < bars; i++) {
        const amp = Math.max(0.06, amplitudes[i]);
        const barH = amp * h;
        const x = i * (barW + gap);
        const y = (h - barH) / 2;
        const r = Math.min(barW / 2, 3);
        ctx2d.beginPath();
        const anyCtx = ctx2d as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
        if (typeof anyCtx.roundRect === "function") {
          anyCtx.roundRect(x, y, barW, barH, r);
        } else {
          ctx2d.rect(x, y, barW, barH);
        }
        ctx2d.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, buffering]);

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
      className="group inline-flex h-9 w-9 items-center justify-center rounded-full text-sky-600/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-sky-700 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-300/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
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
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-[80] flex justify-center px-3 sm:px-4">
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Reprodutor de áudio"
        className="pointer-events-auto relative flex w-full max-w-[min(460px,94vw)] flex-col gap-3 rounded-2xl border border-sky-200/70 bg-gradient-to-b from-sky-50/95 to-sky-100/85 px-3 py-3 sm:px-4 sm:py-4 sm:backdrop-blur-md text-slate-700 shadow-xl shadow-sky-300/30 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-sky-300/60"
      >
        <button
          type="button"
          onClick={handleClose}
          className="group absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sky-500/80 transition-all duration-300 ease-out hover:text-sky-700 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.8} />
          <span className="sr-only">Fechar</span>
        </button>

        <div className="flex flex-col gap-3 sm:gap-2.5">
          {/* Play grande + onda + progresso */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={manualStartNeeded ? handleManualStart : togglePlay}
              aria-label={manualStartNeeded ? "Tocar" : isPlaying ? "Pausar" : "Tocar"}
              className="relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-sky-400 text-white shadow-md shadow-sky-400/40 transition-all duration-300 ease-out hover:bg-sky-500 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sky-300 active:translate-y-0"
            >
              {buffering && !manualStartNeeded && (
                <span className="absolute inset-0 rounded-full bg-sky-300/50 animate-ping" aria-hidden />
              )}
              <span className="relative">
                {buffering && !manualStartNeeded ? (
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : isPlaying ? (
                  <PauseIcon />
                ) : (
                  <PlayIcon />
                )}
              </span>
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <canvas
                ref={canvasRef}
                width={240}
                height={32}
                className="h-8 w-full"
                aria-hidden
              />
              <div className="flex items-center gap-2">
                <div
                  className="group relative h-1.5 flex-1 min-w-[60px] cursor-pointer rounded-full bg-sky-200/70 transition-all duration-300 ease-out hover:h-2"
                  onClick={onProgressClick}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={currentTime}
                  aria-label="Posição do áudio"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[9px] sm:text-xs font-mono text-sky-700/70 whitespace-nowrap flex-shrink-0">
                  {buffering && !duration
                    ? "Preparando…"
                    : `${formatTime(currentTime)}/${formatTime(duration)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Navegação ±15s */}
          <div className="flex items-center justify-center gap-1.5">
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
