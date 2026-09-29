import { useState, useRef, useEffect } from 'react';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useNavigate, useLocation } from 'react-router-dom';
import ReinoPlayer from '@/components/reino/ReinoPlayer';

interface SoundData {
  id: string;
  title: string;
  duration: number; // in minutes
  image: string;
  category: string;
  badge: string;
  audioUrl?: string;
}

export default function SoundPlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dados do som passados via navigation state
  const soundData: SoundData = location.state?.sound || {
    id: 'default',
    title: 'Som Relaxante',
    duration: 10,
    image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    category: 'relaxante',
    badge: 'SOM RELAXANTE'
  };

  const selectedDuration = location.state?.selectedDuration || soundData.duration;
  const totalSeconds = selectedDuration * 60;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [volume, setVolume] = useState(20);

  // Sincronizar volume do áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Controlar play/pause do áudio
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.error('Erro ao reproduzir áudio:', err);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Timer para countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && currentTime < totalSeconds) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + 1;
          if (nextTime >= totalSeconds) {
            return totalSeconds;
          }
          return nextTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTime, totalSeconds]);

  // Parar áudio quando o timer chegar ao fim
  useEffect(() => {
    if (currentTime >= totalSeconds && isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [currentTime, totalSeconds, isPlaying]);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkip = (seconds: number) => {
    setCurrentTime(prev => {
      const newTime = prev + seconds;
      if (newTime < 0) return 0;
      if (newTime > totalSeconds) return totalSeconds;
      return newTime;
    });
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate('/app/sons');
  };

  useMediaSession({
    title: soundData.title,
    artist: 'ECO — Sons',
    artwork: soundData.image,
    audioRef,
    isPlaying,
    duration: totalSeconds,
    currentTime,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onSeekBackward: () => handleSkip(-10),
    onSeekForward: () => handleSkip(10),
    onSeekTo: (time) => setCurrentTime(Math.max(0, Math.min(totalSeconds, time))),
  });

  return (
    <div className="reino-corpo" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ReinoPlayer
        titulo={soundData.title}
        duracaoRotulo={`${selectedDuration} min`}
        imagem={soundData.image}
        lugar="SOM.02 · Sons do vale"
        etapa={soundData.badge ? soundData.badge.toLowerCase() : undefined}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalSeconds}
        formatTime={formatTime}
        onBack={handleBack}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        onProgressChange={handleProgressChange}
        isFavorite={isFavorite}
        onFavorite={handleFavoriteToggle}
        volume={volume}
        onVolume={setVolume}
      />

      {soundData.audioUrl && <audio ref={audioRef} src={soundData.audioUrl} loop preload="auto" />}
    </div>
  );
}
