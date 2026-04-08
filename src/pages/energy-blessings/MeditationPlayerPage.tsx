import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Heart, Music, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
import MeditationCompletion from '@/components/meditation/MeditationCompletion';
import AbundanciaCompletion from '@/components/meditation/AbundanciaCompletion';
import { type Sound, getAllSounds } from '@/data/sounds';
import { useMeditationAnalytics } from '@/hooks/useMeditationAnalytics';
import { parseDurationToSeconds, getCategoryFromPath, trackMeditationEvent } from '@/analytics/meditation';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import MeditationGuestGate from '@/components/meditation/MeditationGuestGate';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';

interface MeditationData {
  id?: string;
  title: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  backgroundMusic?: string;
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
  const { user, isGuestMode, isVipUser } = useAuth();
  const { trackInteraction } = useGuestExperience();
  const { checkTrigger } = useGuestConversionTriggers();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Dados da meditação passados via navigation state
  const meditationData: MeditationData = location.state?.meditation || {
    id: 'fallback_1',
    title: 'Bênçãos dos Centros de Energia',
    duration: '07:42',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    imageUrl: '/images/energy-blessings.webp',
    backgroundMusic: 'Cristais',
    category: 'fallback',
    isPremium: false,
  };

  // Inferir categoria do returnTo se não fornecido
  const returnTo = location.state?.returnTo || '/app';
  const category = meditationData.category || getCategoryFromPath(returnTo);

  // Tema dourado para o Código da Abundância
  const isAbundancia = category === 'abundancia';
  const GOLD = '#FFB932';
  const GOLD_DARK = '#C49A00';

  // Tema azul escuro para Dr. Joe Dispenza
  const isDrJoe = category === 'dr_joe_dispenza';
  const DJ_BLUE = '#3B82F6';
  const DJ_BLUE_DARK = '#2563EB';

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
    const allSounds = getAllSounds();
    return allSounds.find(sound => sound.id === 'freq_1') || null;
  });
  const [backgroundVolume, setBackgroundVolume] = useState(35); // Volume padrão para som de fundo (35% — mais suave no início)
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Estado para volume da meditação
  const [meditationVolume, setMeditationVolume] = useState(100);

  // Estado para controlar popover de volume (mobile)
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const volumePopoverRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para tela de conclusão
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);

  // NOVO: Guest mode state (VIP users bypass all gates)
  const isGuest = isGuestMode && !user && !isVipUser;
  const GUEST_TIME_LIMIT_SECONDS = 120; // 2 minutos
  const [showGuestGate, setShowGuestGate] = useState(false);
  const [isAudioFading, setIsAudioFading] = useState(false);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const favoriteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fade-in on first play
  const fadeInIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress persistence
  const PROGRESS_KEY = `eco.meditation.progress.v1.${meditationData.id || 'default'}`;
  const lastSavedTimeRef = useRef(0);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Scroll para o topo quando a página carregar
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load saved progress and offer resume prompt
  useEffect(() => {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;
    try {
      const { currentTime: savedTime, timestamp } = JSON.parse(raw) as {
        currentTime: number;
        timestamp: number;
      };
      // Expire after 7 days
      if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(PROGRESS_KEY);
        return;
      }
      // Only show prompt if more than 10 s was listened
      if (savedTime > 10) {
        setSavedProgress(savedTime);
        setShowResumePrompt(true);
      }
    } catch {
      localStorage.removeItem(PROGRESS_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track Abandoned on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        analytics.trackAbandoned(audioRef.current.currentTime, 'navigation');
      }

      // Cleanup fade intervals
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (fadeInIntervalRef.current) {
        clearInterval(fadeInIntervalRef.current);
      }

      // Cleanup favorite toast timer
      if (favoriteToastTimerRef.current) {
        clearTimeout(favoriteToastTimerRef.current);
      }

      // Cleanup Web Audio
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      gainRef.current = null;
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

  // Controlar volume do áudio de fundo diretamente no elemento (compatível com background/lock screen)
  useEffect(() => {
    if (backgroundAudioRef.current) {
      // Sons de fundo suaves: máximo 8% do volume total
      const softVolume = (backgroundVolume / 100) * 0.08;
      backgroundAudioRef.current.volume = softVolume;
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
        backgroundAudioRef.current.play().catch(err => {
          console.error('Erro ao reproduzir som de fundo:', err);
        });
      }
    }
  }, [backgroundVolume, isPlaying, selectedBackgroundSound, analytics]);

  // Retomar áudio de fundo quando o utilizador desbloqueia o telemóvel
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isPlaying &&
        backgroundVolume > 0 &&
        selectedBackgroundSound?.audioUrl &&
        backgroundAudioRef.current?.paused
      ) {
        backgroundAudioRef.current.play().catch(() => {/* silêncio */});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, backgroundVolume, selectedBackgroundSound]);

  // Track previous volumes for change detection
  const previousMeditationVolume = useRef(meditationVolume);
  const previousBackgroundVolumeRef = useRef(backgroundVolume);

  // Amplificar voz da meditação via Web Audio API (2x gain)
  // Retorna Promise para garantir que o AudioContext está running antes do play
  const initAudioGain = async (): Promise<void> => {
    const el = audioRef.current;
    if (!el || audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 2.0;
      src.connect(gain).connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainRef.current = gain;
      // Garantir que o contexto está rodando antes do áudio começar
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch {
      // fallback: sem amplificação
    }
  };

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
      // Auto-hide após 3 segundos (cancela timer anterior se existir)
      if (favoriteToastTimerRef.current) {
        clearTimeout(favoriteToastTimerRef.current);
      }
      favoriteToastTimerRef.current = setTimeout(() => {
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

  /**
   * Smoothly fade audio volume from 0 to the user's current setting over 3 s.
   * Only called on the very first play of a session.
   */
  const startFadeIn = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0;
    const targetVolume = meditationVolume / 100;
    const fadeSteps = 60; // ~50 ms each → 3 s total
    const stepMs = 3000 / fadeSteps;
    let step = 0;

    fadeInIntervalRef.current = setInterval(() => {
      step++;
      if (audio) {
        audio.volume = Math.min(targetVolume, targetVolume * (step / fadeSteps));
      }
      if (step >= fadeSteps) {
        if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);
      }
    }, stepMs);
  };

  // Auto-play ao entrar na página
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tryAutoPlay = async () => {
      if (hasPlayedOnce.current) return;
      await initAudioGain();
      audio.volume = 0;
      audio.play()
        .then(() => {
          startFadeIn();
          hasPlayedOnce.current = true;
          setIsPlaying(true);
          analytics.trackStarted({
            backgroundSoundId: selectedBackgroundSound?.id || 'none',
            backgroundSoundTitle: selectedBackgroundSound?.title || 'Nenhum',
            meditationVolume,
            backgroundVolume,
            sourcePage: returnTo,
          });
          if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
            backgroundAudioRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          // Autoplay bloqueado pelo browser — usuário precisa pressionar play manualmente
        });
    };

    audio.addEventListener('canplay', tryAutoPlay, { once: true });
    return () => audio.removeEventListener('canplay', tryAutoPlay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);

      // Save progress every ~5 s for resume-later feature
      if (
        audio.duration > 0 &&
        (audio.currentTime / audio.duration) < 0.95 &&
        audio.currentTime > 10
      ) {
        if (audio.currentTime - lastSavedTimeRef.current >= 5) {
          lastSavedTimeRef.current = audio.currentTime;
          localStorage.setItem(
            PROGRESS_KEY,
            JSON.stringify({ currentTime: audio.currentTime, timestamp: Date.now() })
          );
        }
      }

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

      // Write 80% completion marker for program sequence tracking
      if (audio.duration > 0 && (audio.currentTime / audio.duration) >= 0.80 && meditationData.id) {
        const markerKey = `eco.meditation.completed80pct.${meditationData.id}`;
        if (!localStorage.getItem(markerKey)) {
          localStorage.setItem(markerKey, 'true');
        }
      }

      // Check if meditation is 95%+ complete (send only ONCE)
      if (
        !hasCompletedEventSent.current &&
        audio.duration > 0 &&
        (audio.currentTime / audio.duration) >= 0.95
      ) {
        hasCompletedEventSent.current = true;
        localStorage.removeItem(PROGRESS_KEY);
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
        localStorage.removeItem(PROGRESS_KEY);
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

  const handlePlayPause = async () => {
    await initAudioGain();
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
        // Smooth fade-in only on the very first play
        if (!hasPlayedOnce.current) {
          startFadeIn();
        }
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

  // Fechar popover de volume ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(event.target as Node)) {
        setShowVolumePopover(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowVolumePopover(false);
    };

    if (showVolumePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
    const rounded = Math.round(percentage);
    setBackgroundVolume(rounded);
    // Sync imediato ao elemento de áudio (Android/desktop) — iOS Safari ignora audio.volume por design do sistema
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = Math.max(0, Math.min(0.08, (rounded / 100) * 0.08));
    }
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
      if ('touches' in e) {
        e.preventDefault(); // Evita scroll do browser durante drag do slider
        handleVolumeSliderInteraction(e.touches[0].clientY);
      } else {
        handleVolumeSliderInteraction((e as MouseEvent).clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('touchmove', handleMove, { passive: false }); // passive:false obrigatório para preventDefault funcionar
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

  useMediaSession({
    title: meditationData.title,
    artist: 'ECO — Meditação',
    artwork: meditationData.imageUrl,
    audioRef,
    isPlaying,
    duration,
    currentTime,
    onPlay: () => { if (!isPlaying) handlePlayPause(); },
    onPause: () => { if (isPlaying) handlePlayPause(); },
    onSeekBackward: () => handleSkip(-15),
    onSeekForward: () => handleSkip(15),
  });

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

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0"
        style={isAbundancia || isDrJoe
          ? { background: 'linear-gradient(to bottom, rgba(9,9,15,0.55) 0%, rgba(9,9,15,0.40) 50%, rgba(9,9,15,0.65) 100%)' }
          : { background: 'rgba(0,0,0,0.25)' }
        }
      />

      {/* HomeHeader */}
      <div className="relative z-10">
        <HomeHeader />
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-start px-4 sm:px-8 pt-16 sm:pt-24 pb-12 sm:pb-8">
        {/* Back Button - Inline no topo (mobile) */}
        <div className="w-full max-w-4xl mb-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
            aria-label="Voltar"
            style={isAbundancia
              ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.4)' }
              : isDrJoe
              ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }
              : { background: 'rgba(255,255,255,0.9)' }
            }
          >
            <ChevronLeft size={22} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#1F2937' }} />
          </button>
        </div>
        {/* Meditation Image Card */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6 overflow-hidden rounded-3xl shadow-2xl"
        >
          <img
            src={meditationData.imageUrl}
            alt={meditationData.title}
            className="h-32 w-32 sm:h-48 sm:w-48 object-cover"
            style={{ objectPosition: 'center 35%' }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className={`mb-3 sm:mb-6 text-xl sm:text-3xl md:text-4xl font-bold text-center px-2 leading-snug drop-shadow-sm ${isAbundancia || isDrJoe ? '' : 'text-gray-900'}`}
          style={isAbundancia
            ? { color: GOLD, textShadow: '0 2px 16px rgba(255,185,50,0.4)', textWrap: 'balance' }
            : isDrJoe
            ? { color: '#FFFFFF', textShadow: '0 2px 16px rgba(59,130,246,0.4)', textWrap: 'balance' }
            : { textWrap: 'balance' }}
        >
          {meditationData.title}
        </motion.h1>

        {/* Playback Controls - Reduzidos */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="mb-4 sm:mb-6 flex items-center gap-4"
        >
          {/* Skip Back 15s */}
          <button
            onClick={() => handleSkip(-15)}
            aria-label="Retroceder 15 segundos"
            className="flex flex-col h-12 w-12 items-center justify-center gap-0.5 rounded-full backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
            style={isAbundancia
              ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.4)' }
              : isDrJoe
              ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }
              : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(229,231,235,0.5)' }
            }
          >
            <SkipBack size={16} strokeWidth={1.5} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' }} />
            <span className="text-[9px] font-bold leading-none" style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' }}>15s</span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pausar meditação' : 'Reproduzir meditação'}
            className="flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm shadow-xl md:hover:shadow-2xl transition-all active:scale-95 touch-manipulation"
            style={isAbundancia
              ? { background: GOLD, border: '1px solid rgba(255,185,50,0.3)', boxShadow: '0 8px 32px rgba(255,185,50,0.45)' }
              : isDrJoe
              ? { background: DJ_BLUE, border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 8px 32px rgba(59,130,246,0.45)' }
              : { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(229,231,235,0.5)' }
            }
          >
            {isPlaying ? (
              <Pause size={28} strokeWidth={2} style={{ color: isAbundancia || isDrJoe ? '#FFFFFF' : '#111827' }} />
            ) : (
              <Play size={28} strokeWidth={2} fill="currentColor" className="ml-0.5" style={{ color: isAbundancia || isDrJoe ? '#FFFFFF' : '#111827' }} />
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => handleSkip(15)}
            aria-label="Avançar 15 segundos"
            className="flex flex-col h-12 w-12 items-center justify-center gap-0.5 rounded-full backdrop-blur-sm shadow-md md:hover:shadow-lg transition-all active:scale-95 touch-manipulation"
            style={isAbundancia
              ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.4)' }
              : isDrJoe
              ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }
              : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(229,231,235,0.5)' }
            }
          >
            <SkipForward size={16} strokeWidth={1.5} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' }} />
            <span className="text-[9px] font-bold leading-none" style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' }}>15s</span>
          </button>
        </motion.div>

        {/* Controls Bar - Responsive */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="w-full max-w-4xl px-0 sm:px-6 mt-2 sm:mt-4"
        >
          {/* Mobile Layout - Premium Clean */}
          <div className="md:hidden relative max-w-sm mx-auto" ref={volumePopoverRef}>
            {/* Barra Principal - Mobile Premium */}
            <div
              className="flex items-center justify-between gap-4 backdrop-blur-lg rounded-2xl px-5 py-4 shadow-xl"
              style={isAbundancia
                ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(255,185,50,0.25)' }
                : isDrJoe
                ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(59,130,246,0.25)' }
                : { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(243,244,246,0.5)' }
              }
            >
              {/* Background Sound Chip */}
              <button
                onClick={handleOpenBackgroundModal}
                aria-label={`Sons de fundo: ${selectedBackgroundSound?.title ?? 'Nenhum'}`}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 touch-manipulation"
                style={isAbundancia
                  ? { background: 'rgba(255,185,50,0.12)', border: '1px solid rgba(255,185,50,0.3)' }
                  : isDrJoe
                  ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }
                  : { background: 'linear-gradient(to bottom right, #F9FAFB, #FFFFFF)', border: '1px solid rgba(229,231,235,0.5)' }
                }
              >
                <Music size={16} strokeWidth={2} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#4B5563', flexShrink: 0 }} />
                <div className="flex flex-col items-start min-w-0">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide leading-tight"
                    style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : '#9CA3AF' }}
                  >
                    Sons de fundo
                  </span>
                  <span
                    className="text-xs font-bold leading-tight truncate max-w-[120px]"
                    style={{ color: isAbundancia || isDrJoe ? 'rgba(255,255,255,0.9)' : '#1F2937' }}
                  >
                    {selectedBackgroundSound?.title || 'Nenhum'}
                  </span>
                </div>
              </button>

              {/* Favorite Button */}
              <button
                onClick={handleFavoriteToggle}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite}
                className="flex items-center justify-center w-11 h-11 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 touch-manipulation"
                style={isAbundancia
                  ? { background: 'rgba(255,185,50,0.12)', border: '1px solid rgba(255,185,50,0.3)' }
                  : isDrJoe
                  ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }
                  : { background: 'linear-gradient(to bottom right, #F9FAFB, #FFFFFF)', border: '1px solid rgba(229,231,235,0.5)' }
                }
              >
                <Heart
                  size={20}
                  strokeWidth={2}
                  className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                  style={!isFavorite ? { color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#4B5563' } : undefined}
                />
              </button>

              {/* Volume Button Container - With Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowVolumePopover(!showVolumePopover)}
                  aria-label="Controle de volume"
                  aria-expanded={showVolumePopover}
                  className="flex items-center justify-center w-11 h-11 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 touch-manipulation"
                  style={isAbundancia
                    ? { background: 'rgba(255,185,50,0.12)', border: '1px solid rgba(255,185,50,0.3)' }
                    : isDrJoe
                    ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }
                    : { background: 'linear-gradient(to bottom right, #F9FAFB, #FFFFFF)', border: '1px solid rgba(229,231,235,0.5)' }
                  }
                >
                  <Volume2 size={18} strokeWidth={2} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#4B5563' }} />
                </button>

                {/* Volume Popover Vertical - Aparece acima do botão */}
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 transition-all duration-300 ease-out ${
                  showVolumePopover
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}>
                  <div
                    className="backdrop-blur-lg rounded-2xl px-3 py-4 shadow-2xl"
                    style={isAbundancia
                      ? { background: 'rgba(9,9,15,0.95)', border: '1px solid rgba(255,185,50,0.25)' }
                      : isDrJoe
                      ? { background: 'rgba(9,9,15,0.95)', border: '1px solid rgba(59,130,246,0.25)' }
                      : { background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(243,244,246,0.5)' }
                    }
                  >
                    <div className="flex flex-col items-center gap-3 h-[180px]">
                      {/* Porcentagem no topo */}
                      <span className="text-xs font-bold" style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' }}>
                        {Math.round(backgroundVolume)}%
                      </span>

                      {/* Slider Vertical — controla som de fundo */}
                      <div
                        ref={volumeSliderRef}
                        onTouchStart={handleVolumeSliderStart}
                        onMouseDown={handleVolumeSliderStart}
                        role="slider"
                        aria-label="Volume do som de fundo"
                        aria-valuenow={backgroundVolume}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${backgroundVolume}%`}
                        tabIndex={0}
                        className="flex-1 relative w-12 flex items-center justify-center cursor-pointer active:cursor-grabbing"
                        style={{ touchAction: 'none' }}
                      >
                        {/* Barra de fundo vertical */}
                        <div
                          className="absolute inset-x-0 top-0 bottom-0 w-2 mx-auto rounded-full pointer-events-none"
                          style={{ background: isAbundancia ? 'rgba(255,185,50,0.2)' : isDrJoe ? 'rgba(59,130,246,0.2)' : '#E5E7EB' }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
                            style={{
                              height: `${backgroundVolume}%`,
                              background: isAbundancia
                                ? `linear-gradient(to top, ${GOLD_DARK}, ${GOLD})`
                                : `linear-gradient(to top, ${DJ_BLUE_DARK}, ${DJ_BLUE})`,
                            }}
                          />
                        </div>
                        {/* Thumb visual */}
                        <div
                          className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md pointer-events-none transition-all duration-150"
                          style={{
                            bottom: `calc(${backgroundVolume}% - 10px)`,
                            background: '#FFFFFF',
                            border: `2px solid ${isAbundancia ? GOLD : DJ_BLUE}`,
                          }}
                        />
                      </div>

                      {/* Ícone no bottom */}
                      <Music size={14} strokeWidth={2} style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : '#6B7280' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar - Separado abaixo */}
            <div
              className="mt-3 backdrop-blur-md rounded-full px-4 py-2.5 shadow-md"
              style={isAbundancia
                ? { background: 'rgba(9,9,15,0.80)', border: '1px solid rgba(255,185,50,0.2)' }
                : isDrJoe
                ? { background: 'rgba(9,9,15,0.80)', border: '1px solid rgba(59,130,246,0.2)' }
                : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(243,244,246,0.5)' }
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[11px] font-semibold flex-shrink-0 tabular-nums"
                  style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : '#4B5563' }}
                >
                  {formatTime(currentTime)}
                </span>
                <div
                  className="flex-1 relative h-1.5 rounded-full overflow-visible"
                  style={{ background: isAbundancia ? 'rgba(255,185,50,0.2)' : isDrJoe ? 'rgba(59,130,246,0.2)' : '#E5E7EB' }}
                >
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleProgressChange}
                    onMouseUp={handleProgressChangeEnd}
                    onTouchEnd={handleProgressChangeEnd}
                    aria-label="Progresso da meditação"
                    aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ touchAction: 'none' }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                    style={{
                      width: `${(currentTime / (duration || 1)) * 100}%`,
                      background: isAbundancia
                        ? `linear-gradient(to right, ${GOLD_DARK}, ${GOLD})`
                        : `linear-gradient(to right, ${DJ_BLUE_DARK}, ${DJ_BLUE})`,
                    }}
                  />
                  {/* Thumb visual */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow pointer-events-none"
                    style={{
                      left: `calc(${(currentTime / (duration || 1)) * 100}% - 7px)`,
                      background: isAbundancia ? GOLD : DJ_BLUE,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-semibold flex-shrink-0 tabular-nums"
                  style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : '#4B5563' }}
                >
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Single Row */}
          <div
            className="hidden md:flex items-center justify-between gap-3 sm:gap-4 backdrop-blur-md rounded-full px-4 sm:px-6 py-3 sm:py-4 shadow-lg"
            style={isAbundancia
              ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(255,185,50,0.25)' }
              : isDrJoe
              ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(59,130,246,0.25)' }
              : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(243,244,246,0.5)' }
            }
          >
            {/* Background Sound Selector */}
            <button
              onClick={handleOpenBackgroundModal}
              className="flex items-center gap-2 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Music size={18} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151', flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium uppercase leading-tight" style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : '#6B7280' }}>Sons de Fundo</span>
                <span className="text-xs font-semibold leading-tight truncate max-w-[100px]" style={{ color: isAbundancia || isDrJoe ? 'rgba(255,255,255,0.9)' : '#111827' }}>
                  {selectedBackgroundSound?.title || 'Nenhum'}
                </span>
              </div>
            </button>

            {/* Time Display */}
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : '#374151' }}>
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
              aria-label="Progresso da meditação"
              aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
              className="flex-1 cursor-pointer meditation-range-slider"
              style={{
                height: '4px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: isAbundancia
                  ? `linear-gradient(to right, ${GOLD_DARK} 0%, ${GOLD_DARK} ${(currentTime / (duration || 1)) * 100}%, rgba(255,185,50,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255,185,50,0.2) 100%)`
                  : isDrJoe
                  ? `linear-gradient(to right, ${DJ_BLUE_DARK} 0%, ${DJ_BLUE_DARK} ${(currentTime / (duration || 1)) * 100}%, rgba(59,130,246,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(59,130,246,0.2) 100%)`
                  : `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${(currentTime / (duration || 1)) * 100}%, #E5E7EB ${(currentTime / (duration || 1)) * 100}%, #E5E7EB 100%)`,
                borderRadius: '999px',
                touchAction: 'none',
              }}
            />

            {/* Time Duration */}
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : '#374151' }}>
              {formatTime(duration)}
            </span>

            {/* Favorite Button */}
            <button
              onClick={handleFavoriteToggle}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-pressed={isFavorite}
              className="flex items-center justify-center w-8 h-8 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Heart
                size={20}
                className={`transition-all ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                strokeWidth={1.5}
                style={!isFavorite ? { color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#374151' } : undefined}
              />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Volume2 size={16} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : '#4B5563' }} aria-hidden="true" />
              <input
                type="range"
                min="0"
                max="100"
                value={meditationVolume}
                onChange={(e) => setMeditationVolume(parseFloat(e.target.value))}
                aria-label="Volume da meditação"
                aria-valuetext={`${meditationVolume}%`}
                className="w-20 sm:w-24 cursor-pointer meditation-range-slider"
                style={{
                  height: '4px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: isAbundancia
                    ? `linear-gradient(to right, ${GOLD_DARK} 0%, ${GOLD_DARK} ${meditationVolume}%, rgba(255,185,50,0.2) ${meditationVolume}%, rgba(255,185,50,0.2) 100%)`
                    : isDrJoe
                    ? `linear-gradient(to right, ${DJ_BLUE_DARK} 0%, ${DJ_BLUE_DARK} ${meditationVolume}%, rgba(59,130,246,0.2) ${meditationVolume}%, rgba(59,130,246,0.2) 100%)`
                    : `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${meditationVolume}%, #E5E7EB ${meditationVolume}%, #E5E7EB 100%)`,
                  borderRadius: '999px',
                  touchAction: 'none',
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

      {/* Resume Progress Prompt */}
      {showResumePrompt && savedProgress !== null && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between gap-3 border border-gray-200/50">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Continuar de onde parou?</p>
              <p className="text-xs text-gray-500">{formatTime(savedProgress)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.currentTime = savedProgress;
                  setCurrentTime(savedProgress);
                  setShowResumePrompt(false);
                }}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-full touch-manipulation"
              >
                Continuar
              </button>
              <button
                onClick={() => setShowResumePrompt(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full touch-manipulation"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meditation Completion Screen */}
      {showCompletionScreen && isAbundancia && (
        <AbundanciaCompletion
          meditationId={meditationData.id || 'abundancia_1'}
          meditationTitle={meditationData.title}
          meditationDuration={duration}
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

      {showCompletionScreen && !isAbundancia && (
        <MeditationCompletion
          meditationId={meditationData.id || 'unknown'}
          meditationTitle={meditationData.title}
          meditationDuration={duration}
          meditationCategory={category}
          onDismiss={() => {
            setShowCompletionScreen(false);
            handleBack();
          }}
          nextNight={(() => {
            if (category !== 'sono' || !meditationData.id?.startsWith('night_')) return undefined;
            const currentNum = parseInt(meditationData.id.replace('night_', ''), 10);
            if (isNaN(currentNum) || currentNum >= 7) return undefined;
            const next = PROTOCOL_NIGHTS.find(n => n.night === currentNum + 1);
            if (!next || !next.hasAudio) return undefined;
            const isLocked = next.night > 2 && !isVipUser;
            return {
              nightNumber: next.night,
              title: next.title,
              description: next.description,
              duration: next.duration,
              isLocked,
              onPlay: () => {
                if (isLocked) {
                  navigate('/app/subscription/demo');
                  return;
                }
                navigate('/app/meditation-player', {
                  state: {
                    meditation: {
                      id: next.id,
                      title: next.title,
                      duration: next.duration,
                      audioUrl: next.audioUrl,
                      imageUrl: next.imageUrl ?? '/images/meditacoes-sono-hero.webp',
                      backgroundMusic: 'Sono',
                      gradient: next.gradient,
                      category: 'sono',
                      isPremium: false,
                    },
                    returnTo: '/app/meditacoes-sono',
                  },
                });
              },
            };
          })()}
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
