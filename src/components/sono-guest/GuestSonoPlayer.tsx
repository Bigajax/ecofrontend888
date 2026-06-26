import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Music, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
import { type Sound, getAllSounds } from '@/data/sounds';
import { useMediaSession } from '@/hooks/useMediaSession';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import {
  trackGuestAudio25,
  trackGuestAudio50,
  trackGuestAudio75,
  trackGuestAudioCompleted,
  trackSonoGuestOfferBannerShown,
  trackSonoGuestOfferBannerClicked,
} from '@/lib/mixpanelSonoGuestEvents';
import { SonoOfferBanner } from './SonoOfferBanner';
import { LS_KEYS } from './types';

const night1 = PROTOCOL_NIGHTS[0]!;

const SONO_LIGHT = '#C4B5FD';
const SONO_MID = '#A78BFA';
const SONO_DARK = '#7C3AED';

const fadeSlideUp = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/** Abaixo deste tempo ouvido, a saída é direta (sem assediar quem abriu sem querer). */
const EARLY_EXIT_MIN_SECONDS = 45;

/** Segundos de reprodução até o banner de oferta surgir (áudio ~8min → ~2,5min,
 *  bem antes dos 95% que hoje são o único caminho natural pra oferta). Tuning fácil
 *  aqui; rollback = passar offerBannerEnabled={false} no pai. */
export const OFFER_BANNER_AT_SECONDS = 150;

/** Marca, na sessão, que o banner já fez sua entrada (evento + chime). Ao voltar do
 *  checkout pra meditação (botão "<") o player remonta; sem isto o banner reapareceria
 *  expandido + tocaria o chime + duplicaria "Banner oferta exibido". */
const BANNER_SHOWN_KEY = 'eco.sono.offer_banner_shown';

interface GuestSonoPlayerProps {
  startTime: number;
  onComplete: () => void;
  onBack: () => void;
  /** Saída antecipada (Voltar após ouvir um trecho relevante, antes dos 95%):
   *  o pai abre a oferta das próximas noites em vez de só devolver à listagem. */
  onEarlyExit?: (progressPct: number) => void;
  /** Liga o banner de acesso antecipado à oferta (= guest não-pago). Default off. */
  offerBannerEnabled?: boolean;
  /** Clique no banner → o pai abre o checkout em 'offer' (mesma rota do onEarlyExit;
   *  o áudio só para aqui, no clique — ao surgir aos 150s ele segue tocando). */
  onOfferBanner?: () => void;
}

function saveProgress(time: number): void {
  try {
    localStorage.setItem(LS_KEYS.progress, JSON.stringify({ time, savedAt: Date.now() }));
  } catch { /* storage unavailable */ }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function GuestSonoPlayer({
  startTime,
  onComplete,
  onBack,
  onEarlyExit,
  offerBannerEnabled = false,
  onOfferBanner,
}: GuestSonoPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  // Web Audio: amplifica a voz 2x e controla o volume do fundo via GainNode
  // (funciona no iOS, ao contrário de audio.volume). Espelha MeditationPlayerPage.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const completedRef = useRef(false);
  const analyticsRef = useRef({ fired25: false, fired50: false, fired75: false, firedBanner150: false });
  const hasPlayedOnce = useRef(false);
  // Lido dentro do listener de timeupdate (cujo efeito não re-assina por isto):
  // ref evita closure obsoleta se isPaid/offerBannerEnabled mudar a meio da sessão.
  const offerBannerEnabledRef = useRef(offerBannerEnabled);
  offerBannerEnabledRef.current = offerBannerEnabled;
  // O banner já apareceu nesta sessão (antes deste mount)? Se sim, ao remontar (volta
  // do checkout) ele entra já minimizado, sem chime nem novo evento.
  const bannerShownBeforeMountRef = useRef(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(BANNER_SHOWN_KEY) === '1',
  );
  const lockTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumePopoverRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [showLockTip, setShowLockTip] = useState(false);
  const [showExitSheet, setShowExitSheet] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBackground, setSelectedBackground] = useState<Sound | null>(() => {
    const allSounds = getAllSounds();
    return allSounds.find(s => s.id === 'med_profunda') || null;
  });
  const [backgroundVolume, setBackgroundVolume] = useState(50);
  // Volume da voz (meditação). audio.volume aplica mesmo roteado pelo Web Audio (desktop);
  // no iOS (sem Web Audio) é ignorado — paridade com MeditationPlayerPage.
  const [meditationVolume, setMeditationVolume] = useState(60);

  // Chime suave ao surgir o banner de oferta (150s): a pessoa está de fone, então um
  // "ding-dong" calmo (duas senoides em quinta justa, decay longo, volume baixo)
  // chama a atenção sem quebrar o clima. Reusa o AudioContext do player (desktop) ou
  // cria um curtinho (iOS pode ficar suspenso → no-op silencioso). Só enfeite.
  const playOfferChime = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const owned = !audioCtxRef.current;
      const ctx: AudioContext = audioCtxRef.current ?? new Ctx();
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.value = 0.18; // baixinho — não compete com a voz
      master.connect(ctx.destination);

      // Duas notas em leve arpejo (A5 → E6): "ding-dong" gostoso.
      [{ freq: 880, at: 0 }, { freq: 1320, at: 0.16 }].forEach(({ freq, at }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(1, now + at + 0.03);   // attack curto
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + 1.3); // decay longo
        osc.connect(g).connect(master);
        osc.start(now + at);
        osc.stop(now + at + 1.4);
      });

      // Se criamos um ctx só pro chime, fecha depois (não interfere no áudio do player).
      if (owned) window.setTimeout(() => { void ctx.close(); }, 2200);
    } catch {
      // som é enfeite — silencia falhas
    }
  }, []);

  const scheduleLockTip = () => {
    lockTipTimerRef.current = setTimeout(() => {
      setShowLockTip(true);
      lockTipTimerRef.current = setTimeout(() => setShowLockTip(false), 5000);
    }, 3000);
  };

  // Amplifica a voz 2x e roteia o som de fundo pelo mesmo AudioContext para
  // controle de volume real. Espelha MeditationPlayerPage.initAudioGain.
  // Retorna Promise pra garantir o ctx running antes do play.
  const initAudioGain = async (): Promise<void> => {
    const el = audioRef.current;
    const bgEl = bgAudioRef.current;
    if (!el || audioCtxRef.current) return;

    // iOS Safari suspende o AudioContext ao bloquear a tela, parando todo áudio
    // roteado via createMediaElementSource. No iOS o <audio> nativo continua
    // tocando em background sem AudioContext — priorizamos isso sobre o ganho 2×.
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return;

    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      // fallback: sem amplificação
    }
  };

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    await initAudioGain();

    if (isPlaying) {
      audio.pause();
      bgAudioRef.current?.pause();
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        bgAudioRef.current?.play().catch(() => {});
        if (!hasPlayedOnce.current) {
          hasPlayedOnce.current = true;
          scheduleLockTip();
        }
        setIsPlaying(true);
      } catch {
        // autoplay blocked — user must tap play
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const handleSkip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  // Exit-intent: ao tentar voltar com um trecho relevante já ouvido (e antes dos
  // 95%), pausa e abre o sheet de saída em vez de devolver à listagem em silêncio.
  // Trecho curto / já concluído / sem handler → saída direta.
  const handleBackPress = () => {
    if (!onEarlyExit || completedRef.current || currentTime < EARLY_EXIT_MIN_SECONDS) {
      onBack();
      return;
    }
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
      bgAudioRef.current?.pause();
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
      setIsPlaying(false);
    }
    setShowExitSheet(true);
  };

  const handleResumeFromSheet = () => {
    setShowExitSheet(false);
    void handlePlayPause(); // estava pausado → retoma
  };

  const handleSeeOtherNights = () => {
    const pct = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    setShowExitSheet(false);
    onEarlyExit?.(pct);
  };

  // Clique no banner de oferta: "clicado" precede "Oferta vista". O pai abre o
  // checkout em 'offer' (mesma rota do onEarlyExit) — é lá que o áudio para. Salva o
  // ponto atual ANTES de desmontar pra o "<" do checkout retomar de onde parou.
  const handleOfferBannerClick = () => {
    if (audioRef.current && audioRef.current.currentTime > 0) saveProgress(audioRef.current.currentTime);
    trackSonoGuestOfferBannerClicked();
    onOfferBanner?.();
  };

  // Auto-play on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = startTime;

    const tryPlay = async () => {
      await initAudioGain();
      audio.play()
        .then(() => {
          if (!hasPlayedOnce.current) {
            hasPlayedOnce.current = true;
            scheduleLockTip();
          }
          setIsPlaying(true);
          bgAudioRef.current?.play().catch(() => {});
        })
        .catch(() => { /* autoplay blocked */ });
    };

    audio.addEventListener('canplay', tryPlay, { once: true });

    saveIntervalRef.current = setInterval(() => {
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
    }, 15_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && audio.currentTime > 0) {
        saveProgress(audio.currentTime);
      }
    };
    const onBeforeUnload = () => {
      if (audio.currentTime > 0) saveProgress(audio.currentTime);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      audio.removeEventListener('canplay', tryPlay);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (lockTipTimerRef.current) clearTimeout(lockTipTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // Cleanup Web Audio
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      gainRef.current = null;
      bgGainRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Duration + time updates + completion
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      const d = audio.duration;
      setCurrentTime(t);

      if (!d) return;
      const pct = (t / d) * 100;

      if (!analyticsRef.current.fired25 && pct >= 25) { analyticsRef.current.fired25 = true; trackGuestAudio25(); }
      if (!analyticsRef.current.fired50 && pct >= 50) { analyticsRef.current.fired50 = true; trackGuestAudio50(); }
      if (!analyticsRef.current.fired75 && pct >= 75) { analyticsRef.current.fired75 = true; trackGuestAudio75(); }

      // Banner de oferta aos 150s (segundos absolutos de reprodução, não %): surge
      // com o áudio seguindo — só lê currentTime, não pausa/reinicia. 1×/sessão.
      if (
        offerBannerEnabledRef.current &&
        !analyticsRef.current.firedBanner150 &&
        t >= OFFER_BANNER_AT_SECONDS
      ) {
        analyticsRef.current.firedBanner150 = true;
        setBannerVisible(true);
        // Evento + chime só na 1ª aparição da sessão (não ao remontar voltando do checkout).
        if (sessionStorage.getItem(BANNER_SHOWN_KEY) !== '1') {
          sessionStorage.setItem(BANNER_SHOWN_KEY, '1');
          playOfferChime();
          trackSonoGuestOfferBannerShown();
        }
      }

      if (!completedRef.current && d > 0 && (t / d) >= 0.95) {
        completedRef.current = true;
        saveProgress(0);
        trackGuestAudioCompleted();
        setTimeout(onComplete, 1000);
      }
    };

    const onEnded = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      setIsPlaying(false);
      saveProgress(0);
      trackGuestAudioCompleted();
      setTimeout(onComplete, 1000);
    };

    const onPause = () => { if (audio.currentTime > 0) saveProgress(audio.currentTime); };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, [onComplete, playOfferChime]);

  // Background audio sync with play state
  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    if (selectedBackground?.audioUrl && isPlaying) {
      bg.play().catch(() => {});
    } else {
      bg.pause();
    }
  }, [selectedBackground, isPlaying]);

  // Background audio reload when sound changes
  useEffect(() => {
    bgAudioRef.current?.load();
  }, [selectedBackground?.id]);

  // Background volume — via GainNode (funciona no iOS) ou audio.volume como fallback
  useEffect(() => {
    const softVolume = (backgroundVolume / 100) * 1.2;
    if (bgGainRef.current) {
      bgGainRef.current.gain.value = softVolume;
    } else if (bgAudioRef.current) {
      bgAudioRef.current.volume = Math.min(1, softVolume);
    }
  }, [backgroundVolume]);

  // Voice (meditation) volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = meditationVolume / 100;
  }, [meditationVolume]);

  // Restore audio on screen unlock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !isPlaying) return;
      if (audioRef.current?.paused) audioRef.current.play().catch(() => {});
      if (selectedBackground?.audioUrl && bgAudioRef.current?.paused) {
        bgAudioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, selectedBackground]);

  // Volume popover: close on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (volumePopoverRef.current && !volumePopoverRef.current.contains(e.target as Node)) {
        setShowVolumePopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowVolumePopover(false); };
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

  // Volume slider drag
  const handleVolumeSliderInteraction = (clientY: number) => {
    if (!volumeSliderRef.current) return;
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((rect.height - (clientY - rect.top)) / rect.height) * 100));
    const rounded = Math.round(pct);
    setBackgroundVolume(rounded);
    // Sync imediato: GainNode (iOS compatível) ou audio.volume como fallback
    const softVol = (rounded / 100) * 1.2;
    if (bgGainRef.current) {
      bgGainRef.current.gain.value = softVol;
    } else if (bgAudioRef.current) {
      bgAudioRef.current.volume = Math.max(0, Math.min(1, softVol));
    }
  };

  const handleVolumeSliderStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    if ('touches' in e) handleVolumeSliderInteraction(e.touches[0].clientY);
    else handleVolumeSliderInteraction(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: TouchEvent | MouseEvent) => {
      if ('touches' in e) { e.preventDefault(); handleVolumeSliderInteraction(e.touches[0].clientY); }
      else handleVolumeSliderInteraction((e as MouseEvent).clientY);
    };
    const handleEnd = () => setIsDragging(false);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  useMediaSession({
    title: night1.title,
    artist: 'ECO — Meditação',
    artwork: night1.imageUrl,
    audioRef,
    isPlaying,
    duration,
    currentTime,
    onPlay: () => { if (!isPlaying) handlePlayPause(); },
    onPause: () => { if (isPlaying) handlePlayPause(); },
    onSeekBackward: () => handleSkip(-15),
    onSeekForward: () => handleSkip(15),
  });

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const displayDuration = duration > 0 ? formatTime(duration) : night1.duration;

  return (
    <div
      className="relative font-primary overflow-hidden flex flex-col"
      style={{ height: '100dvh', touchAction: 'pan-y', backgroundColor: 'var(--bg-primary)' }}
    >
      {/* ── Background blurred image ── */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${night1.imageUrl})`,
          filter: 'blur(40px)',
          transform: 'scale(1.1)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(6,9,26,0.60) 0%, rgba(6,9,26,0.30) 45%, rgba(6,9,26,0.96) 100%)' }}
      />
      {/* Lunar glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '320px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.20) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Main layout ── */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 pb-3 flex-shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={handleBackPress}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            <ChevronLeft size={22} className="text-white" />
          </button>

          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: SONO_LIGHT }}>
            Noite 1 de 7
          </p>

          <div className="w-11" />
        </div>

        {/* Center: album art + title + controls */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-3">

          {/* Album art — square with rounded corners */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="overflow-hidden rounded-[2rem] shadow-2xl flex-shrink-0"
            style={{ width: 'min(62vw, 280px)', height: 'min(62vw, 280px)' }}
          >
            {night1.imageUrl ? (
              <img
                src={night1.imageUrl}
                alt={night1.title}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 35%' }}
              />
            ) : (
              <div className="w-full h-full" style={{ background: night1.gradient }} />
            )}
          </motion.div>

          {/* Title + duration + night dots */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-center px-4"
          >
            <h1
              className="text-xl sm:text-2xl font-bold leading-snug"
              style={{ color: '#FFFFFF', textShadow: '0 2px 20px rgba(124,58,237,0.55), 0 1px 8px rgba(0,0,0,0.50)' }}
            >
              {night1.title}
            </h1>
            <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(196,181,253,0.50)' }}>
              {displayDuration}
            </p>

            {/* Progress dots — 7 nights */}
            <div className="flex items-center gap-1.5 mt-3 justify-center">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === 0 ? '18px' : '6px',
                    height: '6px',
                    background: i === 0 ? SONO_MID : 'rgba(255,255,255,0.18)',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Playback controls: skip -15, play/pause, skip +15 */}
          <motion.div
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="flex items-center gap-7"
          >
            <button
              onClick={() => handleSkip(-15)}
              aria-label="Retroceder 15 segundos"
              className="flex flex-col h-14 w-14 items-center justify-center gap-0.5 rounded-full touch-manipulation active:scale-95 transition-transform"
              style={{ background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.28)' }}
            >
              <SkipBack size={18} strokeWidth={1.5} style={{ color: SONO_LIGHT }} />
              <span className="text-[9px] font-bold leading-none" style={{ color: 'rgba(196,181,253,0.50)' }}>15s</span>
            </button>

            <button
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pausar meditação' : 'Reproduzir meditação'}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full touch-manipulation active:scale-95 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${SONO_LIGHT} 0%, ${SONO_DARK} 100%)`,
                boxShadow: '0 8px 40px rgba(124,58,237,0.65)',
              }}
            >
              {isPlaying ? (
                <Pause size={30} strokeWidth={2} style={{ color: '#FFFFFF' }} />
              ) : (
                <Play size={30} strokeWidth={2} fill="currentColor" className="ml-0.5" style={{ color: '#FFFFFF' }} />
              )}
            </button>

            <button
              onClick={() => handleSkip(15)}
              aria-label="Avançar 15 segundos"
              className="flex flex-col h-14 w-14 items-center justify-center gap-0.5 rounded-full touch-manipulation active:scale-95 transition-transform"
              style={{ background: 'rgba(196,181,253,0.12)', border: '1px solid rgba(196,181,253,0.28)' }}
            >
              <SkipForward size={18} strokeWidth={1.5} style={{ color: SONO_LIGHT }} />
              <span className="text-[9px] font-bold leading-none" style={{ color: 'rgba(196,181,253,0.50)' }}>15s</span>
            </button>
          </motion.div>
        </div>

        {/* Banner de oferta (150s) — NO FLUXO, acima dos controles: nunca cobre
            play/pause nem a barra de progresso. Só guest não-pago (offerBannerEnabled). */}
        {offerBannerEnabled && bannerVisible && (
          <div className="w-full flex-shrink-0">
            <SonoOfferBanner onClick={handleOfferBannerClick} startMinimized={bannerShownBeforeMountRef.current} />
          </div>
        )}

        {/* ── Bottom controls ── */}
        <motion.div
          variants={fadeSlideUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="w-full flex-shrink-0 px-5 md:px-8 md:max-w-4xl md:mx-auto"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Progress bar with time — mobile */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-10 text-center"
                style={{ color: 'rgba(196,181,253,0.70)' }}
              >
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 relative h-1 rounded-full"
                style={{ background: 'rgba(196,181,253,0.18)' }}
              >
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  aria-label="Progresso da meditação"
                  aria-valuetext={`${formatTime(currentTime)} de ${displayDuration}`}
                  className="absolute w-full opacity-0 cursor-pointer z-10"
                  style={{ top: '-0.75rem', height: 'calc(100% + 1.5rem)', touchAction: 'none' }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                  style={{
                    width: `${(currentTime / (duration || 1)) * 100}%`,
                    background: `linear-gradient(to right, ${SONO_DARK}, ${SONO_LIGHT})`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow pointer-events-none"
                  style={{
                    left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)`,
                    background: SONO_LIGHT,
                  }}
                />
              </div>
              <span
                className="text-[11px] font-semibold tabular-nums flex-shrink-0 w-10 text-center"
                style={{ color: 'rgba(196,181,253,0.40)' }}
              >
                {displayDuration}
              </span>
            </div>
          </div>

          {/* Secondary controls — mobile: background sounds + background volume */}
          <div className="md:hidden flex items-center justify-between gap-3" ref={volumePopoverRef}>
            <button
              onClick={() => setShowBackgroundModal(true)}
              aria-label={`Sons de fundo: ${selectedBackground?.title ?? 'Nenhum'}`}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl touch-manipulation active:scale-95 transition-transform"
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <Music size={15} strokeWidth={2} style={{ color: SONO_MID, flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-wide leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Sons de fundo
                </span>
                <span className="text-xs font-bold leading-tight truncate max-w-[100px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  {selectedBackground?.title || 'Nenhum'}
                </span>
              </div>
            </button>

            {/* Volume popover */}
            <div className="relative">
              <button
                onClick={() => setShowVolumePopover(v => !v)}
                aria-label="Controle de volume"
                aria-expanded={showVolumePopover}
                className="flex items-center justify-center w-11 h-11 rounded-xl touch-manipulation active:scale-95 transition-transform"
                style={{
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                <Volume2 size={18} strokeWidth={2} style={{ color: SONO_MID }} />
              </button>

              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 transition-all duration-300 ease-out ${
                  showVolumePopover
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
              >
                <div
                  className="backdrop-blur-lg rounded-2xl px-3 py-4 shadow-2xl"
                  style={{ background: 'rgba(6,9,26,0.97)', border: '1px solid rgba(196,181,253,0.22)' }}
                >
                  <div className="flex flex-col items-center gap-3 h-[180px]">
                    <span className="text-xs font-bold" style={{ color: SONO_LIGHT }}>
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
                        style={{ background: 'rgba(196,181,253,0.15)' }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
                          style={{
                            height: `${backgroundVolume}%`,
                            background: `linear-gradient(to top, ${SONO_DARK}, ${SONO_LIGHT})`,
                          }}
                        />
                      </div>
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-md pointer-events-none transition-all duration-150"
                        style={{
                          bottom: `calc(${backgroundVolume}% - 10px)`,
                          background: '#FFFFFF',
                          border: `2px solid ${SONO_MID}`,
                        }}
                      />
                    </div>
                    <Music size={14} strokeWidth={2} style={{ color: 'rgba(196,181,253,0.55)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Desktop controls row — espelha MeditationPlayerPage (voz + fundo) ── */}
          <div
            className="hidden md:flex items-center justify-between gap-3 sm:gap-4 backdrop-blur-md rounded-full px-4 sm:px-6 py-3 sm:py-4 shadow-lg"
            style={{ background: 'rgba(6,9,26,0.90)', border: '1px solid rgba(196,181,253,0.20)' }}
          >
            <button
              onClick={() => setShowBackgroundModal(true)}
              className="flex items-center gap-2 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Music size={18} style={{ color: SONO_MID, flexShrink: 0 }} />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-[10px] font-medium uppercase leading-tight" style={{ color: 'rgba(196,181,253,0.55)' }}>Sons de Fundo</span>
                <span className="text-xs font-semibold leading-tight truncate max-w-[100px]" style={{ color: SONO_LIGHT }}>
                  {selectedBackground?.title || 'Nenhum'}
                </span>
              </div>
            </button>
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: 'rgba(196,181,253,0.75)' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleProgressChange}
              aria-label="Progresso da meditação"
              aria-valuetext={`${formatTime(currentTime)} de ${displayDuration}`}
              className="flex-1 cursor-pointer meditation-range-slider"
              style={{
                height: '4px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, ${SONO_DARK} 0%, ${SONO_LIGHT} ${(currentTime / (duration || 1)) * 100}%, rgba(196,181,253,0.18) ${(currentTime / (duration || 1)) * 100}%, rgba(196,181,253,0.18) 100%)`,
                borderRadius: '999px',
                touchAction: 'none',
              }}
            />
            <span className="text-xs sm:text-sm font-medium flex-shrink-0" style={{ color: 'rgba(196,181,253,0.45)' }}>
              {displayDuration}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Volume2 size={16} style={{ color: SONO_MID }} aria-hidden="true" />
              <input
                type="range"
                min="0"
                max="100"
                value={meditationVolume}
                onChange={(e) => setMeditationVolume(parseFloat(e.target.value))}
                aria-label="Volume da voz"
                aria-valuetext={`${meditationVolume}%`}
                className="w-20 sm:w-24 cursor-pointer meditation-range-slider"
                style={{
                  height: '4px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: `linear-gradient(to right, ${SONO_DARK} 0%, ${SONO_LIGHT} ${meditationVolume}%, rgba(196,181,253,0.18) ${meditationVolume}%, rgba(196,181,253,0.18) 100%)`,
                  borderRadius: '999px',
                  touchAction: 'none',
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hidden audio elements */}
      <audio ref={audioRef} src={night1.audioUrl} preload="auto" />
      <audio
        ref={bgAudioRef}
        src={selectedBackground?.audioUrl || ''}
        loop
        preload={selectedBackground?.audioUrl ? 'auto' : 'none'}
      />

      {/* Background Sounds Modal */}
      <BackgroundSoundsModal
        isOpen={showBackgroundModal}
        onClose={() => setShowBackgroundModal(false)}
        selectedSoundId={selectedBackground?.id}
        onSelectSound={(sound) => setSelectedBackground(sound)}
        backgroundVolume={backgroundVolume}
        onVolumeChange={setBackgroundVolume}
      />

      {/* Exit-intent sheet — saída antecipada da Noite 1 */}
      {showExitSheet && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(4,6,15,0.72)', backdropFilter: 'blur(4px)' }}
            onClick={handleResumeFromSheet}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            role="dialog"
            aria-label="Sair da Noite 1"
            className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pb-8 pt-7 text-center"
            style={{
              background: 'linear-gradient(180deg, #0B0F22 0%, #070A18 100%)',
              border: '1px solid rgba(196,181,253,0.18)',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
            }}
          >
            <h2
              className="font-display text-[22px] font-bold leading-snug text-white"
              style={{ textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}
            >
              Quer mesmo sair?
            </h2>
            <p className="mb-7 mt-2 text-[14px] leading-snug text-white/50">
              Você está no meio da Noite 1. Tem mais 6 noites te esperando — cada
              uma solta uma camada diferente do sono.
            </p>
            <button
              onClick={handleSeeOtherNights}
              className="mb-3 w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${SONO_LIGHT} 0%, ${SONO_DARK} 100%)`,
                boxShadow: '0 10px 36px rgba(124,58,237,0.5)',
              }}
            >
              Ver minhas próximas noites
            </button>
            <button
              onClick={handleResumeFromSheet}
              className="w-full rounded-full py-3.5 text-[14px] font-semibold text-white/80 transition-all hover:scale-[1.01] active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              Continuar ouvindo
            </button>
            <button
              onClick={onBack}
              className="mx-auto mt-4 block text-[12px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Sair mesmo assim
            </button>
          </motion.div>
        </div>
      )}

      {/* Lock tip toast */}
      {showLockTip && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-slide-down">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md border"
            style={{ background: 'rgba(10,10,20,0.82)', borderColor: 'rgba(255,255,255,0.12)' }}
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
    </div>
  );
}
