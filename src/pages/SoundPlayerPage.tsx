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

  // Estado para controlar popover de volume (mobile)
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);

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

  // Fechar popover de volume ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(event.target as Node)) {
        setShowVolumePopover(false);
      }
    };

    if (showVolumePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [showVolumePopover]);

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
    navigate('/app/sons');
  };

  // Calcular o progresso do círculo
  const progress = (currentTime / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 90; // raio do círculo = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="relative min-h-screen font-primary overflow-x-hidden overflow-y-auto"
      style={{
        overscrollBehaviorX: 'none',
        touchAction: 'pan-y'
      }}
    >
      {/* Background Image Blurred */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          background: soundData.image,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/10 to-black/30"
      />

      {/* Back Button - Top Left */}
      <button
        onClick={handleBack}
        className="fixed top-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
        aria-label="Voltar"
      >
        <ChevronLeft size={24} className="text-gray-800" />
      </button>

      {/* Bell Icon - Top Right */}
      <button
        className="fixed top-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
        aria-label="Notificações"
      >
        <Bell size={20} className="text-gray-800" />
      </button>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20">
        {/* Circular Timer */}
        <div className="mb-8 relative">
          <div
            className="rounded-3xl shadow-2xl p-8 flex items-center justify-center overflow-hidden relative"
            style={{
              background: soundData.image,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              width: '280px',
              height: '280px'
            }}
          >
            {/* Overlay for better contrast */}
            <div className="absolute inset-0 bg-black/20 rounded-3xl" />

            {/* SVG Circle Progress */}
            <svg className="transform -rotate-90 relative z-10" width="200" height="200">
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

        {/* Controls Bar - Responsive */}
        <div className="w-full max-w-4xl px-2 sm:px-6 mt-4">
          {/* Mobile Layout - Premium Clean */}
          <div className="md:hidden relative" ref={volumePopoverRef}>
            {/* Barra Única - Mobile Premium */}
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl px-5 py-4 shadow-xl border border-gray-100/50">
              <div className="flex items-center gap-3">
                {/* Favorite Button - Esquerda */}
                <button
                  onClick={handleFavoriteToggle}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95 touch-manipulation flex-shrink-0"
                >
                  <Heart
                    size={18}
                    className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                    strokeWidth={2}
                  />
                </button>

                {/* Progress Bar - Centro */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-600 flex-shrink-0 tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <input
                        type="range"
                        min="0"
                        max={totalSeconds}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation z-10"
                      />
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-100"
                        style={{ width: `${(currentTime / (totalSeconds || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 flex-shrink-0 tabular-nums">
                      {formatTime(totalSeconds)}
                    </span>
                  </div>
                </div>

                {/* Volume Button - Direita */}
                <button
                  onClick={() => setShowVolumePopover(!showVolumePopover)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95 touch-manipulation flex-shrink-0"
                >
                  <Volume2 size={16} className="text-gray-600" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Volume Popover - Aparece acima */}
            <div className={`absolute bottom-full left-0 right-0 mb-3 transition-all duration-300 ease-out ${
              showVolumePopover
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}>
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl px-5 py-4 shadow-2xl border border-gray-100/50">
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-gray-500 flex-shrink-0" strokeWidth={2} />
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full cursor-pointer touch-manipulation appearance-none bg-transparent"
                      style={{
                        height: '6px',
                      }}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gray-200 rounded-full pointer-events-none">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-150"
                        style={{ width: `${volume}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-700 flex-shrink-0 min-w-[32px] text-right">
                    {Math.round(volume)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Single Row */}
          <div className="hidden md:flex items-center justify-between gap-3 sm:gap-4 bg-white/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
            {/* Time Display */}
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={totalSeconds}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 cursor-pointer h-1"
              style={{
                background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (totalSeconds || 1)) * 100}%, #E5E7EB ${(currentTime / (totalSeconds || 1)) * 100}%, #E5E7EB 100%)`,
                borderRadius: '999px'
              }}
            />

            {/* Time Duration */}
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
              {formatTime(totalSeconds)}
            </span>

            {/* Favorite Button */}
            <button
              onClick={handleFavoriteToggle}
              className="flex items-center justify-center w-8 h-8 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Heart
                size={20}
                className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                strokeWidth={1.5}
              />
            </button>

            {/* Volume Control - Minimalista */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Volume2 size={16} className="text-gray-600" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 sm:w-24 cursor-pointer h-0.5"
                style={{
                  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${volume}%, #E5E7EB ${volume}%, #E5E7EB 100%)`,
                  borderRadius: '999px'
                }}
              />
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

      {/* Estilos para ocultar thumb do input range */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 0;
          height: 0;
        }
        input[type="range"]::-moz-range-thumb {
          width: 0;
          height: 0;
          border: none;
          background: transparent;
        }
        input[type="range"]::-ms-thumb {
          width: 0;
          height: 0;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
