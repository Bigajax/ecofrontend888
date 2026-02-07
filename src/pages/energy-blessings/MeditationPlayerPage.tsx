import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, RotateCcw, RotateCw, Heart, Music, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
import MeditationCompletion from '@/components/meditation/MeditationCompletion';
import { type Sound, getAllSounds } from '@/data/sounds';
import { useMeditationAnalytics } from '@/hooks/useMeditationAnalytics';
import { parseDurationToSeconds, getCategoryFromPath, trackMeditationEvent } from '@/analytics/meditation';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import MeditationGuestGate from '@/components/meditation/MeditationGuestGate';

interface MeditationData {
  id?: string;
  title: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  backgroundMusic?: string;
  gradient?: string;
  category?: string;
  isPremium?: boolean;
}

// Animation variants for smooth entry
const fadeSlideUp = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for smooth feel
    }
  }
};

export default function MeditationPlayerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuestMode } = useAuth();
  const { trackInteraction } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Dados da meditação passados via navigation state
  const meditationData: MeditationData = location.state?.meditation || {
    id: 'fallback_1',
    title: 'Bênçãos dos Centros de Energia',
    duration: '07:42',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    imageUrl: '/images/energy-blessings.webp',
    backgroundMusic: 'Cristais',
    gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    category: 'fallback',
    isPremium: false,
  };

  // Inferir categoria do returnTo se não fornecido
  const returnTo = location.state?.returnTo || '/app';
  const category = meditationData.category || getCategoryFromPath(returnTo);

  //Initialize analytics
  const analytics = useMeditationAnalytics({
    meditationId: meditationData.id || 'unknown',
    meditationTitle: meditationData.title,
    category,
    durationSeconds: parseDurationToSeconds(meditationData.duration),
    isPremium: meditationData.isPremium || false,
  });

  // Track if this is the first play (to differentiate Started from Resumed)
  const hasPlayedOnce = useRef(false);

  // Track if Completed event was already sent (prevent multiple sends)
  const hasCompletedEventSent = useRef(false);

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
  const [backgroundVolume, setBackgroundVolume] = useState(67); // Volume padrão para som de fundo (67%)
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Web Audio API para controle avançado de volume
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundGainNodeRef = useRef<GainNode | null>(null);
  const backgroundSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Estado para volume da meditação
  const [meditationVolume, setMeditationVolume] = useState(100);

  // Estado para controlar popover de volume (mobile)
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para tela de conclusão
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  // NOVO: Guest mode state
  const isGuest = isGuestMode && !user;
  const GUEST_TIME_LIMIT_SECONDS = 120; // 2 minutos
  const [showGuestGate, setShowGuestGate] = useState(false);
  const [isAudioFading, setIsAudioFading] = useState(false);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Track Abandoned on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        analytics.trackAbandoned(audioRef.current.currentTime, 'navigation');
      }

      // Cleanup fade interval
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Definir volume inicial (67% → ~5.4% do volume real)
      backgroundGainNodeRef.current.gain.value = 0.67 * 0.08;
    }
  }, []);

  // Controlar volume do áudio de fundo usando Web Audio API
  useEffect(() => {
    if (backgroundGainNodeRef.current) {
      // Converter porcentagem para valor Web Audio (0.0 a 1.0)
      // Sons de fundo muito suaves para não tampar a meditação (máximo 8%)
      const normalizedVolume = backgroundVolume / 100;
      const softVolume = normalizedVolume * 0.08; // Máximo 8% (0.08) do volume real
      backgroundGainNodeRef.current.gain.value = softVolume;
    }

    // Track background volume change (with debounce handled by analytics hook)
    if (previousBackgroundVolumeRef.current !== backgroundVolume) {
      analytics.trackBackgroundVolumeChanged(
        previousBackgroundVolumeRef.current,
        backgroundVolume,
        selectedBackgroundSound?.id || 'none'
      );
      previousBackgroundVolumeRef.current = backgroundVolume;
    }

    // Se volume for 0, pausar o áudio de fundo
    if (backgroundAudioRef.current) {
      if (backgroundVolume === 0) {
        backgroundAudioRef.current.pause();
      } else if (isPlaying && selectedBackgroundSound?.audioUrl) {
        // Se volume > 0 e meditação está tocando, retomar o áudio de fundo
        backgroundAudioRef.current.play().catch(err => {
          console.error('Erro ao reproduzir som de fundo:', err);
        });
      }
    }
  }, [backgroundVolume, isPlaying, selectedBackgroundSound, analytics]);

  // Track previous volumes for change detection
  const previousMeditationVolume = useRef(meditationVolume);
  const previousBackgroundVolumeRef = useRef(backgroundVolume);

  // Controlar volume do áudio da meditação
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = meditationVolume / 100;
    }

    // Track meditation volume change (with debounce handled by analytics hook)
    if (previousMeditationVolume.current !== meditationVolume) {
      analytics.trackVolumeChanged(previousMeditationVolume.current, meditationVolume);
      previousMeditationVolume.current = meditationVolume;
    }
  }, [meditationVolume, analytics]);

  const handleFavoriteToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);

    // Track Favorited/Unfavorited
    if (newFavoriteState) {
      // Track Favorited
      const payload = {
        meditation_id: meditationData.id || 'unknown',
        meditation_title: meditationData.title,
        category,
        duration_seconds: parseDurationToSeconds(meditationData.duration),
        is_completed: false, // TODO: integrar com sistema de progresso
        source: 'player' as const,
      };
      trackMeditationEvent('Front-end: Meditation Favorited', payload);

      // Mostrar toast de confirmação
      setShowFavoriteToast(true);
      // Auto-hide após 3 segundos
      setTimeout(() => {
        setShowFavoriteToast(false);
      }, 3000);
    } else {
      // Track Unfavorited
      const payload = {
        meditation_id: meditationData.id || 'unknown',
        meditation_title: meditationData.title,
        category,
        source: 'player' as const,
      };
      trackMeditationEvent('Front-end: Meditation Unfavorited', payload);
    }
  };

  const handleOpenBackgroundModal = () => {
    setIsBackgroundModalOpen(true);
  };

  const handleCloseBackgroundModal = () => {
    setIsBackgroundModalOpen(false);
  };

  const previousBackgroundSound = useRef(selectedBackgroundSound);

  const handleSelectBackgroundSound = (sound: Sound) => {
    // Track Background Sound Selected
    analytics.trackBackgroundSoundSelected(
      previousBackgroundSound.current?.id || 'none',
      sound.id,
      sound.title,
      sound.category
    );

    previousBackgroundSound.current = sound;
    setSelectedBackgroundSound(sound);
  };

  /**
   * NOVO: Fade out suave do áudio ao longo de 10 segundos
   */
  const startAudioFadeOut = () => {
    const audio = audioRef.current;
    const backgroundAudio = backgroundAudioRef.current;
    if (!audio) return;

    setIsAudioFading(true);

    const fadeDurationMs = 10000; // 10 segundos
    const fadeSteps = 100; // 100 passos
    const stepDurationMs = fadeDurationMs / fadeSteps;
    const initialVolume = audio.volume;
    const initialBackgroundVolume = backgroundAudio?.volume || 0;

    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;

      const progress = currentStep / fadeSteps;
      const newVolume = initialVolume * (1 - progress);

      // Fade áudio principal
      if (audio) {
        audio.volume = Math.max(0, newVolume);
      }

      // Fade áudio de fundo
      if (backgroundAudio) {
        backgroundAudio.volume = Math.max(0, initialBackgroundVolume * (1 - progress));
      }

      // Após 5 segundos (50% do fade), mostrar gate
      if (currentStep === Math.floor(fadeSteps / 2)) {
        setShowGuestGate(true);
      }

      // Quando completar o fade, pausar áudio
      if (currentStep >= fadeSteps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }

        if (audio) {
          audio.pause();
        }

        if (backgroundAudio) {
          backgroundAudio.pause();
        }

        setIsPlaying(false);
        setIsAudioFading(false);
      }
    }, stepDurationMs);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);

      // NOVO: Guest mode - detectar limite de 2 minutos
      if (
        isGuest &&
        !showGuestGate &&
        !isAudioFading &&
        audio.currentTime >= GUEST_TIME_LIMIT_SECONDS
      ) {
        // Iniciar fade out
        startAudioFadeOut();

        // Track limite atingido
        trackInteraction('meditation_started', {
          meditation_id: meditationData.id,
          time_listened_seconds: audio.currentTime,
        });

        // Trigger conversão
        checkTrigger(ConversionSignals.meditationPreview(meditationData.id || 'unknown'));
      }

      // Check if meditation is 95%+ complete (send only ONCE)
      if (
        !hasCompletedEventSent.current &&
        audio.duration > 0 &&
        (audio.currentTime / audio.duration) >= 0.95
      ) {
        hasCompletedEventSent.current = true;
        analytics.trackCompleted({
          backgroundSoundId: selectedBackgroundSound?.id || 'none',
          backgroundSoundTitle: selectedBackgroundSound?.title || 'Nenhum',
          meditationVolumeFinal: meditationVolume,
          backgroundVolumeFinal: backgroundVolume,
        });
        setShowCompletionScreen(true);
      }
    };

    const updateDuration = () => {
      setDuration(audio.duration);
      // Inicializar volume quando metadata carregar
      audio.volume = meditationVolume / 100;
    };

    const handleEnded = () => {
      setIsPlaying(false);

      // Track Completed on natural end (only if not sent already)
      if (!hasCompletedEventSent.current) {
        hasCompletedEventSent.current = true;
        analytics.trackCompleted({
          backgroundSoundId: selectedBackgroundSound?.id || 'none',
          backgroundSoundTitle: selectedBackgroundSound?.title || 'Nenhum',
          meditationVolumeFinal: meditationVolume,
          backgroundVolumeFinal: backgroundVolume,
        });

        // Rastrear interação para guests
        if (!user) {
          trackInteraction('meditation_completed', {
            meditation_id: meditationData.id || 'unknown',
            meditation_title: meditationData.title,
            category,
            duration_seconds: parseDurationToSeconds(meditationData.duration),
            page: '/app/meditation-player',
          });

          // Disparar evento customizado para GuestExperienceTracker
          window.dispatchEvent(new CustomEvent('eco:meditation:completed', {
            detail: {
              meditation_id: meditationData.id || 'unknown',
              meditation_title: meditationData.title,
              category,
            },
          }));
        }

        setShowCompletionScreen(true);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [meditationVolume, backgroundVolume, selectedBackgroundSound, analytics]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        // PAUSE
        audioRef.current.pause();
        // Pausar também o som de fundo
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.pause();
        }

        // Track Paused
        analytics.trackPaused(audioRef.current.currentTime);

        setIsPlaying(false);
      } else {
        // PLAY
        audioRef.current.play();
        // Iniciar automaticamente o som de fundo quando play for clicado
        if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
          backgroundAudioRef.current.play().catch(err => {
            console.error('Erro ao reproduzir som de fundo:', err);
          });
        }

        // Track Started (first play) ou Resumed (subsequent plays)
        if (!hasPlayedOnce.current) {
          analytics.trackStarted({
            backgroundSoundId: selectedBackgroundSound?.id || 'none',
            backgroundSoundTitle: selectedBackgroundSound?.title || 'Nenhum',
            meditationVolume,
            backgroundVolume,
            sourcePage: returnTo,
          });

          // Rastrear interação para guests
          if (!user) {
            trackInteraction('meditation_started', {
              meditation_id: meditationData.id || 'unknown',
              meditation_title: meditationData.title,
              category,
              page: '/app/meditation-player',
            });

            // Disparar evento customizado para GuestExperienceTracker
            window.dispatchEvent(new CustomEvent('eco:meditation:started', {
              detail: {
                meditation_id: meditationData.id || 'unknown',
                meditation_title: meditationData.title,
                category,
              },
            }));
          }

          hasPlayedOnce.current = true;
        } else {
          analytics.trackResumed(audioRef.current.currentTime);
        }

        setIsPlaying(true);
      }
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      const beforeTime = audioRef.current.currentTime;
      audioRef.current.currentTime += seconds;
      const afterTime = audioRef.current.currentTime;

      // Track Skip
      analytics.trackSkip(
        seconds > 0 ? 'forward' : 'backward',
        beforeTime,
        afterTime
      );
    }
  };

  // Track seek start time
  const seekStartTime = useRef<number | null>(null);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      // Capture seek start time on first change
      if (seekStartTime.current === null) {
        seekStartTime.current = audioRef.current.currentTime;
      }

      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleProgressChangeEnd = () => {
    // Track Seek when user finishes dragging
    if (seekStartTime.current !== null && audioRef.current) {
      analytics.trackSeek(seekStartTime.current, audioRef.current.currentTime);
      seekStartTime.current = null;
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

  // Handler para slider vertical customizado
  const handleVolumeSliderInteraction = (clientY: number) => {
    if (!volumeSliderRef.current) return;

    const rect = volumeSliderRef.current.getBoundingClientRect();
    const sliderHeight = rect.height;
    const clickY = clientY - rect.top;

    // Inverter o cálculo porque o volume 100% fica no topo
    const percentage = Math.max(0, Math.min(100, ((sliderHeight - clickY) / sliderHeight) * 100));
    setMeditationVolume(Math.round(percentage));
  };

  const handleVolumeSliderStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);

    if ('touches' in e) {
      handleVolumeSliderInteraction(e.touches[0].clientY);
    } else {
      handleVolumeSliderInteraction(e.clientY);
    }
  };

  // Listeners globais para dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();

      if ('touches' in e) {
        handleVolumeSliderInteraction(e.touches[0].clientY);
      } else {
        handleVolumeSliderInteraction(e.clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    return () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging]);

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
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="mb-6 overflow-hidden rounded-3xl shadow-2xl"
        >
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-40 w-40 sm:h-48 sm:w-48 object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="mb-6 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center px-4 drop-shadow-sm"
        >
          {meditationData.title}
        </motion.h1>

        {/* Playback Controls - Reduzidos */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="mb-6 flex items-center gap-4"
        >
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
        </motion.div>

        {/* Controls Bar - Responsive */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="w-full max-w-4xl px-2 sm:px-6 mt-4"
        >
          {/* Mobile Layout - Premium Clean */}
          <div className="md:hidden relative" ref={volumePopoverRef}>
            {/* Barra Principal - Mobile Premium */}
            <div className="flex items-center justify-between gap-4 bg-white/95 backdrop-blur-lg rounded-2xl px-5 py-4 shadow-xl border border-gray-100/50">
              {/* Background Sound Chip */}
              <button
                onClick={handleOpenBackgroundModal}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95 touch-manipulation"
              >
                <Music size={16} className="text-gray-600 flex-shrink-0" strokeWidth={2} />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide leading-tight">Sons de fundo</span>
                  <span className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">
                    {selectedBackgroundSound?.title || 'Nenhum'}
                  </span>
                </div>
              </button>

              {/* Favorite Button */}
              <button
                onClick={handleFavoriteToggle}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95 touch-manipulation"
              >
                <Heart
                  size={20}
                  className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  strokeWidth={2}
                />
              </button>

              {/* Volume Button Container - With Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowVolumePopover(!showVolumePopover)}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95 touch-manipulation"
                >
                  <Volume2 size={18} className="text-gray-600" strokeWidth={2} />
                </button>

                {/* Volume Popover Vertical - Aparece acima do botão */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 transition-all duration-300 ease-out ${
                  showVolumePopover
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}>
                  <div className="bg-white/95 backdrop-blur-lg rounded-2xl px-3 py-4 shadow-2xl border border-gray-100/50">
                    <div className="flex flex-col items-center gap-3 h-[180px]">
                      {/* Porcentagem no topo */}
                      <span className="text-xs font-bold text-gray-700">
                        {Math.round(meditationVolume)}%
                      </span>

                      {/* Slider Vertical */}
                      <div
                        ref={volumeSliderRef}
                        onTouchStart={handleVolumeSliderStart}
                        onMouseDown={handleVolumeSliderStart}
                        className="flex-1 relative w-12 flex items-center justify-center cursor-pointer touch-manipulation active:cursor-grabbing"
                      >
                        {/* Barra de fundo vertical */}
                        <div className="absolute inset-x-0 top-0 bottom-0 w-2 mx-auto bg-gray-200 rounded-full pointer-events-none">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-600 rounded-full transition-all duration-150"
                            style={{ height: `${meditationVolume}%` }}
                          />
                        </div>
                      </div>

                      {/* Ícone no bottom */}
                      <Volume2 size={14} className="text-gray-500" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar - Separado abaixo */}
            <div className="mt-3 bg-white/90 backdrop-blur-md rounded-full px-4 py-2.5 shadow-md border border-gray-100/50">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-gray-600 flex-shrink-0 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleProgressChange}
                    onMouseUp={handleProgressChangeEnd}
                    onTouchEnd={handleProgressChangeEnd}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation z-10"
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-100"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 flex-shrink-0 tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>
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
              onMouseUp={handleProgressChangeEnd}
              onTouchEnd={handleProgressChangeEnd}
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
        </motion.div>
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

      {/* Meditation Completion Screen */}
      {showCompletionScreen && (
        <MeditationCompletion
          meditationId={meditationData.id || 'unknown'}
          meditationTitle={meditationData.title}
          meditationDuration={duration}
          meditationCategory={category}
          onDismiss={() => {
            setShowCompletionScreen(false);
            handleBack();
          }}
          sessionMetrics={{
            pauseCount: analytics.getSessionMetrics().pauseCount,
            skipCount: analytics.getSessionMetrics().skipCount,
            actualPlayTime: currentTime,
          }}
        />
      )}

      {/* NOVO: Guest Gate (2 minutos limit) */}
      {isGuest && (
        <MeditationGuestGate
          open={showGuestGate}
          meditationTitle={meditationData.title}
          meditationId={meditationData.id || 'unknown'}
          currentTime={currentTime}
          totalDuration={duration}
          onClose={handleBack}
        />
      )}
    </div>
  );
}
