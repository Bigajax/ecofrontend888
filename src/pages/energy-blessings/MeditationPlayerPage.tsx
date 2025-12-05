import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Music, Volume2 } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
import { type Sound, getAllSounds } from '@/data/sounds';

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
  const [showFavoriteToast, setShowFavoriteToast] = useState(false);

  // Estados para sons de fundo
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [selectedBackgroundSound, setSelectedBackgroundSound] = useState<Sound | null>(() => {
    // Definir 432Hz como som padrão
    const allSounds = getAllSounds();
    return allSounds.find(sound => sound.id === 'freq_1') || null;
  });
  const [backgroundVolume, setBackgroundVolume] = useState(5); // Volume bem baixo para som de fundo (5%)
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Web Audio API para controle avançado de volume
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundGainNodeRef = useRef<GainNode | null>(null);
  const backgroundSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Estado para volume da meditação
  const [meditationVolume, setMeditationVolume] = useState(100);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Sincronizar som de fundo com o estado de reprodução
  useEffect(() => {
    if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
      // Só tocar se a meditação estiver tocando
      if (isPlaying) {
        backgroundAudioRef.current.play().catch(err => {
          console.error('Erro ao reproduzir som de fundo:', err);
        });
      } else {
        backgroundAudioRef.current.pause();
      }
    }
  }, [selectedBackgroundSound, isPlaying]);

  // Inicializar Web Audio API para som de fundo
  useEffect(() => {
    if (backgroundAudioRef.current && !audioContextRef.current) {
      // Criar AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Criar nó de ganho (volume)
      backgroundGainNodeRef.current = audioContextRef.current.createGain();

      // Criar source a partir do elemento de áudio
      backgroundSourceNodeRef.current = audioContextRef.current.createMediaElementSource(backgroundAudioRef.current);

      // Conectar: source -> gain -> destination (speakers)
      backgroundSourceNodeRef.current.connect(backgroundGainNodeRef.current);
      backgroundGainNodeRef.current.connect(audioContextRef.current.destination);

      // Definir volume inicial muito baixo (0.03 = 3%)
      backgroundGainNodeRef.current.gain.value = 0.03;
    }
  }, []);

  // Controlar volume do áudio de fundo usando Web Audio API
  useEffect(() => {
    if (backgroundGainNodeRef.current) {
      // Converter porcentagem para valor Web Audio (0.0 a 1.0)
      // Aplicar uma curva logarítmica para melhor percepção de volume
      const normalizedVolume = backgroundVolume / 100;
      const logarithmicVolume = Math.pow(normalizedVolume, 2) * 0.5; // Máximo 0.5 (50%)
      backgroundGainNodeRef.current.gain.value = logarithmicVolume;
    }
  }, [backgroundVolume]);

  // Controlar volume do áudio da meditação
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = meditationVolume / 100;
    }
  }, [meditationVolume]);

  const handleFavoriteToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    // Mostrar toast de confirmação
    if (newFavoriteState) {
      setShowFavoriteToast(true);
      // Auto-hide após 3 segundos
      setTimeout(() => {
        setShowFavoriteToast(false);
      }, 3000);
    }
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
    const updateDuration = () => {
      setDuration(audio.duration);
      // Inicializar volume quando metadata carregar
      audio.volume = meditationVolume / 100;
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [meditationVolume]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        // Pausar também o som de fundo
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.pause();
        }
      } else {
        audioRef.current.play();
        // Iniciar automaticamente o som de fundo quando play for clicado
        if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
          backgroundAudioRef.current.play().catch(err => {
            console.error('Erro ao reproduzir som de fundo:', err);
          });
        }
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
    const returnTo = location.state?.returnTo || '/app';
    navigate(returnTo, { state: { returnFromMeditation: true } });
  };

  return (
    <div className="relative min-h-screen font-primary">
      {/* Background Image Blurred */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${meditationData.imageUrl})`,
          filter: 'blur(40px)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: meditationData.gradient
            ? `${meditationData.gradient.replace('linear-gradient', 'linear-gradient').replace(')', ', 0.85)')}`
            : 'linear-gradient(to bottom right, rgba(255,140,66,0.85) 0%, rgba(247,147,30,0.85) 20%, rgba(216,97,122,0.85) 40%, rgba(139,58,98,0.85) 60%, rgba(107,44,92,0.85) 80%, rgba(45,27,61,0.85) 100%)'
        }}
      />

      {/* HomeHeader */}
      <div className="relative z-10">
        <HomeHeader />
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-start px-4 sm:px-8 pt-24 pb-8">
        {/* Back Button - Inline no topo (mobile) */}
        <div className="w-full max-w-4xl mb-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
            aria-label="Voltar"
          >
            <ChevronLeft size={22} className="text-gray-800" />
          </button>
        </div>
        {/* Meditation Image Card */}
        <div className="mb-6 overflow-hidden rounded-3xl shadow-2xl">
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-40 w-40 sm:h-48 sm:w-48 object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
        </div>

        {/* Title */}
        <h1 className="mb-6 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center px-4 drop-shadow-sm">
          {meditationData.title}
        </h1>

        {/* Playback Controls - Reduzidos */}
        <div className="mb-6 flex items-center gap-4">
          {/* Skip Back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            <div className="relative flex items-center justify-center">
              <RotateCcw size={18} className="text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-[10px] font-bold text-gray-700 leading-none" style={{ marginTop: '1px' }}>
                15
              </span>
            </div>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-xl md:hover:shadow-2xl transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            {isPlaying ? (
              <Pause size={28} className="text-gray-900" strokeWidth={2} />
            ) : (
              <Play size={28} className="text-gray-900 ml-0.5" strokeWidth={2} fill="currentColor" />
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation border border-gray-200/50"
          >
            <div className="relative flex items-center justify-center">
              <RotateCw size={18} className="text-gray-700" strokeWidth={1.5} />
              <span className="absolute text-[10px] font-bold text-gray-700 leading-none" style={{ marginTop: '1px' }}>
                15
              </span>
            </div>
          </button>
        </div>

        {/* Controls Bar - Responsive */}
        <div className="w-full max-w-4xl px-2 sm:px-6 mt-4">
          {/* Mobile Layout - Stacked */}
          <div className="md:hidden flex flex-col gap-3">
            {/* Barra Principal - Mobile */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-4 py-3 shadow-lg">
              {/* Background Sound Selector */}
              <button
                onClick={handleOpenBackgroundModal}
                className="flex items-center gap-2 min-w-0 flex-shrink hover:opacity-80 transition-opacity"
              >
                <Music size={16} className="text-gray-700 flex-shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[9px] font-medium text-gray-500 uppercase leading-tight">Sons de Fundo</span>
                  <span className="text-[11px] font-semibold text-gray-900 leading-tight truncate max-w-[80px]">
                    {selectedBackgroundSound?.title || 'Nenhum'}
                  </span>
                </div>
              </button>

              {/* Time Display */}
              <span className="text-[11px] font-medium text-gray-700 flex-shrink-0">
                {formatTime(currentTime)}
              </span>

              {/* Progress Bar */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="flex-1 cursor-pointer min-w-0 touch-manipulation"
                style={{
                  height: '6px',
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`,
                  borderRadius: '999px'
                }}
              />

              {/* Time Duration */}
              <span className="text-[11px] font-medium text-gray-700 flex-shrink-0">
                {formatTime(duration)}
              </span>

              {/* Favorite Button */}
              <button
                onClick={handleFavoriteToggle}
                className="flex items-center justify-center w-7 h-7 flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                <Heart
                  size={18}
                  className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                  strokeWidth={1.5}
                />
              </button>

              {/* Volume Icon - Opens volume control */}
              <button
                className="flex items-center justify-center w-7 h-7 flex-shrink-0 hover:opacity-80 transition-opacity"
                onClick={() => {/* Toggle volume panel */}}
              >
                <Volume2 size={16} className="text-gray-700" />
              </button>
            </div>

            {/* Volume Control - Separate bar on mobile - Minimalista e Compacto */}
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
              <Volume2 size={12} className="text-gray-500 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={meditationVolume}
                onChange={(e) => setMeditationVolume(parseFloat(e.target.value))}
                className="flex-1 cursor-pointer touch-manipulation"
                style={{
                  height: '3px',
                  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${meditationVolume}%, #E5E7EB ${meditationVolume}%, #E5E7EB 100%)`,
                  borderRadius: '999px'
                }}
              />
            </div>
          </div>

          {/* Desktop Layout - Single Row */}
          <div className="hidden md:flex items-center justify-between gap-3 sm:gap-4 bg-white/90 backdrop-blur-md rounded-full px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
            {/* Background Sound Selector */}
            <button
              onClick={handleOpenBackgroundModal}
              className="flex items-center gap-2 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Music size={18} className="text-gray-700 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium text-gray-500 uppercase leading-tight">Sons de Fundo</span>
                <span className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[100px]">
                  {selectedBackgroundSound?.title || 'Nenhum'}
                </span>
              </div>
            </button>

            {/* Time Display */}
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 cursor-pointer h-1"
              style={{
                background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`,
                borderRadius: '999px'
              }}
            />

            {/* Time Duration */}
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">
              {formatTime(duration)}
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
                value={meditationVolume}
                onChange={(e) => setMeditationVolume(parseFloat(e.target.value))}
                className="w-20 sm:w-24 cursor-pointer h-0.5"
                style={{
                  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${meditationVolume}%, #E5E7EB ${meditationVolume}%, #E5E7EB 100%)`,
                  borderRadius: '999px'
                }}
              />
            </div>
          </div>
        </div>
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

      {/* Toast de Confirmação de Favorito */}
      {showFavoriteToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 border border-gray-200/50">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
              <Heart size={20} className="text-red-500 fill-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                Adicionado aos favoritos!
              </span>
              <span className="text-xs text-gray-500">
                {meditationData.title}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
