import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface AudioPlayerOverlayProps {
  // pode ser: data URL (data:audio/mpeg;base64,...) OU objectURL (URL.createObjectURL)
  audioUrl: string;
  onClose: () => void;
}

const AudioPlayerOverlay: React.FC<AudioPlayerOverlayProps> = ({ audioUrl, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // cria uma instância nova a cada audioUrl
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = audioUrl;
    audio.preload = "auto";

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      console.error("[AUDIO ERROR] falha ao carregar/tocar o áudio:", audio.error);
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // tenta tocar automaticamente (já que o overlay normalmente abre por gesto do usuário)
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((e) => {
      console.warn("[AUDIO] autoplay bloqueado:", e?.message || e);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, [audioUrl]);

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
    audio.currentTime = Math.max(0, audio.currentTime + seconds);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const IconWrapper = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
      aria-label="audio-control"
    >
      {children}
    </button>
  );

  const PauseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round">
      <rect x="6" y="4" width="3" height="16" rx="1.5" />
      <rect x="15" y="4" width="3" height="16" rx="1.5" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="black" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );

  const ArrowCircle = ({ direction }: { direction: "left" | "right" }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      {direction === "left" ? <path d="M13 8l-4 4 4 4" /> : <path d="M11 8l4 4-4 4" />}
    </svg>
  );

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-full shadow-md px-4 py-2 flex items-center gap-4 z-50 backdrop-blur-sm">
      <IconWrapper onClick={togglePlay}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </IconWrapper>

      <span className="text-sm font-sans font-light text-black w-12 text-center tracking-tight">
        {formatTime(currentTime)}
      </span>

      <IconWrapper onClick={() => seek(-15)}>
        <ArrowCircle direction="left" />
      </IconWrapper>

      <IconWrapper onClick={() => seek(15)}>
        <ArrowCircle direction="right" />
      </IconWrapper>

      <IconWrapper onClick={onClose}>
        <X className="w-5 h-5 stroke-[1.5]" />
      </IconWrapper>
    </div>
  );
};

export default AudioPlayerOverlay;
