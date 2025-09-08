import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface AudioPlayerOverlayProps {
  /** Data URL (data:audio/mpeg;base64,...) ou blob: (URL.createObjectURL) */
  audioUrl: string;
  onClose: () => void;
}

const AudioPlayerOverlay: React.FC<AudioPlayerOverlayProps> = ({ audioUrl, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio (para leve boost de volume)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // true somente se veio como blob:
  const isBlobUrl = audioUrl.startsWith("blob:");

  useEffect(() => {
    // cria player “fora do DOM”
    const audio = new Audio();
    audioRef.current = audio;

    // ajustes de compatibilidade
    audio.src = audioUrl;
    audio.preload = "auto";
    audio.playsInline = true; // iOS
    audio.autoplay = false;
    audio.muted = false;
    audio.volume = 1;
    // Safari às vezes precisa do load() explícito para data URLs
    try { audio.load(); } catch {}

    // --- Web Audio: boost leve de volume (~+3dB) ---
    try {
      // @ts-ignore - suporte webkit em iOS antigos
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx: AudioContext = new Ctx();
        audioCtxRef.current = ctx;

        const src = ctx.createMediaElementSource(audio);
        sourceRef.current = src;

        const gain = ctx.createGain();
        gainRef.current = gain;
        gain.gain.value = 1.4; // 1.0 = normal | 1.4 ~ +3dB

        src.connect(gain).connect(ctx.destination);

        // retoma o contexto após gesto do usuário (a abertura do overlay)
        ctx.resume().catch(() => {});
      }
    } catch {}

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMeta = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onCanPlay = () => {
      if (!isFinite(audio.duration)) setDuration(audio.duration || 0);
    };
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      console.error("[AUDIO ERROR]", audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // tenta tocar automaticamente (após clique no botão “ouvir”)
    audio.play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        // em alguns navegadores o autoplay ainda é bloqueado
        console.warn("[AUDIO] autoplay bloqueado:", e?.message || e);
        setIsPlaying(false);
      });

    // ESC para fechar
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        try { audio.pause(); } catch {}
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("keydown", onEsc);
      try { audio.pause(); } catch {}

      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);

      // libera objectURL caso tenha sido usado
      if (isBlobUrl) {
        try { URL.revokeObjectURL(audioUrl); } catch {}
      }

      // desmonta grafo de áudio
      try {
        sourceRef.current?.disconnect();
        gainRef.current?.disconnect();
        audioCtxRef.current?.close();
      } catch {}

      sourceRef.current = null;
      gainRef.current = null;
      audioCtxRef.current = null;
      audioRef.current = null;
    };
  }, [audioUrl, isBlobUrl, onClose]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // retoma o contexto se estiver “suspended”
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("[AUDIO] play() falhou:", e?.message || e));
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = duration || audio.duration || 0;
    const next = Math.max(0, Math.min(total, audio.currentTime + seconds));
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Math.max(0, Math.min(duration, duration * ratio));
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const onProgressClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekToRatio(ratio);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const IconBtn = ({
    onClick,
    label,
    children,
  }: {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
      aria-label={label}
      type="button"
    >
      {children}
    </button>
  );

  const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="6" y="4" width="3" height="16" rx="1.5" />
      <rect x="15" y="4" width="3" height="16" rx="1.5" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="black" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );

  const ArrowCircle = ({ direction }: { direction: "left" | "right" }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      {direction === "left" ? <path d="M13 8l-4 4 4 4" /> : <path d="M11 8l4 4-4 4" />}
    </svg>
  );

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className="
        fixed left-1/2 -translate-x-1/2
        top-[calc(env(safe-area-inset-top)+16px)]
        bg-white border border-gray-200 rounded-full shadow-md
        px-4 py-2 flex items-center gap-4 z-50 backdrop-blur-sm
      "
      role="dialog"
      aria-label="Reprodutor de áudio"
    >
      <IconBtn onClick={togglePlay} label={isPlaying ? "Pausar" : "Tocar"}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconBtn>

      <div className="flex items-center gap-3">
        {/* Barra de progresso clicável */}
        <div
          className="relative w-40 h-2 rounded-full bg-gray-200 overflow-hidden cursor-pointer"
          onClick={onProgressClick}
          aria-label="Barra de progresso"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
        >
          <div className="absolute inset-y-0 left-0 bg-gray-800" style={{ width: `${progress}%` }} />
        </div>

        {/* Tempo atual / total */}
        <span className="text-xs font-sans font-light text-black tracking-tight tabular-nums">
          {formatTime(currentTime)}
          {duration ? ` / ${formatTime(duration)}` : ""}
        </span>
      </div>

      <IconBtn onClick={() => seek(-15)} label="Voltar 15 segundos">
        <ArrowCircle direction="left" />
      </IconBtn>

      <IconBtn onClick={() => seek(15)} label="Avançar 15 segundos">
        <ArrowCircle direction="right" />
      </IconBtn>

      <IconBtn
        onClick={() => {
          try { audioRef.current?.pause(); } catch {}
          onClose();
        }}
        label="Fechar"
      >
        <X className="w-5 h-5 stroke-[1.5]" />
      </IconBtn>
    </div>
  );
};

export default AudioPlayerOverlay;
