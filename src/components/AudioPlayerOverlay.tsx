import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface AudioPlayerOverlayProps {
  /** data URL (data:audio/mpeg;base64,...) ou blob: (URL.createObjectURL) */
  audioUrl: string;
  onClose: () => void;
}

const AudioPlayerOverlay: React.FC<AudioPlayerOverlayProps> = ({ audioUrl, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isBlobUrl = audioUrl.startsWith("blob:");

  useEffect(() => {
    // cria uma instância nova a cada audioUrl
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = audioUrl;
    audio.preload = "auto";
    audio.playsInline = true;     // iOS não entra em fullscreen
    audio.autoplay = false;       // vamos chamar play() manualmente
    audio.muted = false;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMeta = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      console.error("[AUDIO ERROR]", audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // tenta tocar automaticamente (aberto após gesto do usuário)
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((e) => {
      console.warn("[AUDIO] autoplay bloqueado:", e?.message || e);
      setIsPlaying(false);
    });

    return () => {
      try { audio.pause(); } catch {}
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      // evita vazamento quando usar objectURL
      if (isBlobUrl) {
        try { URL.revokeObjectURL(audioUrl); } catch {}
      }
      audioRef.current = null;
    };
  }, [audioUrl, isBlobUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn("[AUDIO] play() falhou:", e?.message || e);
      });
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Math.min((duration || audio.duration || 0), audio.currentTime + seconds));
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

  const IconBtn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
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
          <div
            className="absolute inset-y-0 left-0 bg-gray-800"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Tempo atual / total */}
        <span className="text-xs font-sans font-light text-black tracking-tight tabular-nums">
          {formatTime(currentTime)}{duration ? ` / ${formatTime(duration)}` : ""}
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
