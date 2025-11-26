import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Volume2, Bell } from 'lucide-react';

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate('/sons');
  };

  // Calcular o progresso do círculo
  const progress = (currentTime / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 90; // raio do círculo = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#E8E4F3] to-[#D8D0E8]">
      {/* Back Button - Top Left */}
      <button
        onClick={handleBack}
        className="fixed top-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl transition-all active:scale-95"
        aria-label="Voltar"
      >
        <ChevronLeft size={24} className="text-gray-800" />
      </button>

      {/* Bell Icon - Top Right */}
      <button
        className="fixed top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg hover:shadow-xl transition-all active:scale-95"
        aria-label="Notificações"
      >
        <Bell size={20} className="text-gray-800" />
      </button>

      {/* Main Content - Centered */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
        {/* Circular Timer */}
        <div className="mb-8 relative">
          <div
            className="rounded-3xl shadow-2xl p-8 flex items-center justify-center"
            style={{
              background: soundData.image,
              width: '280px',
              height: '280px'
            }}
          >
            {/* SVG Circle Progress */}
            <svg className="transform -rotate-90" width="200" height="200">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="#4FC3F7"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease'
                }}
              />
              {/* Tick marks */}
              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 6 - 90) * (Math.PI / 180);
                const isMainTick = i % 5 === 0;
                const innerRadius = isMainTick ? 75 : 82;
                const outerRadius = 88;
                const x1 = 100 + innerRadius * Math.cos(angle);
                const y1 = 100 + innerRadius * Math.sin(angle);
                const x2 = 100 + outerRadius * Math.cos(angle);
                const y2 = 100 + outerRadius * Math.sin(angle);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth={isMainTick ? "2" : "1"}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-12 text-3xl font-bold text-[#38322A] text-center">
          {soundData.title}
        </h1>

        {/* Playback Controls */}
        <div className="mb-10 flex items-center gap-8">
          {/* Skip Back 5s */}
          <button
            onClick={() => handleSkip(-5)}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw size={24} className="text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-xs font-bold text-gray-700 leading-none" style={{ marginTop: '2px' }}>
                5
              </span>
            </div>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all active:scale-95"
          >
            {isPlaying ? (
              <Pause size={36} className="text-gray-900" strokeWidth={2} />
            ) : (
              <Play size={36} className="text-gray-900 ml-1" strokeWidth={2} fill="currentColor" />
            )}
          </button>

          {/* Skip Forward 5s */}
          <button
            onClick={() => handleSkip(5)}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw size={24} className="text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-xs font-bold text-gray-700 leading-none" style={{ marginTop: '2px' }}>
                5
              </span>
            </div>
          </button>
        </div>

        {/* Progress Bar and Controls */}
        <div className="w-full max-w-2xl px-8 space-y-6">
          {/* Time Progress Bar */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#38322A] w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={totalSeconds}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 cursor-pointer h-1.5"
              style={{
                background: `linear-gradient(to right, #6B5DD3 0%, #6B5DD3 ${progress}%, #D1D5DB ${progress}%, #D1D5DB 100%)`,
                borderRadius: '999px'
              }}
            />
            <span className="text-sm font-medium text-[#38322A] w-12">
              {formatTime(totalSeconds)}
            </span>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-center gap-6">
            {/* Favorite Button */}
            <button
              onClick={handleFavoriteToggle}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Heart
                size={20}
                className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                strokeWidth={1.5}
              />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-md">
              <Volume2 size={20} className="text-gray-700 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-32 cursor-pointer h-1.5"
                style={{
                  background: `linear-gradient(to right, #6B5DD3 0%, #6B5DD3 ${volume}%, #D1D5DB ${volume}%, #D1D5DB 100%)`,
                  borderRadius: '999px'
                }}
              />
              <span className="text-sm font-medium text-gray-700 w-10">
                %{volume}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element with Loop */}
      {soundData.audioUrl && (
        <audio
          ref={audioRef}
          src={soundData.audioUrl}
          loop
          preload="auto"
        />
      )}
    </div>
  );
}
