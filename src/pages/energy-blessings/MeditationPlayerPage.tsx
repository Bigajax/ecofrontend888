import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Music } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
import { type Sound } from '@/data/sounds';

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
  const [isFavorite, setIsFavorite] = useState(false);

  // Estados para sons de fundo
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [selectedBackgroundSound, setSelectedBackgroundSound] = useState<Sound | null>(null);
  const [backgroundVolume, setBackgroundVolume] = useState(40);
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Controlar reprodução do áudio de fundo
  useEffect(() => {
    if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
      backgroundAudioRef.current.play().catch(err => {
        console.error('Erro ao reproduzir som de fundo:', err);
      });
    }
  }, [selectedBackgroundSound]);

  // Controlar volume do áudio de fundo
  useEffect(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = backgroundVolume / 100;
    }
  }, [backgroundVolume]);

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
  };

  const handleOpenBackgroundModal = () => {
    setIsBackgroundModalOpen(true);
  };

  const handleCloseBackgroundModal = () => {
    setIsBackgroundModalOpen(false);
  };

  const handleSelectBackgroundSound = (sound: Sound) => {
    setSelectedBackgroundSound(sound);
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
    <div
      className="relative min-h-screen font-primary"
      style={{ background: meditationData.gradient || 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)' }}
    >
      {/* HomeHeader */}
      <HomeHeader />

      {/* Back Button - Fixed Position */}
      <button
        onClick={handleBack}
        className="fixed top-24 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg md:hover:shadow-xl transition-all active:scale-95 touch-manipulation"
        aria-label="Voltar"
      >
        <ChevronLeft size={24} className="text-gray-800" />
      </button>

      {/* Main Content - Centered */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-8 py-20 pb-32">
        {/* Meditation Image Card */}
        <div className="mb-8 sm:mb-10 overflow-hidden rounded-3xl shadow-2xl">
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
        </div>

        {/* Title */}
        <h1 className="mb-12 sm:mb-16 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center px-4 drop-shadow-sm">
          {meditationData.title}
        </h1>

        {/* Playback Controls */}
        <div className="mb-8 sm:mb-10 flex items-center gap-6 sm:gap-8">
          {/* Skip Back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg md:hover:shadow-xl transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw size={24} className="sm:w-7 sm:h-7 text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-xs sm:text-sm font-bold text-gray-700 leading-none" style={{ marginTop: '2px' }}>
                15
              </span>
            </div>
          </button>

          {/* Play/Pause Button - Larger */}
          <button
            onClick={handlePlayPause}
            className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-2xl md:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            {isPlaying ? (
              <Pause size={36} className="sm:w-10 sm:h-10 text-gray-900" strokeWidth={2} />
            ) : (
              <Play size={36} className="sm:w-10 sm:h-10 text-gray-900 ml-1" strokeWidth={2} fill="currentColor" />
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg md:hover:shadow-xl transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw size={24} className="sm:w-7 sm:h-7 text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-xs sm:text-sm font-bold text-gray-700 leading-none" style={{ marginTop: '2px' }}>
                15
              </span>
            </div>
          </button>
        </div>

        {/* Progress Bar - Integrated */}
        <div className="w-full max-w-2xl px-4 sm:px-8">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full cursor-pointer h-1.5 mb-2"
            style={{
              background: `linear-gradient(to right, #374151 0%, #374151 ${(currentTime / (duration || 1)) * 100}%, #D1D5DB ${(currentTime / (duration || 1)) * 100}%, #D1D5DB 100%)`,
              borderRadius: '999px'
            }}
          />
          <div className="flex justify-between items-center text-sm sm:text-base font-medium text-white drop-shadow-md">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Fixed Controls */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 sm:px-6 flex items-end justify-between">
        {/* Background Music Info - Bottom Left */}
        <button
          onClick={handleOpenBackgroundModal}
          className="flex items-center gap-2.5 sm:gap-3 rounded-full bg-white/95 backdrop-blur-md shadow-xl px-4 py-3 sm:px-5 sm:py-3.5 border border-gray-200/50 md:hover:shadow-2xl transition-all active:scale-95 touch-manipulation"
        >
          <Music size={18} className="sm:w-5 sm:h-5 text-gray-700 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase leading-tight">Sons de Fundo</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
              {selectedBackgroundSound?.title || meditationData.backgroundMusic || 'Cristais'}
            </span>
          </div>
        </button>

        {/* Favorite Button - Bottom Right */}
        <button
          onClick={handleFavoriteToggle}
          className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-xl md:hover:shadow-2xl transition-all active:scale-95 touch-manipulation border border-gray-200/50"
        >
          <Heart
            size={24}
            className={`sm:w-7 sm:h-7 transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={meditationData.audioUrl} />

      {/* Background Sound Audio Element */}
      {selectedBackgroundSound?.audioUrl && (
        <audio
          ref={backgroundAudioRef}
          src={selectedBackgroundSound.audioUrl}
          loop
          preload="auto"
        />
      )}

      {/* Background Sounds Modal */}
      <BackgroundSoundsModal
        isOpen={isBackgroundModalOpen}
        onClose={handleCloseBackgroundModal}
        selectedSoundId={selectedBackgroundSound?.id}
        onSelectSound={handleSelectBackgroundSound}
        backgroundVolume={backgroundVolume}
        onVolumeChange={setBackgroundVolume}
      />
    </div>
  );
}
