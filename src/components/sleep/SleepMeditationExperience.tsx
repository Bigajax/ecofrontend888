import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft,
  Moon, Wind, TrendingUp, Loader2,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSonoEntitlement } from '@/hooks/useSonoEntitlement';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';
import {
  trackGuestUnlockClicked,
  trackSonoGuestNight1Completed,
  trackSonoGuestNight1Started,
  trackSonoGuestPageViewed,
  trackSonoGuestAppInviteClicked,
  trackSonoGuestRegisterGateShown,
  trackSonoGuestEarlyExit,
} from '@/lib/mixpanelSonoGuestEvents';
import { registerFunilSono } from '@/lib/mixpanelAssinarFunnel';
import { fbqCustom } from '@/lib/fbpixel';
import { GuestSonoPlayer } from '@/components/sono-guest/GuestSonoPlayer';
import { LS_KEYS } from '@/components/sono-guest/types';
import type { SonoOfferVariant } from '@/components/sono/SonoPostExperienceModal';
import { SonoPostExperienceModal } from '@/components/sono/SonoPostExperienceModal';
import { SonoInlineCheckout } from '@/components/sono/SonoInlineCheckout';
import { SonoInlineSignup } from '@/components/sono/SonoInlineSignup';
import { SonoExperienceHero } from '@/components/sono/SonoExperienceHero';
import type { SonoCheckoutStep } from '@/components/sono/useSonoCheckoutState';
import { SleepProtocolOfferCard } from '@/components/sono/SleepProtocolOfferCard';

// ── Design tokens — sleep palette ─────────────────────────────────────────────
// Warm amber (candlelight) → primary CTA
// Steel blue-gray          → labels, secondary accents
// Ivory/warm white         → headline italic highlight
// Emerald green            → completed/success states
const T = {
  amber:       '#C9922A',
  amberLight:  '#D4A847',
  amberGlow:   'rgba(212,168,71,',
  ivory:       '#F0E3C0',
  steel:       'rgba(148,163,184,',   // slate-400 base
  steelSolid:  '#94A3B8',
  bg0:         '#060609',
  bg1:         '#08080C',
  bg2:         '#0B0A10',
};

// Paid/VIP: full access. Others: only free nights (night 1).
function isNightAccessible(night: ProtocolNight, isPaid: boolean, isVip: boolean): boolean {
  if (isVip || isPaid) return true;
  return night.isFree;
}

const SUBSCRIPTION_PATH = '/app/subscription/demo';

interface GuestProgressData {
  time: number;
  savedAt: number;
}

function getSavedGuestNight1Progress(): number | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.progress);
    if (!raw) return null;
    const data = JSON.parse(raw) as GuestProgressData;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.savedAt > sevenDays) {
      localStorage.removeItem(LS_KEYS.progress);
      return null;
    }
    return data.time > 10 ? data.time : null;
  } catch {
    return null;
  }
}

function markGuestNight1Completed(): void {
  localStorage.setItem(LS_KEYS.completed, 'true');
  localStorage.removeItem(LS_KEYS.progress);
}

/**
 * Meta Pixel (custom) "ExperienciaCompleta" — disparo único por convidado. A
 * Noite 1 pode concluir por dois caminhos (player inline ou retorno do
 * meditation-player), então guardamos uma flag para não duplicar o evento.
 */
function trackExperienciaCompletaOnce(guestId: string, source: string): void {
  const key = `eco.sono.experiencia_completa_tracked.${guestId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, 'true');
  } catch {
    // localStorage indisponível — dispara mesmo assim (melhor que perder o sinal)
  }
  fbqCustom('ExperienciaCompleta', { content_name: 'Protocolo do Sono', source });
}

interface SleepMeditationExperienceProps {
  mode: 'app' | 'guest';
}

export function SleepMeditationExperience({ mode }: SleepMeditationExperienceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isVipUser, isPremiumUser, isTrialActive } = useAuth();
  const { hasAccess: hasSonoEntitlement } = useSonoEntitlement();
  // Protocolo Sono agora é premium. CTA → trial; entitlement legado mantém acesso (grandfather).
  const checkoutLoading = false;

  // Checkout inline do funil guest (modelo C): em vez de pular pro /assinar azul,
  // abrimos a oferta + cadastro + cartão dentro do tema escuro do sono. `null` =
  // fechado; um passo = abrir nele. Fora do guest (/app/meditacoes-sono) mantém o
  // /assinar. `justSubscribed` destrava as noites na hora (unlock otimista), antes
  // do webhook refletir no entitlement.
  const [checkoutEntry, setCheckoutEntry] = useState<SonoCheckoutStep | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);
  // Gate de cadastro na entrada (modelo porta-de-entrada): guest deslogado tem que
  // criar conta ao clicar "Ouvir a Noite 1" — captura o lead antes do conteúdo. O
  // `?play=night1` na URL persiste a intenção de retomar a Noite 1 pelo remount que
  // o RootProviders dispara ao trocar guest→userId real. Ver plano do funil.
  const [registerGateOpen, setRegisterGateOpen] = useState(false);
  const night1ResumeHandledRef = useRef(false);
  const openCheckout = useCallback((opts?: { origin?: string }) => {
    void opts;
    if (mode === 'guest') {
      setCheckoutEntry('offer');
      return;
    }
    navigate('/assinar?step=plan&plan=monthly&from=sono_trial');
  }, [mode, navigate]);
  const isPaid =
    isVipUser || isPremiumUser || isTrialActive || hasSonoEntitlement || justSubscribed;
  const uid = user?.id || 'guest';

  // ── Mode: explicit via prop ──────────────────────────────────
  const source = searchParams.get('source') || '';
  const isGuestSono = mode === 'guest';

  const guestId = useMemo(() => {
    const fromUrl = searchParams.get('guest_id');
    const fromStorage = localStorage.getItem('eco_guest_id');
    if (fromUrl) { localStorage.setItem('eco_guest_id', fromUrl); return fromUrl; }
    if (fromStorage) return fromStorage;
    const uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
    const newId = `guest_${uuid}`;
    localStorage.setItem('eco_guest_id', newId);
    return newId;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const heroSubtitle: string | null = (() => {
    if (!isGuestSono) return null;
    const q5 = sessionStorage.getItem('eco.sono.q5_answer') || '';
    if (q5.includes('desligar minha mente')) return '8 minutos que ensinam sua mente a soltar.';
    if (q5.includes('energia real')) return '8 minutos. Sono profundo. Energia real amanhã.';
    if (q5.includes('ansiedade')) return '8 minutos para dissolver a ansiedade noturna.';
    return null;
  })();

  useEffect(() => {
    if (!isGuestSono) return;
    sessionStorage.setItem('eco.sono.guest_id', guestId);
    sessionStorage.setItem('eco.sono.source', source || 'sono_paid_traffic');
    const resolvedSource = source || 'sono_paid_traffic';
    const track = () => {
      // Evento canônico do passo "experiência vista" — ver mixpanelSonoGuestEvents
      // (helper padronizado). O 'Experiência vista' inline foi removido (duplicava
      // este passo no funil).
      trackSonoGuestPageViewed({ source: resolvedSource, guestId });
      // Meta Pixel (custom): convidado entrou na experiência do sono.
      fbqCustom('IniciouExperiencia', { content_name: 'Protocolo do Sono', source: resolvedSource });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(track);
    else setTimeout(track, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Night completion state ─────────────────────────────────────
  const [completedNights, setCompletedNights] = useState<Set<number>>(() => {
    const raw = localStorage.getItem(`eco.sono.protocol.v1.${uid}`);
    if (raw) {
      try { return new Set<number>(JSON.parse(raw).completedNights || []); }
      catch { return new Set<number>(); }
    }
    return new Set<number>();
  });

  const [showCompletion, setShowCompletion] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showStartNightPrompt, setShowStartNightPrompt] = useState(false);
  const [offerVariant, setOfferVariant] = useState<SonoOfferVariant>('locked_night');
  const [guestPlayback, setGuestPlayback] = useState<{ startTime: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(`eco.sono.protocol.v1.${uid}`, JSON.stringify({
      completedNights: [...completedNights],
      lastActive: new Date().toISOString(),
    }));
  }, [completedNights, uid]);

  useEffect(() => {
    if (!location.state?.returnFromMeditation) return;
    const lastPlayedNight = sessionStorage.getItem('eco.sono.lastPlayedNight');
    if (lastPlayedNight) {
      const nightNum = parseInt(lastPlayedNight);
      if (localStorage.getItem(`eco.meditation.completed80pct.night_${nightNum}`) === 'true') {
        setCompletedNights(prev => {
          const next = new Set([...prev, nightNum]);
          if (next.size === 7) setShowCompletion(true);
          return next;
        });
        if (isGuestSono && nightNum === 1) {
          const offerKey = `eco.sono.offer_modal_shown.${guestId}`;
          if (!localStorage.getItem(offerKey)) {
            setCheckoutEntry('reflection');
            localStorage.setItem(offerKey, 'true');
            trackSonoGuestNight1Completed({ source: source || 'sono_paid_traffic', guestId });
            trackExperienciaCompletaOnce(guestId, source || 'sono_paid_traffic');
          }
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Urgency countdown — guest funnel only ──────────────────────
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!isGuestSono) return 0;
    const stored = sessionStorage.getItem('eco.sono.offer_expires');
    if (stored) return Math.max(0, parseInt(stored) - Date.now());
    const expires = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem('eco.sono.offer_expires', String(expires));
    return 15 * 60 * 1000;
  });

  useEffect(() => {
    if (!isGuestSono) return;
    const id = setInterval(() => {
      const stored = sessionStorage.getItem('eco.sono.offer_expires');
      setTimeLeft(stored ? Math.max(0, parseInt(stored) - Date.now()) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [isGuestSono]);

  const formatCountdown = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const completedCount = completedNights.size;
  const pct = Math.round((completedCount / 7) * 100);
  const nextNight = Math.min(completedCount + 1, 7);
  const night1IsCompleted = completedNights.has(1);

  // ── Navigation ─────────────────────────────────────────────────
  const startGuestNight1Playback = () => {
    sessionStorage.setItem('eco.sono.lastPlayedNight', '1');
    sessionStorage.setItem('eco.sono.guest_id', guestId);
    sessionStorage.setItem('eco.sono.source', source || 'sono_paid_traffic');
    trackSonoGuestNight1Started({ source: source || 'sono_paid_traffic', guestId });
    setGuestPlayback({
      startTime: getSavedGuestNight1Progress() ?? 0,
    });
  };

  // Abre o gate de cadastro (porta de entrada). Registra o funnel_source ANTES dos
  // eventos de cadastro (que rodam dentro do SonoInlineSignup) para que eles herdem
  // a atribuição, e marca ?play=night1 para retomar a Noite 1 após o remount.
  const openRegisterGate = () => {
    registerFunilSono('sono_experiencia');
    trackSonoGuestRegisterGateShown({ source: source || 'sono_paid_traffic', guestId });
    const p = new URLSearchParams(searchParams);
    p.set('play', 'night1');
    setSearchParams(p, { replace: true });
    setRegisterGateOpen(true);
  };

  const closeRegisterGate = () => {
    setRegisterGateOpen(false);
    const p = new URLSearchParams(searchParams);
    p.delete('play');
    setSearchParams(p, { replace: true });
  };

  // Sucesso do cadastro sem redirect: só fecha o gate. A Noite 1 é iniciada pelo
  // efeito de resume abaixo (keyed em `user`), que cobre tanto o remount do
  // RootProviders quanto a atualização in-place do user — e preserva o ?play=night1
  // até ser consumido lá (limpá-lo aqui correria o risco de o remount descartar a
  // reprodução antes de retomá-la).
  const resumeNight1FromGate = () => {
    setRegisterGateOpen(false);
  };

  // Resume da Noite 1 quando a sessão chega (remount do RootProviders guest→userId
  // OU atualização in-place do user): se estamos autenticados com ?play=night1 e a
  // Noite 1 ainda não foi concluída, toca direto e consome o param.
  useEffect(() => {
    if (!isGuestSono) return;
    if (searchParams.get('play') !== 'night1') return;
    if (!user) return; // só retoma autenticado (guest ainda no gate)
    if (night1ResumeHandledRef.current) return;

    const p = new URLSearchParams(searchParams);
    p.delete('play');
    setSearchParams(p, { replace: true });

    if (night1IsCompleted) return; // já concluiu — não força replay
    night1ResumeHandledRef.current = true;
    startGuestNight1Playback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isGuestSono, night1IsCompleted, searchParams]);

  // Saída antecipada da Noite 1 (sheet do player → "ver outras noites"): abre a
  // oferta direto, sem a reflexão (que afirmaria "Noite 1 concluída").
  const handleGuestNight1EarlyExit = (progressPct: number) => {
    trackSonoGuestEarlyExit({ source: source || 'sono_paid_traffic', guestId, progressPct });
    setGuestPlayback(null);
    setCheckoutEntry('offer');
  };

  const handleGuestNight1Complete = useCallback(() => {
    markGuestNight1Completed();
    setCompletedNights(prev => new Set([...prev, 1]));
    setGuestPlayback(null);
    setCheckoutEntry('reflection');
    localStorage.setItem(`eco.sono.offer_modal_shown.${guestId}`, 'true');
    trackSonoGuestNight1Completed({ source: source || 'sono_paid_traffic', guestId });
    trackExperienciaCompletaOnce(guestId, source || 'sono_paid_traffic');
  }, [guestId, source]);

  const handleNightClick = (night: ProtocolNight) => {
    const accessible = isNightAccessible(night, isPaid, isVipUser);
    if (!accessible) {
      trackGuestUnlockClicked(night.id);
      if (!night1IsCompleted) {
        setShowStartNightPrompt(true);
        return;
      }
      setOfferVariant('locked_night');
      setShowOfferModal(true);
      return;
    }
    if (!night.hasAudio || !night.audioUrl) return;

    if (isGuestSono && night.night === 1) {
      // Porta de entrada: guest deslogado precisa criar conta antes da Noite 1.
      if (!user) { openRegisterGate(); return; }
      startGuestNight1Playback();
      return;
    }

    if (!user) {
      setOfferVariant(night1IsCompleted ? 'locked_night' : 'final');
      if (!night1IsCompleted) setShowStartNightPrompt(true);
      else setShowOfferModal(true);
      return;
    }

    sessionStorage.setItem('eco.sono.lastPlayedNight', String(night.night));

    const returnTo = isGuestSono ? '/sono/experiencia' : '/app/meditacoes-sono';

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: night.id, title: night.title, duration: night.duration,
          audioUrl: night.audioUrl,
          imageUrl: night.imageUrl ?? '/images/meditacoes-sono-hero.webp',
          backgroundMusic: 'Sono', gradient: night.gradient,
          category: 'sono', isPremium: false,
        },
        returnTo,
        sonoGuestMode: isGuestSono,
      },
    });
  };

  const handleHeroButtonClick = () => {
    if (completedCount === 7) { setShowCompletion(true); return; }
    const targetNight = isPaid ? PROTOCOL_NIGHTS[nextNight - 1] : PROTOCOL_NIGHTS[0];
    if (targetNight) handleNightClick(targetNight);
  };

  const handleStartNight1 = () => {
    const night = PROTOCOL_NIGHTS[0];
    if (night) handleNightClick(night);
  };

  // ── Derived labels ─────────────────────────────────────────────
  const pillLabel = isPaid
    ? 'Protocolo Sono Profundo • Acesso completo'
    : 'Protocolo Sono Profundo • Noite 1 gratuita';

  const heroCTALabel = checkoutLoading
    ? 'Carregando...'
    : completedCount === 7
      ? 'Protocolo Concluído'
      : isPaid
        ? completedCount === 0 ? 'Iniciar Noite 1' : `Continuar — Noite ${nextNight}`
        : 'Ouvir a Noite 1';

  // ── Completion Screen ──────────────────────────────────────────
  if (showCompletion) {
    return (
      <MotionConfig reducedMotion="user">
      <div
        className="font-primary flex flex-col items-center justify-center px-6 text-center"
        style={{
          minHeight: '100dvh',
          background: `linear-gradient(160deg, ${T.bg0} 0%, ${T.bg1} 40%, ${T.bg2} 100%)`,
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        >
          <div className="text-6xl mb-6">🌙</div>
          <h1 className="font-display text-[28px] font-bold text-white sm:text-[32px] mb-4 leading-tight">
            Protocolo Concluído
          </h1>
          <p className="text-[15px] text-white/55 leading-relaxed mb-8">
            Você recondicionou seu sistema para o descanso.<br />
            Agora você possui ferramentas para dormir sem depender do áudio.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/app')}
              className="w-full rounded-full px-6 py-3.5 text-[15px] font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                color: '#0D1120',
                boxShadow: `0 6px 24px ${T.amberGlow}0.30)`,
              }}
            >
              Explorar outros programas
            </button>
            <button
              onClick={() => navigate(SUBSCRIPTION_PATH)}
              className="w-full rounded-full border px-6 py-3.5 text-[15px] font-semibold text-white/70 transition-all hover:text-white active:scale-95"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}
            >
              Conhecer o Plano Completo
            </button>
          </div>
          <button
            onClick={() => setShowCompletion(false)}
            className="mt-6 text-[12px] text-white/30 underline underline-offset-2"
          >
            Ver protocolo novamente
          </button>
        </motion.div>
      </div>
      </MotionConfig>
    );
  }

  // ── Main Page ──────────────────────────────────────────────────
  return (
    <MotionConfig reducedMotion="user">
      {guestPlayback ? (
        <GuestSonoPlayer
          startTime={guestPlayback.startTime}
          onComplete={handleGuestNight1Complete}
          onBack={() => setGuestPlayback(null)}
          onEarlyExit={handleGuestNight1EarlyExit}
        />
      ) : (
      <div
        className="font-primary"
        style={{
          minHeight: '100dvh',
          background: `linear-gradient(180deg, ${T.bg0} 0%, ${T.bg0} 38%, ${T.bg1} 55%, #09090E 75%, ${T.bg2} 100%)`,
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        {user && !isGuestSono && <HomeHeader />}

        <main className={isGuestSono ? 'pb-24' : 'page-with-nav pb-24'}>

        {/* ══════════════════════════════════════════════════════════
            HERO — guest (/sono/experiencia) usa o "convite" puro;
            logado (/app/meditacoes-sono) mantém o hero de protocolo.
            ══════════════════════════════════════════════════════════ */}
        {isGuestSono ? (
          <SonoExperienceHero
            onListen={handleHeroButtonClick}
            onBack={() => navigate(-1)}
            onExploreApp={
              user && !isPaid
                ? () => {
                    trackSonoGuestAppInviteClicked({
                      source: source || 'sono_paid_traffic',
                      guestId,
                      context: 'experiencia_atalho',
                    });
                    navigate('/app');
                  }
                : undefined
            }
          />
        ) : (
        <section
          className="relative flex min-h-[720px] flex-col overflow-hidden sm:min-h-[800px]"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Back button */}
          {(!user || isGuestSono) && (
            <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:text-white/80"
                style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Background image — slow breathing drift */}
          <motion.div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: 'url("/images/meditacoes-sono-hero.webp")', backgroundPosition: 'center 30%' }}
            initial={{ scale: 1.06 }}
            animate={{ scale: [1.06, 1.12, 1.06] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Vignette — deeper at bottom, lighter at top so image breathes */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(6,6,9,0.18) 0%, rgba(6,6,9,0.06) 22%, rgba(6,6,9,0.55) 58%, ${T.bg0} 100%)` }}
          />
          {/* Subtle warm glow at bottom — candlelight, not purple */}
          <div
            className="pointer-events-none absolute"
            style={{
              bottom: '8%', left: '50%', transform: 'translateX(-50%)',
              width: '280px', height: '180px', borderRadius: '50%',
              background: `radial-gradient(ellipse, ${T.amberGlow}0.07) 0%, transparent 70%)`,
              filter: 'blur(50px)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-32 pb-20 text-center sm:max-w-md sm:px-8 sm:pt-40">

            {/* Pill — glass, no color tint */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: T.amberLight, boxShadow: `0 0 5px ${T.amberGlow}0.60)` }}
              />
              {pillLabel}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
              className="mt-5 font-display font-bold text-white leading-[1.06]"
              style={{ fontSize: 'clamp(2.1rem, 7vw, 3.1rem)', textShadow: '0 4px 40px rgba(0,0,0,0.70), 0 1px 6px rgba(0,0,0,0.50)' }}
            >
              Você está cansado.<br />
              <em style={{ color: T.ivory, fontStyle: 'italic' }}>Sua mente não.</em>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mt-4 text-[15px] leading-relaxed font-light"
              style={{ color: 'rgba(255,255,255,0.46)' }}
            >
              {heroSubtitle ?? <>Em sete noites,<br />a mente aprende a soltar.</>}
            </motion.p>

            {/* Stars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-5 flex items-center gap-2.5"
            >
              <span style={{ color: T.amberLight, fontSize: '14px', letterSpacing: '2px' }}>★★★★★</span>
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <strong style={{ color: 'rgba(255,255,255,0.82)', fontWeight: 700 }}>4,9</strong> · 846 pessoas dormindo melhor
              </span>
            </motion.div>

            {/* Progress badge — paid users with progress */}
            {isPaid && completedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-6 flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)' }}
              >
                <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  {completedCount === 7 ? '✓ Protocolo concluído' : `${completedCount} de 7 noites concluídas`}
                </span>
              </motion.div>
            )}

            {/* CTA — amber-gold, reads "candlelight" not "app button" */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.38, ease: 'easeOut' }}
              onClick={handleHeroButtonClick}
              disabled={checkoutLoading}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70"
              style={{
                background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                color: '#0D1120',
                boxShadow: `0 10px 36px ${T.amberGlow}0.28), 0 2px 8px rgba(0,0,0,0.40)`,
              }}
            >
              {checkoutLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" fill="currentColor" />
              }
              {heroCTALabel}
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.48 }}
              onClick={() => document.getElementById('sono-protocolo-completo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-3 w-full rounded-full py-3 text-[13px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.13)',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              Conhecer as próximas noites
            </motion.button>

          </div>
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            NIGHT 1 — cinematic full-bleed card
            ══════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            onClick={() => { const n = PROTOCOL_NIGHTS[0]; if (n) handleNightClick(n); }}
            className="group relative overflow-hidden rounded-[28px] cursor-pointer"
            style={{ height: '300px' }}
          >
            {PROTOCOL_NIGHTS[0]?.imageUrl ? (
              <img
                src={PROTOCOL_NIGHTS[0].imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="absolute inset-0" style={{ background: PROTOCOL_NIGHTS[0]?.gradient }} />
            )}
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, rgba(6,6,9,0.04) 0%, rgba(6,6,9,0.20) 35%, rgba(6,6,9,0.96) 88%)` }}
            />

            {/* Top row */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{
                  background: 'rgba(6,6,9,0.60)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: T.amberLight }} />
                Noite 1 de 7
              </span>
              {!isPaid && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                    color: '#0D1120',
                    boxShadow: `0 4px 14px ${T.amberGlow}0.35)`,
                  }}
                >
                  ★ Grátis
                </div>
              )}
              {isPaid && night1IsCompleted && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                  style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }}
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  Concluída
                </div>
              )}
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6">
              <h3
                className="font-display text-[21px] font-bold text-white leading-snug mb-1"
                style={{ textShadow: '0 2px 16px rgba(0,0,0,0.65)' }}
              >
                {PROTOCOL_NIGHTS[0]?.title ?? 'Desligando o Estado de Alerta'}
              </h3>
              <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.44)' }}>
                {PROTOCOL_NIGHTS[0]?.description ?? 'Ensina seu sistema nervoso a reconhecer o sinal para dormir.'}
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={
                    isPaid && night1IsCompleted
                      ? { background: 'rgba(52,211,153,0.22)', boxShadow: '0 6px 24px rgba(52,211,153,0.28)', border: '1px solid rgba(52,211,153,0.40)' }
                      : {
                          background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                          boxShadow: `0 6px 24px ${T.amberGlow}0.40)`,
                        }
                  }
                >
                  {isPaid && night1IsCompleted
                    ? <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                    : <Play className="h-5 w-5 ml-0.5" fill="currentColor" style={{ color: '#0D1120' }} />
                  }
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">
                    {isPaid
                      ? night1IsCompleted ? 'Rever Noite 1' : 'Iniciar Noite 1'
                      : 'Iniciar agora — grátis'}
                  </p>
                  {!isPaid && (
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                      {isGuestSono ? 'Sem cadastro · Sem cartão' : 'Acesso imediato'}
                    </p>
                  )}
                  {isPaid && night1IsCompleted && (
                    <p className="text-[11px]" style={{ color: 'rgba(52,211,153,0.60)' }}>Concluída</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            BENEFITS
            ══════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-lg px-4 pt-8 sm:px-6">
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 65, damping: 18 }}
          >
            {[
              { icon: Moon,        text: 'Sua respiração desacelera — sem você tentar. Seu peito afrouxa. Os pensamentos perdem força.', color: T.steelSolid },
              { icon: Wind,        text: 'Você para de calcular quantas horas de sono ainda dá pra pegar. Sua mente solta.',             color: T.steelSolid },
              { icon: TrendingUp,  text: 'Cada noite aprofunda mais. No 7º dia, seu corpo já sabe o que fazer — sem o áudio.',          color: '#34D399' },
            ].map(({ icon: Icon, text, color }, i) => {
              const isPayoff = color === '#34D399';
              return (
              <motion.div
                key={i}
                className="flex items-start gap-4 rounded-2xl px-4 py-4"
                style={isPayoff
                  ? { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.24)', boxShadow: '0 6px 28px rgba(52,211,153,0.10)' }
                  : { background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ type: 'spring', stiffness: 80, damping: 20, delay: i * 0.07 }}
              >
                <div
                  className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: `${color}14`, border: `1px solid ${color}22` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <p className="text-[13px] leading-relaxed pt-0.5" style={{ color: isPayoff ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.46)' }}>{text}</p>
              </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            NIGHTS 2–7 — 2-column grid
            ══════════════════════════════════════════════════════════ */}
        <section id="sono-protocolo-completo" className="mx-auto max-w-lg px-4 pt-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 65, damping: 18 }}
          >
            {/* Section divider — neutral, no purple */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, transparent, ${isPaid ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.10)'})` }}
              />
              <div
                className="flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{
                  background: isPaid ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isPaid ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.10)'}`,
                }}
              >
                {isPaid
                  ? <Play className="h-3 w-3" style={{ color: 'rgba(52,211,153,0.65)' }} fill="currentColor" />
                  : <Lock className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.35)' }} />
                }
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: isPaid ? 'rgba(52,211,153,0.65)' : 'rgba(255,255,255,0.35)' }}
                >
                  {isPaid ? 'Noites 2 a 7 — Desbloqueadas' : 'Noites 2 a 7'}
                </span>
              </div>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, transparent, ${isPaid ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.10)'})` }}
              />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {PROTOCOL_NIGHTS.slice(1).map((night, idx) => {
                const nightCompleted = completedNights.has(night.night);
                return (
                  <motion.div
                    key={night.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20, delay: idx * 0.05 }}
                    onClick={() => handleNightClick(night)}
                    className="group relative overflow-hidden rounded-2xl cursor-pointer"
                    style={{ height: '130px' }}
                  >
                    {night.imageUrl ? (
                      <img
                        src={night.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={isPaid ? undefined : { filter: 'brightness(0.52) saturate(0.7) blur(2px)', transform: 'scale(1.06)' }}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: night.gradient, opacity: isPaid ? 1 : 0.30 }} />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 15%, rgba(6,6,9,0.88) 100%)' }}
                    />

                    <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isPaid ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.30)' }}
                        >
                          Noite {night.night}
                        </span>

                        {isPaid ? (
                          nightCompleted ? (
                            <div
                              className="h-5 w-5 flex items-center justify-center rounded-full"
                              style={{ background: 'rgba(52,211,153,0.22)', border: '1px solid rgba(52,211,153,0.40)' }}
                            >
                              <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div
                              className="h-5 w-5 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
                            >
                              <Play className="h-2.5 w-2.5 ml-px text-white/70" fill="currentColor" />
                            </div>
                          )
                        ) : (
                          <div
                            className="h-5 w-5 flex items-center justify-center rounded-full"
                            style={{ background: 'rgba(6,6,9,0.70)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.10)' }}
                          >
                            <Lock className="h-2.5 w-2.5 text-white/35" />
                          </div>
                        )}
                      </div>

                      <p
                        className="text-[11px] font-semibold leading-snug line-clamp-2"
                        style={{ color: isPaid ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.40)' }}
                      >
                        {night.title}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            OFFER CARD — guest funnel
            ══════════════════════════════════════════════════════════ */}
        {isGuestSono && !isPaid && (
          <section className="mx-auto max-w-lg px-4 pt-6 sm:px-6">
            <SleepProtocolOfferCard
              onStart={handleHeroButtonClick}
              onCheckout={() => openCheckout({ origin: 'sono_guest_landing_card' })}
              checkoutLoading={checkoutLoading}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            CONVERSION BLOCK — non-paid users
            ══════════════════════════════════════════════════════════ */}
        {!isGuestSono && !isPaid && night1IsCompleted && (
          <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ type: 'spring', stiffness: 65, damping: 18, delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl px-6 py-7 text-center"
              style={{
                background: 'linear-gradient(160deg, rgba(14,12,9,0.97) 0%, rgba(8,8,11,0.99) 100%)',
                border: `1px solid ${T.amberGlow}0.18)`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 ${T.amberGlow}0.06)`,
              }}
            >
              {/* Subtle warm glow top-right */}
              <div
                className="pointer-events-none absolute"
                style={{
                  top: '-50px', right: '-40px',
                  width: '180px', height: '180px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${T.amberGlow}0.08) 0%, transparent 70%)`,
                }}
              />

              <p className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(212,168,71,0.75)' }}>
                Protocolo Completo — 7 Noites
              </p>
              <div className="flex items-baseline justify-center gap-2.5 mb-1">
                <span className="font-display text-[44px] font-bold text-white leading-none tracking-tight">7 dias gratuitos</span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>Depois R$ 15,90/mês · cancele quando quiser</p>

              {isGuestSono ? (
                <div className="flex items-center justify-center gap-1.5 mb-6">
                  <span style={{ color: T.amberLight, fontSize: '12px' }}>⏱</span>
                  <span className="text-[12px]" style={{ color: 'rgba(212,168,71,0.65)' }}>
                    Condição disponível por{' '}
                    <span className="font-mono font-bold">{formatCountdown(timeLeft)}</span>
                  </span>
                </div>
              ) : (
                <p
                  className="text-[12px] italic mb-6"
                  style={{ color: 'rgba(212,168,71,0.65)' }}
                >
                  Inclui o Ecotopia completo: Eco IA, meditações e mais.
                </p>
              )}

              <button
                onClick={() => {
                  if (isGuestSono) openCheckout({ origin: 'quiz_sono_guest' });
                  else openCheckout();
                }}
                disabled={checkoutLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
                style={{
                  background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                  color: '#0D1120',
                  boxShadow: `0 10px 32px ${T.amberGlow}0.32)`,
                }}
              >
                {checkoutLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo...</span>
                  : 'Continuar o processo completo'}
              </button>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                <span style={{ color: 'rgba(212,168,71,0.85)' }}>Garantia de 7 dias.</span>{' '}
                Não funcionou? Devolvemos. Email basta.
              </p>
            </motion.div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            PROGRESS BLOCK — paid users
            ══════════════════════════════════════════════════════════ */}
        {isPaid && (
          <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ type: 'spring', stiffness: 65, damping: 18 }}
              className="rounded-3xl px-6 py-6"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-white/65">
                  {completedCount === 7 ? 'Programa concluído!' : `Noite ${nextNight} de 7`}
                </p>
                <span className="text-[13px] font-bold" style={{ color: T.amberLight }}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${T.amberLight}, ${T.amber})` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-white/30">{completedCount} de 7 noites concluídas</p>
            </motion.div>
          </section>
        )}

      </main>

      <AnimatePresence>
        {showStartNightPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'rgba(3,6,18,0.72)', backdropFilter: 'blur(12px)' }}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-sm rounded-3xl px-6 py-7 text-center"
              style={{
                background: 'linear-gradient(160deg, #070B1D 0%, #050817 58%, #101733 100%)',
                border: '1px solid rgba(196,181,253,0.18)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.62)',
              }}
            >
              <h2 className="font-display mb-3 text-[24px] font-bold leading-tight text-white">
                Comece pela Noite 1 gratuita.
              </h2>
              <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.54)' }}>
                Ela prepara seu corpo para as próximas etapas.
              </p>
              <button
                onClick={() => {
                  setShowStartNightPrompt(false);
                  handleStartNight1();
                }}
                className="mb-3 w-full rounded-full py-4 text-[15px] font-bold transition-transform active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${T.amberLight} 0%, ${T.amber} 100%)`,
                  color: '#0D1120',
                  boxShadow: `0 10px 32px ${T.amberGlow}0.30)`,
                }}
              >
                Iniciar Noite 1
              </button>
              <button
                onClick={() => setShowStartNightPrompt(false)}
                className="w-full py-2 text-[13px]"
                style={{ color: 'rgba(255,255,255,0.36)' }}
              >
                Agora não
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
      )}

      {/* Locked-night offer modal (shows when guest taps a non-free night) */}
      <SonoPostExperienceModal
        open={showOfferModal}
        variant={offerVariant}
        guestId={guestId}
        source={source || 'sono_paid_traffic'}
        onClose={() => setShowOfferModal(false)}
        onCheckout={() => {
          setShowOfferModal(false);
          openCheckout({ origin: 'sono_guest_locked_night' });
        }}
        checkoutLoading={checkoutLoading}
        startWithQuiz={false}
      />

      {/* Checkout inline do funil guest (modelo C): oferta suave + cadastro +
          cartão no tema do sono. Sempre montado no guest para que o estado
          persistido (?checkout=) sobreviva ao remount pós-cadastro. */}
      {isGuestSono && (
        <SonoInlineCheckout
          openAt={checkoutEntry}
          onUnlocked={() => {
            setJustSubscribed(true);
            setCheckoutEntry(null);
          }}
          onDismiss={() => setCheckoutEntry(null)}
        />
      )}

      {/* Gate de cadastro na entrada — só guest deslogado. Reusa o SonoInlineSignup
          (com sua instrumentação de Cadastro + CompleteRegistration), com a copy de
          desbloquear/salvar. Pós-cadastro, a Noite 1 retoma via ?play=night1. */}
      {isGuestSono && registerGateOpen && !user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9998] flex flex-col"
          style={{ background: 'linear-gradient(180deg, #04060F 0%, #080C1E 100%)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2"
            style={{
              width: '320px', height: '220px', borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div className="relative z-10 flex flex-shrink-0 items-center justify-end px-6 pt-10 pb-2">
            <button
              onClick={closeRegisterGate}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
              aria-label="Fechar"
            >
              <ArrowLeft className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
            </button>
          </div>
          <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-6 pb-12">
            <div className="my-auto flex w-full max-w-[340px] flex-col py-4">
              <SonoInlineSignup
                onCreated={resumeNight1FromGate}
                returnTo="/sono/experiencia?play=night1"
                title={
                  <>
                    Desbloqueie sua
                    <br />
                    <span style={{ color: '#C4B5FD' }}>primeira noite</span>
                  </>
                }
                subtitle="Leva 10 segundos. Criamos sua conta pra guardar sua Noite 1 e seu progresso."
                submitLabel="Desbloquear e continuar"
              />
            </div>
          </div>
        </motion.div>
      )}
    </MotionConfig>
  );
}
