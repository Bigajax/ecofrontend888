import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface AudioPlayerOverlayProps {
  audio: HTMLAudioElement;
  onClose: () => void;
  onProgress?: (info: { ratio: number; currentTime: number; duration: number }) => void;
  requiresManualStart?: boolean;
}

/**
 * Player de voz da Eco — estética "céu calmo que respira".
 * Card de vidro azul-bebê flutuante, waveform espelhada animada (AnalyserNode + canvas),
 * play com halo suave, estados preparando → tocando → pausado.
 */
const AudioPlayerOverlay: React.FC<AudioPlayerOverlayProps> = ({
  audio,
  onClose,
  onProgress,
  requiresManualStart = false,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(audio);
  const progressRef = useRef<AudioPlayerOverlayProps["onProgress"]>(onProgress);
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
  // entrada suave do card
  const [shown, setShown] = useState(false);

  // Slot no rodapé do Chat (acima do ChatInput). Se existir, o player renderiza lá via
  // portal, em vez de flutuar fixo no topo sobrepondo as mensagens.
  const [audioSlot, setAudioSlot] = useState<HTMLElement | null>(
    () => (typeof document !== 'undefined' ? document.getElementById('eco-chat-audio-slot') : null),
  );

  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setAudioSlot(document.getElementById('eco-chat-audio-slot'));
  }, []);

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

  // Waveform espelhada e "respirando" (baby-blue). Reage ao AnalyserNode quando tocando;
  // onda senoidal suave quando preparando/pausado.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    // resolução interna nítida (DPR)
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const cssW = canvas.clientWidth || 320;
    const cssH = canvas.clientHeight || 44;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }

    const BARS = 40;
    let t = 0;
    const smooth: number[] = new Array(BARS).fill(0.08);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;
      ctx2d.clearRect(0, 0, w, h);

      // Onda auto-animada (sem WebAudio, pra não interferir na reprodução do áudio):
      // viva quando tocando, calma quando preparando/pausado.
      const targets: number[] = [];
      const speed = isPlaying ? 0.1 : buffering ? 0.055 : 0.015; // calmo
      const baseAmp = isPlaying ? 0.34 : buffering ? 0.22 : 0.08; // ondas maiores
      const swing = isPlaying ? 0.58 : buffering ? 0.3 : 0.05;
      t += speed;
      for (let i = 0; i < BARS; i++) {
        // envelope central (pontas mais baixas) + duas senoides defasadas = movimento orgânico
        const env = Math.sin((i / (BARS - 1)) * Math.PI);
        const wave =
          Math.abs(Math.sin(t + i * 0.5)) * 0.7 + Math.abs(Math.sin(t * 1.3 + i * 0.23)) * 0.3;
        targets.push(baseAmp + wave * swing * (0.45 + 0.55 * env));
      }

      const gap = (w / BARS) * 0.42;
      const barW = w / BARS - gap;

      const grad = ctx2d.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(224,242,254,0.85)"); // sky-100 (mais claro/baby)
      grad.addColorStop(0.5, "rgba(186,230,253,0.95)"); // sky-200
      grad.addColorStop(1, "rgba(125,211,252,0.95)"); // sky-300
      ctx2d.fillStyle = grad;

      for (let i = 0; i < BARS; i++) {
        // suavização temporal
        smooth[i] += (targets[i] - smooth[i]) * 0.35;
        const amp = Math.max(0.04, Math.min(1, smooth[i]));
        const barH = amp * (h * 0.96); // ondas maiores
        const x = i * (w / BARS) + gap / 2;
        const y = mid - barH / 2;
        const r = Math.min(barW / 2, barH / 2, 6 * dpr);
        ctx2d.beginPath();
        const anyCtx = ctx2d as unknown as {
          roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
        };
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
  }, [isPlaying]);

  const handleManualStart = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el
      .play()
      .then(() => {
        setManualStartNeeded(false);
        setIsPlaying(true);
      })
      .catch(() => {
        setManualStartNeeded(true);
      });
  }, []);

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

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const showSpinner = buffering && !manualStartNeeded;

  const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6.5" y="5" width="3.4" height="14" rx="1.5" />
      <rect x="14.1" y="5" width="3.4" height="14" rx="1.5" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.2v13.6a1 1 0 0 0 1.52.85l11-6.8a1 1 0 0 0 0-1.7l-11-6.8A1 1 0 0 0 8 5.2z" />
    </svg>
  );

  const SkipIcon = ({ dir }: { dir: "back" | "fwd" }) => (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={dir === "fwd" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M11 4 4 9l7 5V4z" fill="currentColor" stroke="none" />
      <path d="M4 9a8 8 0 1 1-1.5 6" />
    </svg>
  );

  const SkipBtn = ({
    onClick,
    label,
    dir,
    disabled,
  }: {
    onClick: () => void;
    label: string;
    dir: "back" | "fwd";
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="group relative inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-slate-400 transition-all duration-300 ease-out hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <SkipIcon dir={dir} />
      <span className="text-[10px] font-semibold tabular-nums">15</span>
    </button>
  );

  const card = (
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Reprodutor de voz da Eco"
        className={[
          "pointer-events-auto relative w-full overflow-hidden",
          "rounded-[20px] border border-sky-100",
          "bg-white/95 backdrop-blur-xl",
          "shadow-[0_8px_24px_-14px_rgba(56,189,248,0.28),0_2px_6px_-4px_rgba(15,23,42,0.06)]",
          "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
          "focus:outline-none",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={handleClose}
          className="group absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all duration-300 ease-out hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-200"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" strokeWidth={2} />
          <span className="sr-only">Fechar</span>
        </button>

        <div className="relative flex flex-col gap-2.5 px-3.5 py-3 sm:px-4">
          {/* linha principal: play + waveform */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={manualStartNeeded ? handleManualStart : togglePlay}
              aria-label={manualStartNeeded ? "Tocar" : isPlaying ? "Pausar" : "Tocar"}
              className="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-400 text-white shadow-[0_4px_12px_-5px_rgba(56,189,248,0.5)] transition-all duration-300 ease-out hover:bg-sky-500 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2 focus:ring-offset-white active:translate-y-0 active:scale-95"
            >
              {showSpinner && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-white/50 border-t-white animate-spin"
                />
              )}
              <span className="relative translate-x-[1px]">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </span>
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <canvas
                ref={canvasRef}
                className="h-11 w-full"
                aria-hidden
              />
              <div className="flex items-center gap-2.5">
                <div
                  className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-sky-100 transition-all duration-200 ease-out hover:h-2"
                  onClick={onProgressClick}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={duration || 0}
                  aria-valuenow={currentTime}
                  aria-label="Posição do áudio"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-300 transition-[width] duration-100"
                    style={{ width: `${progress}%` }}
                  />
                  {duration > 0 && (
                    <span
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2px_rgba(125,211,252,0.85)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ left: `${progress}%` }}
                    />
                  )}
                </div>
                <span className="min-w-[72px] text-right text-[10px] font-medium tabular-nums text-slate-400">
                  {!duration || !Number.isFinite(duration)
                    ? "preparando…"
                    : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                </span>
              </div>
            </div>
          </div>

          {/* navegação ±15s */}
          <div className="flex items-center justify-center gap-2">
            <SkipBtn
              dir="back"
              onClick={() => seek(-15)}
              label="Voltar 15 segundos"
              disabled={manualStartNeeded || (!duration && !isPlaying)}
            />
            <span className="h-3.5 w-px bg-slate-200" aria-hidden />
            <SkipBtn
              dir="fwd"
              onClick={() => seek(15)}
              label="Avançar 15 segundos"
              disabled={manualStartNeeded || (!duration && !isPlaying)}
            />
          </div>
        </div>
      </div>
  );

  if (audioSlot) return createPortal(<div className="pb-2">{card}</div>, audioSlot);

  // Fallback: sem o slot do Chat (outro contexto), mantém o card flutuante no topo.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[80] flex justify-center px-3 sm:px-4">
      {card}
    </div>
  );
};

export default AudioPlayerOverlay;
