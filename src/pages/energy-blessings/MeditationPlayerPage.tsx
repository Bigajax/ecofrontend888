import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Volume2, Music } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';

interface MeditationData {
  title: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  backgroundMusic?: string;
  gradient?: string;
}

export default function MeditationPlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dados da meditação passados via navigation state
  const meditationData: MeditationData = location.state?.meditation || {
    title: 'Bênçãos dos Centros de Energia',
    duration: '07:42',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    imageUrl: '/images/energy-blessings.webp',
    backgroundMusic: 'Cristais',
    gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)'
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(20);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Esconder toast após 3 segundos
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    setShowToast(true);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate('/app', { state: { returnFromMeditation: true } });
  };

  return (
    <div className="min-h-screen font-primary" style={{ background: meditationData.gradient || 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)' }}>
      {/* HomeHeader */}
      <HomeHeader />

      {/* Back Button - Fixed Position */}
      <button
        onClick={handleBack}
        className="fixed top-20 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg md:hover:shadow-xl transition-all active:scale-95 touch-manipulation"
        aria-label="Voltar"
      >
        <ChevronLeft size={24} className="text-gray-800" />
      </button>

      {/* Main Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-8 py-16 sm:py-20 pb-32 sm:pb-36">
        {/* Meditation Image */}
        <div className="mb-6 sm:mb-8 overflow-hidden rounded-3xl shadow-2xl">
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
        </div>

        {/* Title */}
        <h1 className="mb-8 sm:mb-12 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 text-center px-4">
          {meditationData.title}
        </h1>

        {/* Playback Controls */}
        <div className="mb-10 sm:mb-16 flex items-center gap-4 sm:gap-6">
          {/* Skip Back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw size={20} className="sm:w-6 sm:h-6 text-gray-700" />
              <span className="absolute text-[10px] sm:text-xs font-bold text-gray-700 leading-none" style={{ marginTop: '1px' }}>
                15
              </span>
            </div>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gray-300 shadow-lg md:hover:shadow-xl transition-all active:scale-95 touch-manipulation"
          >
            {isPlaying ? (
              <Pause size={28} className="sm:w-8 sm:h-8 text-gray-800 fill-gray-800" />
            ) : (
              <Play size={28} className="sm:w-8 sm:h-8 text-gray-800 fill-gray-800 ml-1" />
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw size={20} className="sm:w-6 sm:h-6 text-gray-700" />
              <span className="absolute text-[10px] sm:text-xs font-bold text-gray-700 leading-none" style={{ marginTop: '1px' }}>
                15
              </span>
            </div>
          </button>
        </div>

        {/* Bottom Controls - Fixed */}
        <div className="fixed bottom-0 left-0 right-0 w-full z-50">
          <div className="w-full bg-white/95 backdrop-blur-md shadow-2xl">
            {/* Mobile Layout - 2 Rows */}
            <div className="md:hidden">
              {/* First Row - Progress Bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-medium text-gray-700 flex-shrink-0 min-w-[38px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="flex-1 cursor-pointer min-w-0 h-2"
                  style={{
                    background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <span className="text-xs font-medium text-gray-700 flex-shrink-0 min-w-[38px] text-right">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Second Row - Controls */}
              <div className="flex items-center justify-between px-4 py-2.5">
                {/* Background Music Info */}
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 flex-shrink-0 min-w-0">
                  <Music size={14} className="text-gray-600 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-medium text-gray-500 uppercase leading-tight">Sons de Fundo</span>
                    <span className="text-[11px] font-medium text-gray-800 leading-tight truncate">
                      {meditationData.backgroundMusic || 'Cristais'}
                    </span>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-3">
                  {/* Favorite Button */}
                  <button
                    onClick={handleFavoriteToggle}
                    className="flex h-9 w-9 items-center justify-center rounded-full active:bg-gray-100 transition-colors touch-manipulation flex-shrink-0"
                  >
                    <Heart
                      size={20}
                      className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                    />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Volume2 size={18} className="text-gray-600" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className="w-20 cursor-pointer h-2"
                    />
                    <span className="text-xs font-medium text-gray-700 w-10 text-right">
                      {volume}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout - Single Row */}
            <div className="hidden md:block">
              <div className="max-w-6xl mx-auto flex items-center gap-3 px-8 py-2.5">
                {/* Background Music Info */}
                <div className="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2 flex-shrink-0">
                  <Music size={18} className="text-gray-600" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-500 uppercase leading-tight">Sons de Fundo</span>
                    <span className="text-sm font-medium text-gray-800 leading-tight">
                      {meditationData.backgroundMusic || 'Cristais'}
                    </span>
                  </div>
                </div>

                {/* Time Display */}
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                  {formatTime(currentTime)}
                </span>

                {/* Progress Bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="flex-1 cursor-pointer min-w-0"
                  style={{
                    background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`
                  }}
                />

                {/* Duration */}
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                  {formatTime(duration)}
                </span>

                {/* Favorite Button */}
                <button
                  onClick={handleFavoriteToggle}
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 transition-colors touch-manipulation flex-shrink-0"
                >
                  <Heart
                    size={20}
                    className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  />
                </button>

                {/* Volume Control */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Volume2 size={20} className="text-gray-600" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-24 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12">
                    {volume}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={meditationData.audioUrl} />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-full shadow-2xl px-6 py-3 flex items-center gap-3 border border-gray-200">
            <Heart size={18} className="fill-red-500 text-red-500" />
            <span className="text-sm font-medium text-gray-900">
              {isFavorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
