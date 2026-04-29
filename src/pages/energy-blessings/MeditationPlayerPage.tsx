import { useState, useRef, useEffect, useMemo } from 'react';
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
import { useSonoCheckout } from '@/hooks/useSonoCheckout';
import { useGuestExperience } from '@/contexts/GuestExperienceContext';
import { useGuestConversionTriggers, ConversionSignals } from '@/hooks/useGuestConversionTriggers';
import MeditationGuestGate from '@/components/meditation/MeditationGuestGate';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import MeditationAmbientScreen from '@/components/meditation/MeditationAmbientScreen';

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
  const { loading: sonoCheckoutLoading, openCheckout: openSonoCheckout } = useSonoCheckout();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  // GainNode para som de fundo — controla volume via Web Audio (funciona no iOS, ao contrário de audio.volume)
  const bgGainRef = useRef<GainNode | null>(null);

  // Dados da meditação passados via navigation state
  const meditationData: MeditationData = location.state?.meditation || {
    id: 'fallback_1',
    title: 'Bênçãos dos Centros de Energia',
    duration: '07:42',
    audioUrl: '/audio/bencao-centros-energia.mp3',
    imageUrl: '/images/energy-blessings.webp',
    backgroundMusic: 'Cristais',
    category: 'fallback',
    isPremium: false,
  };

  // Inferir categoria do returnTo se não fornecido
  const returnTo = location.state?.returnTo || '/app';
  const sonoGuestMode = location.state?.sonoGuestMode === true;
  const category = meditationData.category || getCategoryFromPath(returnTo);

  // Tema dourado para o Código da Abundância
  const isAbundancia = category === 'abundancia';
  const GOLD = '#FFB932';
  const GOLD_DARK = '#C49A00';

  // Tema azul escuro para Dr. Joe Dispenza
  const isDrJoe = category === 'dr_joe_dispenza';
  const DJ_BLUE = '#3B82F6';
  const DJ_BLUE_DARK = '#2563EB';

  // Tema noturno para Meditações do Sono
  const isSono = category === 'sono';
  const SONO_LIGHT = '#C4B5FD';  // lavanda lunar
  const SONO_MID = '#A78BFA';    // lavanda média
  const SONO_DARK = '#7C3AED';   // violeta profundo

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

  // Número da noite do Protocolo Sono (ex: night_3 → 3)
  const nightNumber = useMemo(() => {
    if (!isSono || !meditationData.id?.startsWith('night_')) return null;
    const n = parseInt(meditationData.id.replace('night_', ''), 10);
    return isNaN(n) ? null : n;
  }, [isSono, meditationData.id]);

  // Noites já concluídas (lê do localStorage para os dots de progresso)
  const sonoCompletedNights = useMemo(() => {
    if (!isSono) return new Set<number>();
    const userId = user?.id || 'guest';
    const raw = localStorage.getItem(`eco.sono.protocol.v1.${userId}`);
    if (!raw) return new Set<number>();
    try { return new Set<number>(JSON.parse(raw).completedNights || []); }
    catch { return new Set<number>(); }
  }, [isSono, user?.id]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFavoriteToast, setShowFavoriteToast] = useState(false);

  // Estados para sons de fundo
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [selectedBackgroundSound, setSelectedBackgroundSound] = useState<Sound | null>(() => {
    const allSounds = getAllSounds();
    return allSounds.find(sound => sound.id === 'med_profunda') || null;
  });
  const [backgroundVolume, setBackgroundVolume] = useState(70);
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

  // Dica de tela bloqueada — aparece uma vez após o play iniciar
  const [showLockTip, setShowLockTip] = useState(false);
  const lockTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress persistence
  const PROGRESS_KEY = `eco.meditation.progress.v1.${meditationData.id || 'default'}`;
  const lastSavedTimeRef = useRef(0);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Ambient screen (anti-abandonment) — aparece após 3 min de play sem interação
  const AMBIENT_INACTIVITY_MS = 15 * 1000;
  const [showAmbient, setShowAmbient] = useState(false);
  const ambientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAmbientTimer = () => {
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    setShowAmbient(false);
    ambientTimerRef.current = setTimeout(() => setShowAmbient(true), AMBIENT_INACTIVITY_MS);
  };

  const clearAmbientTimer = () => {
    if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
    ambientTimerRef.current = null;
  };

  // Inicia/reinicia o timer quando play começa; cancela quando pausa ou conclui
  useEffect(() => {
    if (isPlaying && !showCompletionScreen) {
      resetAmbientTimer();
    } else {
      clearAmbientTimer();
      setShowAmbient(false);
    }
    return () => clearAmbientTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, showCompletionScreen]);

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

      // Cleanup lock tip timer
      if (lockTipTimerRef.current) {
        clearTimeout(lockTipTimerRef.current);
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
    const el = backgroundAudioRef.current;
    if (!el) return;
    if (selectedBackgroundSound?.audioUrl) {
      if (isPlaying) {
        el.play().catch(() => {/* autoplay bloqueado — usuário precisa interagir */});
      } else {
        el.pause();
      }
    } else {
      el.pause();
    }
  }, [selectedBackgroundSound, isPlaying]);

  // Recarregar áudio de fundo quando o som selecionado muda (src nova)
  useEffect(() => {
    const el = backgroundAudioRef.current;
    if (el && selectedBackgroundSound?.audioUrl) {
      el.load();
    }
  }, [selectedBackgroundSound?.id]);

  // Controlar volume do áudio de fundo via GainNode (funciona no iOS) ou audio.volume como fallback
  useEffect(() => {
    const softVolume = (backgroundVolume / 100) * 1.2;
    if (bgGainRef.current) {
      bgGainRef.current.gain.value = softVolume;
    } else if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = Math.min(1, softVolume);
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
  // Também roteia som de fundo pelo mesmo AudioContext para controle de volume real no iOS
  // Retorna Promise para garantir que o AudioContext está running antes do play
  const initAudioGain = async (): Promise<void> => {
    const el = audioRef.current;
    const bgEl = backgroundAudioRef.current;
    if (!el || audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();

      // Voz da meditação: amplificada 2x
      const src = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      gain.gain.value = 2.0;
      src.connect(gain).connect(ctx.destination);

      // Som de fundo: GainNode com volume suave — funciona no iOS ao contrário de audio.volume
      if (bgEl) {
        try {
          const bgSrc = ctx.createMediaElementSource(bgEl);
          const bgGain = ctx.createGain();
          bgGain.gain.value = (backgroundVolume / 100) * 1.2;
          bgSrc.connect(bgGain).connect(ctx.destination);
          bgGainRef.current = bgGain;
        } catch {
          // bgEl pode não estar pronto — fallback: sem controle de gain para fundo
        }
      }

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
    const initialVolume = gainRef.current?.gain.value ?? audio.volume;
    const initialBgGain = bgGainRef.current?.gain.value ?? backgroundAudio?.volume ?? 0;

    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;

      const progress = currentStep / fadeSteps;

      // Fade áudio principal via GainNode (funciona no iOS) ou audio.volume
      if (gainRef.current) {
        gainRef.current.gain.value = Math.max(0, initialVolume * (1 - progress));
      } else if (audio) {
        audio.volume = Math.max(0, initialVolume * (1 - progress));
      }

      // Fade áudio de fundo via GainNode (funciona no iOS) ou audio.volume
      if (bgGainRef.current) {
        bgGainRef.current.gain.value = Math.max(0, initialBgGain * (1 - progress));
      } else if (backgroundAudio) {
        backgroundAudio.volume = Math.max(0, initialBgGain * (1 - progress));
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

    const fadeSteps = 60; // ~50 ms each → 3 s total
    const stepMs = 3000 / fadeSteps;
    let step = 0;

    if (gainRef.current) {
      // Via GainNode — funciona no iOS (audio.volume é ignorado no iOS Safari)
      gainRef.current.gain.value = 0;
      fadeInIntervalRef.current = setInterval(() => {
        step++;
        if (gainRef.current) {
          gainRef.current.gain.value = Math.min(2.0, 2.0 * (step / fadeSteps));
        }
        if (step >= fadeSteps) {
          if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);
        }
      }, stepMs);
    } else {
      // Fallback para browsers sem Web Audio
      const targetVolume = meditationVolume / 100;
      audio.volume = 0;
      fadeInIntervalRef.current = setInterval(() => {
        step++;
        if (audio) {
          audio.volume = Math.min(targetVolume, targetVolume * (step / fadeSteps));
        }
        if (step >= fadeSteps) {
          if (fadeInIntervalRef.current) clearInterval(fadeInIntervalRef.current);
        }
      }, stepMs);
    }
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
          // Mostrar dica de tela bloqueada 3s após o play iniciar
          lockTipTimerRef.current = setTimeout(() => {
            setShowLockTip(true);
            // Auto-ocultar após 5s
            lockTipTimerRef.current = setTimeout(() => setShowLockTip(false), 5000);
          }, 3000);
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
          // Dica de tela bloqueada — mostrar 3s após o primeiro play manual
          lockTipTimerRef.current = setTimeout(() => {
            setShowLockTip(true);
            lockTipTimerRef.current = setTimeout(() => setShowLockTip(false), 5000);
          }, 3000);
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
    // Sync imediato: GainNode (iOS compatível) ou audio.volume como fallback
    const softVol = (rounded / 100) * 1.2;
    if (bgGainRef.current) {
      bgGainRef.current.gain.value = softVol;
    } else if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = Math.max(0, Math.min(1, softVol));
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
      className="relative font-primary overflow-x-hidden"
      style={{ minHeight: '100dvh', touchAction: 'pan-y' }}
      onTouchStart={resetAmbientTimer}
      onMouseMove={resetAmbientTimer}
      onClick={resetAmbientTimer}
    >
      {/* ── Background ── */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${meditationData.imageUrl})`,
          filter: 'blur(40px)',
          transform: 'scale(1.1)',
        }}
      />
      <div
        className="absolute inset-0"
        style={isAbundancia || isDrJoe
          ? { background: 'linear-gradient(to bottom, rgba(9,9,15,0.65) 0%, rgba(9,9,15,0.45) 50%, rgba(9,9,15,0.85) 100%)' }
          : isSono
          ? { background: 'linear-gradient(to bottom, rgba(6,9,26,0.60) 0%, rgba(6,9,26,0.30) 45%, rgba(6,9,26,0.96) 100%)' }
          : { background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0.72) 100%)' }
        }
      />
      {/* Glow lunar — visível apenas no tema sono */}
      {isSono && (
        <div
          className="pointer-events-none absolute"
          style={{
            bottom: '10%', left: '50%', transform: 'translateX(-50%)',
            width: '320px', height: '240px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.20) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      )}

      {/* ── Desktop HomeHeader — hidden on mobile ── */}
      <div className="hidden md:block relative z-10">
        <HomeHeader />
      </div>

      {/* ── Main layout: fills full viewport height on mobile ── */}
      <div className="relative z-10 flex flex-col" style={{ minHeight: '100dvh' }}>

        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center justify-between px-5 pb-3 flex-shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={handleBack}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <ChevronLeft size={22} className="text-white" />
          </button>

          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : 'rgba(255,255,255,0.40)' }}
          >
            {isSono && nightNumber !== null
              ? `Noite ${nightNumber} de 7`
              : isSono ? 'Protocolo Sono'
              : 'Meditação'}
          </p>

          {!sonoGuestMode ? (
            <button
              onClick={handleFavoriteToggle}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-pressed={isFavorite}
              className="flex h-11 w-11 items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <Heart
                size={18}
                strokeWidth={2}
                className={`transition-all ${isFavorite ? 'fill-red-400 text-red-400' : 'text-white/60'}`}
              />
            </button>
          ) : (
            <div className="w-11" />
          )}
        </div>

        {/* Desktop back button */}
        <div className="hidden md:flex px-8 pt-4 w-full max-w-4xl mx-auto flex-shrink-0">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm shadow-md hover:shadow-lg transition-all active:scale-95"
            aria-label="Voltar"
            style={isAbundancia
              ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.4)' }
              : isDrJoe
              ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' }
              : isSono
              ? { background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.28)' }
              : { background: 'rgba(255,255,255,0.9)' }
            }
          >
            <ChevronLeft size={22} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : '#1F2937' }} />
          </button>
        </div>

        {/* ── Center: art + title + playback controls ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 md:gap-6 px-6 py-3">

          {/* Album Art — much larger on mobile */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-[2rem] shadow-2xl flex-shrink-0"
            style={{
              width: 'min(62vw, 280px)',
              height: 'min(62vw, 280px)',
            }}
          >
            <img
              src={meditationData.imageUrl}
              alt={meditationData.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 35%' }}
            />
          </motion.div>

          {/* Title + duration */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-center px-4"
          >
            <h1
              className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug"
              style={isAbundancia
                ? { color: GOLD, textShadow: '0 2px 16px rgba(255,185,50,0.4)' }
                : isDrJoe
                ? { color: '#FFFFFF', textShadow: '0 2px 16px rgba(59,130,246,0.4)' }
                : isSono
                ? { color: '#FFFFFF', textShadow: '0 2px 20px rgba(124,58,237,0.55), 0 1px 8px rgba(0,0,0,0.50)' }
                : { color: '#FFFFFF', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }
              }
            >
              {meditationData.title}
            </h1>
            <p className="text-sm mt-1 font-medium" style={{ color: isAbundancia ? 'rgba(255,185,50,0.55)' : isSono ? 'rgba(196,181,253,0.50)' : 'rgba(255,255,255,0.40)' }}>
              {meditationData.duration}
            </p>

            {/* Dots de progresso — apenas Protocolo Sono */}
            {isSono && nightNumber !== null && (
              <div className="flex items-center gap-1.5 mt-3 justify-center">
                {Array.from({ length: 7 }, (_, i) => {
                  const n = i + 1;
                  const isCompleted = sonoCompletedNights.has(n);
                  const isCurrent = n === nightNumber;
                  return (
                    <div
                      key={n}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: isCurrent ? '18px' : '6px',
                        height: '6px',
                        background: isCurrent
                          ? SONO_MID
                          : isCompleted
                          ? 'rgba(167,139,250,0.55)'
                          : 'rgba(255,255,255,0.18)',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Playback controls */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="flex items-center gap-7 md:gap-5"
          >
            {/* Skip Back 15s */}
            <button
              onClick={() => handleSkip(-15)}
              aria-label="Retroceder 15 segundos"
              className="flex flex-col h-14 w-14 items-center justify-center gap-0.5 rounded-full touch-manipulation active:scale-95 transition-transform"
              style={isAbundancia
                ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.35)' }
                : isDrJoe
                ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' }
                : isSono
                ? { background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.28)' }
                : { background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }
              }
            >
              <SkipBack size={18} strokeWidth={1.5} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : 'rgba(255,255,255,0.85)' }} />
              <span className="text-[9px] font-bold leading-none" style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : isSono ? 'rgba(196,181,253,0.50)' : 'rgba(255,255,255,0.50)' }}>15s</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pausar meditação' : 'Reproduzir meditação'}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
              style={isAbundancia
                ? { background: GOLD, boxShadow: '0 8px 40px rgba(255,185,50,0.55)' }
                : isDrJoe
                ? { background: DJ_BLUE, boxShadow: '0 8px 40px rgba(59,130,246,0.55)' }
                : isSono
                ? { background: `linear-gradient(135deg, ${SONO_LIGHT} 0%, ${SONO_DARK} 100%)`, boxShadow: `0 8px 40px rgba(124,58,237,0.65)` }
                : { background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 40px rgba(255,255,255,0.18)' }
              }
            >
              {isPlaying ? (
                <Pause size={30} strokeWidth={2} style={{ color: isAbundancia || isDrJoe || isSono ? '#FFFFFF' : '#111827' }} />
              ) : (
                <Play size={30} strokeWidth={2} fill="currentColor" className="ml-0.5" style={{ color: isAbundancia || isDrJoe || isSono ? '#FFFFFF' : '#111827' }} />
              )}
            </button>

            {/* Skip Forward 15s */}
            <button
              onClick={() => handleSkip(15)}
              aria-label="Avançar 15 segundos"
              className="flex flex-col h-14 w-14 items-center justify-center gap-0.5 rounded-full touch-manipulation active:scale-95 transition-transform"
              style={isAbundancia
                ? { background: 'rgba(255,185,50,0.15)', border: '1px solid rgba(255,185,50,0.35)' }
                : isDrJoe
                ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)' }
                : isSono
                ? { background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.28)' }
                : { background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }
              }
            >
              <SkipForward size={18} strokeWidth={1.5} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : 'rgba(255,255,255,0.85)' }} />
              <span className="text-[9px] font-bold leading-none" style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : isSono ? 'rgba(196,181,253,0.50)' : 'rgba(255,255,255,0.50)' }}>15s</span>
            </button>
          </motion.div>
        </div>

        {/* ── Bottom controls ── */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="w-full flex-shrink-0 px-5 md:px-8 md:max-w-4xl md:mx-auto"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Progress bar — unified for mobile; desktop uses its own below */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-10 text-center"
                style={{ color: isAbundancia ? 'rgba(255,185,50,0.75)' : isSono ? 'rgba(196,181,253,0.70)' : 'rgba(255,255,255,0.50)' }}
              >
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 relative h-1 rounded-full"
                style={{ background: isAbundancia ? 'rgba(255,185,50,0.2)' : isDrJoe ? 'rgba(59,130,246,0.2)' : isSono ? 'rgba(196,181,253,0.18)' : 'rgba(255,255,255,0.18)' }}
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
                  className="absolute w-full opacity-0 cursor-pointer z-10"
                  style={{ top: '-0.75rem', height: 'calc(100% + 1.5rem)', touchAction: 'none' }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                  style={{
                    width: `${(currentTime / (duration || 1)) * 100}%`,
                    background: isAbundancia
                      ? `linear-gradient(to right, ${GOLD_DARK}, ${GOLD})`
                      : isDrJoe
                      ? `linear-gradient(to right, ${DJ_BLUE_DARK}, ${DJ_BLUE})`
                      : isSono
                      ? `linear-gradient(to right, ${SONO_DARK}, ${SONO_LIGHT})`
                      : 'linear-gradient(to right, #A78BFA, #7C3AED)',
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow pointer-events-none"
                  style={{
                    left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)`,
                    background: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : '#FFFFFF',
                  }}
                />
              </div>
              <span
                className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-10 text-center"
                style={{ color: isAbundancia ? 'rgba(255,185,50,0.45)' : isSono ? 'rgba(196,181,253,0.40)' : 'rgba(255,255,255,0.32)' }}
              >
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Mobile secondary controls */}
          <div className="md:hidden flex items-center justify-between gap-3" ref={volumePopoverRef}>
            {/* Background sound chip */}
            <button
              onClick={handleOpenBackgroundModal}
              aria-label={`Sons de fundo: ${selectedBackgroundSound?.title ?? 'Nenhum'}`}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl touch-manipulation active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            >
              <Music size={15} strokeWidth={2} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : 'rgba(255,255,255,0.65)', flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-wide leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Sons de fundo
                </span>
                <span className="text-xs font-bold leading-tight truncate max-w-[100px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  {selectedBackgroundSound?.title || 'Nenhum'}
                </span>
              </div>
            </button>

            {/* Favorite — hidden for sono guest (no account to save to) */}
            {!sonoGuestMode && (
              <button
                onClick={handleFavoriteToggle}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={isFavorite}
                className="flex items-center justify-center w-11 h-11 rounded-xl touch-manipulation active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              >
                <Heart
                  size={18}
                  strokeWidth={2}
                  className={`transition-all ${isFavorite ? 'fill-red-400 text-red-400' : ''}`}
                  style={!isFavorite ? { color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : 'rgba(255,255,255,0.60)' } : undefined}
                />
              </button>
            )}

            {/* Volume button + popover */}
            <div className="relative">
              <button
                onClick={() => setShowVolumePopover(!showVolumePopover)}
                aria-label="Controle de volume"
                aria-expanded={showVolumePopover}
                className="flex items-center justify-center w-11 h-11 rounded-xl touch-manipulation active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
              >
                <Volume2 size={18} strokeWidth={2} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : 'rgba(255,255,255,0.60)' }} />
              </button>

              {/* Volume Popover Vertical */}
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
                    : isSono
                    ? { background: 'rgba(6,9,26,0.97)', border: '1px solid rgba(196,181,253,0.22)' }
                    : { background: 'rgba(9,9,15,0.92)', border: '1px solid rgba(255,255,255,0.12)' }
                  }
                >
                  <div className="flex flex-col items-center gap-3 h-[180px]">
                    <span className="text-xs font-bold" style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : '#FFFFFF' }}>
                      {Math.round(backgroundVolume)}%
                    </span>
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
                      <div
                        className="absolute inset-x-0 top-0 bottom-0 w-2 mx-auto rounded-full pointer-events-none"
                        style={{ background: isAbundancia ? 'rgba(255,185,50,0.2)' : isDrJoe ? 'rgba(59,130,246,0.2)' : isSono ? 'rgba(196,181,253,0.15)' : 'rgba(255,255,255,0.15)' }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
                          style={{
                            height: `${backgroundVolume}%`,
                            background: isAbundancia
                              ? `linear-gradient(to top, ${GOLD_DARK}, ${GOLD})`
                              : isDrJoe
                              ? `linear-gradient(to top, ${DJ_BLUE_DARK}, ${DJ_BLUE})`
                              : isSono
                              ? `linear-gradient(to top, ${SONO_DARK}, ${SONO_LIGHT})`
                              : 'linear-gradient(to top, #6D28D9, #A78BFA)',
                          }}
                        />
                      </div>
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md pointer-events-none transition-all duration-150"
                        style={{
                          bottom: `calc(${backgroundVolume}% - 10px)`,
                          background: '#FFFFFF',
                          border: `2px solid ${isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : '#A78BFA'}`,
                        }}
                      />
                    </div>
                    <Music size={14} strokeWidth={2} style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : isSono ? 'rgba(196,181,253,0.55)' : 'rgba(255,255,255,0.35)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop controls row */}
          <div
            className="hidden md:flex items-center justify-between gap-3 sm:gap-4 backdrop-blur-md rounded-full px-4 sm:px-6 py-3 sm:py-4 shadow-lg"
            style={isAbundancia
              ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(255,185,50,0.25)' }
              : isDrJoe
              ? { background: 'rgba(9,9,15,0.85)', border: '1px solid rgba(59,130,246,0.25)' }
              : isSono
              ? { background: 'rgba(6,9,26,0.90)', border: '1px solid rgba(196,181,253,0.20)' }
              : { background: 'rgba(9,9,15,0.78)', border: '1px solid rgba(255,255,255,0.12)' }
            }
          >
            <button
              onClick={handleOpenBackgroundModal}
              className="flex items-center gap-2 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Music size={18} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : 'rgba(255,255,255,0.65)', flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium uppercase leading-tight" style={{ color: isAbundancia ? 'rgba(255,185,50,0.6)' : isDrJoe ? 'rgba(59,130,246,0.7)' : isSono ? 'rgba(196,181,253,0.55)' : 'rgba(255,255,255,0.40)' }}>Sons de Fundo</span>
                <span className="text-xs font-semibold leading-tight truncate max-w-[100px]" style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_LIGHT : 'rgba(255,255,255,0.85)' }}>
                  {selectedBackgroundSound?.title || 'Nenhum'}
                </span>
              </div>
            </button>
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : isSono ? 'rgba(196,181,253,0.75)' : 'rgba(255,255,255,0.55)' }}>
              {formatTime(currentTime)}
            </span>
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
                  : isSono
                  ? `linear-gradient(to right, ${SONO_DARK} 0%, ${SONO_LIGHT} ${(currentTime / (duration || 1)) * 100}%, rgba(196,181,253,0.18) ${(currentTime / (duration || 1)) * 100}%, rgba(196,181,253,0.18) 100%)`
                  : `linear-gradient(to right, #A78BFA 0%, #7C3AED ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.15) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.15) 100%)`,
                borderRadius: '999px',
                touchAction: 'none',
              }}
            />
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: isAbundancia ? 'rgba(255,185,50,0.8)' : isDrJoe ? 'rgba(255,255,255,0.7)' : isSono ? 'rgba(196,181,253,0.45)' : 'rgba(255,255,255,0.35)' }}>
              {formatTime(duration)}
            </span>
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
                style={!isFavorite ? { color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : 'rgba(255,255,255,0.60)' } : undefined}
              />
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Volume2 size={16} style={{ color: isAbundancia ? GOLD : isDrJoe ? DJ_BLUE : isSono ? SONO_MID : 'rgba(255,255,255,0.55)' }} aria-hidden="true" />
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
                    : isSono
                    ? `linear-gradient(to right, ${SONO_DARK} 0%, ${SONO_LIGHT} ${meditationVolume}%, rgba(196,181,253,0.18) ${meditationVolume}%, rgba(196,181,253,0.18) 100%)`
                    : `linear-gradient(to right, #A78BFA 0%, #A78BFA ${meditationVolume}%, rgba(255,255,255,0.15) ${meditationVolume}%, rgba(255,255,255,0.15) 100%)`,
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

      {/* Background Sound Audio Element — sempre montado para preservar o GainNode do Web Audio API */}
      <audio
        ref={backgroundAudioRef}
        src={selectedBackgroundSound?.audioUrl || ''}
        loop
        preload={selectedBackgroundSound?.audioUrl ? 'auto' : 'none'}
      />

      {/* Background Sounds Modal */}
      <BackgroundSoundsModal
        isOpen={isBackgroundModalOpen}
        onClose={handleCloseBackgroundModal}
        selectedSoundId={selectedBackgroundSound?.id}
        onSelectSound={handleSelectBackgroundSound}
        backgroundVolume={backgroundVolume}
        onVolumeChange={setBackgroundVolume}
      />

      {/* Dica de tela bloqueada — aparece uma vez após o áudio iniciar */}
      {showLockTip && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md border"
            style={{
              background: 'rgba(10,10,20,0.82)',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <span className="text-xl select-none">🎧</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-white leading-tight">
                Pode bloquear a tela à vontade
              </span>
              <span className="text-xs text-white/60 mt-0.5 leading-snug">
                A voz e os sons de fundo continuam tocando
              </span>
            </div>
            <button
              onClick={() => setShowLockTip(false)}
              className="ml-1 flex-shrink-0 text-white/40 hover:text-white/70 transition-colors text-lg leading-none"
              aria-label="Fechar dica"
            >
              ×
            </button>
          </div>
        </div>
      )}

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

      {/* Ambient Screen (anti-abandonment) */}
      <MeditationAmbientScreen
        visible={showAmbient && !showCompletionScreen}
        elapsedSeconds={Math.floor(currentTime)}
        meditationTitle={meditationData.title}
        category={category}
        onDismiss={resetAmbientTimer}
      />

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
          isSonoGuestMode={sonoGuestMode}
          onCheckout={sonoGuestMode ? () => openSonoCheckout({ origin: 'meditation_completion_sono_guest' }) : undefined}
          sonoCheckoutLoading={sonoCheckoutLoading}
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
            // Guests see all next nights as locked (offer modal will open on return)
            const isLocked = sonoGuestMode || (next.night > 2 && !isVipUser);
            return {
              nightNumber: next.night,
              title: next.title,
              description: next.description,
              duration: next.duration,
              isLocked,
              onPlay: () => {
                if (isLocked) {
                  // Guest: return to sono page which will show the offer modal
                  if (sonoGuestMode) {
                    navigate(returnTo, { state: { returnFromMeditation: true } });
                  } else {
                    navigate('/app/subscription/demo');
                  }
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
