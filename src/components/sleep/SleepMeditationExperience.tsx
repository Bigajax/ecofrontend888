import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft,
  Moon, Loader2,
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
  trackSonoGuestEarlyExit,
} from '@/lib/mixpanelSonoGuestEvents';
import { fbqCustom } from '@/lib/fbpixel';
import { GuestSonoPlayer } from '@/components/sono-guest/GuestSonoPlayer';
import { LS_KEYS } from '@/components/sono-guest/types';
import type { SonoOfferVariant } from '@/components/sono/SonoPostExperienceModal';
import { SonoPostExperienceModal } from '@/components/sono/SonoPostExperienceModal';
import { SonoInlineCheckout } from '@/components/sono/SonoInlineCheckout';
import { SonoExperienceHero } from '@/components/sono/SonoExperienceHero';
import { SonoPreAudioModal } from '@/components/sono/SonoPreAudioModal';
import type { SonoCheckoutStep } from '@/components/sono/useSonoCheckoutState';
import { markRitualNightCompleted, isRitualCompletedToday } from '@/hooks/useRitualProgress';
import {
  trackRitualStarted,
  trackRitualReplayed,
  trackRitualCompleted,
  type RitualProgressStatus,
} from '@/lib/mixpanelRitualEvents';

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

// ── Guest "app store" palette — noite fria de lavanda + uma luz quente ────────
// Usada nas seções do funil guest (/sono/experiencia): card featured, benefícios
// e carrossel das noites. O calor (orb) marca só o que é ação/destino.
const P = {
  light:  '#C4B5FD',           // roxo claro
  deep:   '#7C3AED',           // violeta profundo
  lilac:  '#C7B8F0',           // luar (texto destaque)
  orb:    '#F0C4E8',           // único acento quente (play, noite ativa)
  glow:   'rgba(124,58,237,',  // glow roxo — fechar com alpha + ')'
  night0: '#0C0920',           // base da página guest (costura com o hero)
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
  const isPaid =
    isVipUser || isPremiumUser || isTrialActive || hasSonoEntitlement || justSubscribed;
  const openCheckout = useCallback((opts?: { origin?: string }) => {
    void opts;
    if (mode === 'guest') {
      if (!isPaid) setCheckoutEntry('offer'); // premium não vê oferta
      return;
    }
    navigate('/assinar?step=plan&plan=monthly&from=sono_trial');
  }, [mode, navigate, isPaid]);
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
  // Modal de contexto pré-áudio ("Esta é a Noite 1 de 7…") — só guest não-pago.
  const [preAudioOpen, setPreAudioOpen] = useState(false);

  // Carrossel das Noites 2–7 (estilo "screenshots" da App Store): dot ativo segue
  // o scroll horizontal por scroll-snap nativo (sem JS de drag).
  const nightsScrollRef = useRef<HTMLDivElement>(null);
  const [activeNightCard, setActiveNightCard] = useState(0);
  // Throttle por rAF: o onScroll dispara a cada frame; só recalcula o dot 1×/frame.
  const nightsScrollRaf = useRef<number | null>(null);
  const handleNightsScroll = () => {
    if (nightsScrollRaf.current !== null) return;
    nightsScrollRaf.current = requestAnimationFrame(() => {
      nightsScrollRaf.current = null;
      const el = nightsScrollRef.current;
      if (!el) return;
      const first = el.firstElementChild as HTMLElement | null;
      const step = first ? first.offsetWidth + 10 : el.clientWidth; // largura do card + gap
      setActiveNightCard(Math.round(el.scrollLeft / step));
    });
  };

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
        // Ritual Boa Noite (logado): grava marcador diário + Supabase + evento.
        if (!isGuestSono) {
          const newCount = markRitualNightCompleted(uid, nightNum);
          trackRitualCompleted({
            userId: user?.id,
            currentStep: newCount,
            currentNight: Math.min(newCount + 1, 7),
            progressStatus: newCount >= 7 ? 'all_done' : 'completed_today',
            source: 'modulo',
          });
        }
        if (isGuestSono && nightNum === 1 && !isPaid) {
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

  // Safety-net: premium não deve ver oferta. Se um passo de oferta ficou persistido
  // (?checkout= / sessionStorage) de uma sessão abandonada, limpa no mount — SEM
  // tocar nos passos pós-pagamento (confirming/unlocked), pra não interromper um
  // checkout ao vivo (isPaid vira true durante 'confirming'). Chave = SS_KEY de
  // useSonoCheckoutState ('eco.sono.checkout.step').
  useEffect(() => {
    if (!isGuestSono || !isPaid) return;
    const persisted = sessionStorage.getItem('eco.sono.checkout.step');
    // Passos pré-pagamento (não inclui unlocked/save_account, pós-pagamento).
    const OFFER_STEPS = ['reflection', 'offer', 'pix', 'signup', 'card'];
    if (persisted && OFFER_STEPS.includes(persisted)) {
      sessionStorage.removeItem('eco.sono.checkout.step');
      setCheckoutEntry(null);
      const p = new URLSearchParams(searchParams);
      if (p.has('checkout')) { p.delete('checkout'); setSearchParams(p, { replace: true }); }
    }
  }, [isGuestSono, isPaid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo(0, 0); }, []);

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

  // Saída antecipada da Noite 1 (sheet do player → "ver outras noites"): abre a
  // oferta direto, sem a reflexão (que afirmaria "Noite 1 concluída").
  const handleGuestNight1EarlyExit = (progressPct: number) => {
    trackSonoGuestEarlyExit({ source: source || 'sono_paid_traffic', guestId, progressPct });
    setGuestPlayback(null);
    if (isPaid) return; // premium já pagou — sem oferta
    setCheckoutEntry('offer');
  };

  const handleGuestNight1Complete = useCallback(() => {
    markGuestNight1Completed();
    setCompletedNights(prev => new Set([...prev, 1]));
    setGuestPlayback(null);
    if (isPaid) return; // premium já pagou — sem quiz/oferta
    setCheckoutEntry('reflection');
    localStorage.setItem(`eco.sono.offer_modal_shown.${guestId}`, 'true');
    trackSonoGuestNight1Completed({ source: source || 'sono_paid_traffic', guestId });
    trackExperienciaCompletaOnce(guestId, source || 'sono_paid_traffic');
  }, [guestId, source, isPaid]);

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
      // Experiência antes do cadastro: a Noite 1 toca para guest deslogado, sem
      // muro. A conta só é pedida na oferta (pós-Noite 1), depois de sentir o
      // valor — o GuestSonoPlayer roda sem auth (estado em sessionStorage).
      // Antes do áudio, planta o contexto do protocolo (Noite 1 de 7, próximas
      // pagas) num modal — exceto para quem já pagou (mensagem não se aplica).
      if (isPaid) {
        startGuestNight1Playback();
      } else {
        setPreAudioOpen(true);
      }
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

  // ── Ritual Boa Noite (app logado) — estado + copy ──────────────
  // Camada diária sobre as 7 noites. Só vale no fluxo logado (mode="app"); o
  // guest mantém o SonoExperienceHero com a copy "Sua primeira noite…".
  const ritualCompletedToday = !isGuestSono && isRitualCompletedToday(uid);
  const ritualStatus: RitualProgressStatus =
    completedCount >= 7
      ? 'all_done'
      : completedCount === 0
        ? 'new'
        : ritualCompletedToday
          ? 'completed_today'
          : 'in_progress';

  const ritualCopy = (() => {
    switch (ritualStatus) {
      case 'in_progress':
        return {
          l1: 'Continue', l2: 'seu ritual.',
          sub: 'Volte de onde parou e siga sua sequência de descanso.',
          cta: `Continuar — Noite ${nextNight}`,
        };
      case 'completed_today':
        return {
          l1: 'Ritual concluído', l2: 'por hoje.',
          sub: 'Você já deu ao seu corpo um sinal de pausa. Volte amanhã para continuar sua sequência.',
          cta: 'Ouvir novamente',
        };
      case 'all_done':
        return {
          l1: 'Ritual', l2: 'concluído.',
          sub: 'Seu corpo já aprendeu o caminho. Ouça novamente quando quiser.',
          cta: 'Ouvir novamente',
        };
      case 'new':
      default:
        return {
          l1: 'Seu ritual de hoje', l2: 'já está pronto.',
          sub: 'Alguns minutos para desacelerar o corpo e preparar a mente para dormir.',
          cta: 'Começar ritual',
        };
    }
  })();

  const pillLabel = 'Ritual Boa Noite';

  // CTA do hero logado: novo/em progresso → começa a próxima noite; concluído
  // hoje/total → "ouvir novamente" (repete a última noite concluída).
  const handleRitualHeroClick = () => {
    const replay = ritualStatus === 'completed_today' || ritualStatus === 'all_done';
    const idx = replay
      ? (isPaid ? Math.max(0, completedCount - 1) : 0)
      : (isPaid ? nextNight - 1 : 0);
    const targetNight = PROTOCOL_NIGHTS[idx];
    (replay ? trackRitualReplayed : trackRitualStarted)({
      userId: user?.id,
      progressStatus: ritualStatus,
      currentStep: completedCount,
      currentNight: targetNight?.night,
      source: 'modulo',
    });
    if (targetNight) handleNightClick(targetNight);
  };

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
                background: `linear-gradient(135deg, ${P.light} 0%, ${P.deep} 100%)`,
                color: '#0D1120',
                boxShadow: `0 6px 24px ${P.glow}0.30)`,
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
          background: `linear-gradient(180deg, ${P.night0} 0%, #0A0820 40%, #08061A 72%, #060512 100%)`,
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

          {/* Background image — vale cósmico (mesmo do guest) */}
          <motion.div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: 'url("/images/sono-experiencia-bg.webp")', backgroundPosition: 'center center' }}
            initial={{ scale: 1.06 }}
            animate={{ scale: [1.06, 1.12, 1.06] }}
            transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Vinheta — funde no preto-noite roxo embaixo */}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, rgba(12,9,32,0.20) 0%, rgba(12,9,32,0.08) 22%, rgba(12,9,32,0.58) 58%, ${P.night0} 100%)` }}
          />
          {/* Glow roxo no rodapé (eco da trilha de luzes) */}
          <div
            className="pointer-events-none absolute"
            style={{
              bottom: '8%', left: '50%', transform: 'translateX(-50%)',
              width: '300px', height: '190px', borderRadius: '50%',
              background: `radial-gradient(ellipse, ${P.glow}0.16) 0%, transparent 70%)`,
              filter: 'blur(52px)',
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
                style={{ background: P.light, boxShadow: `0 0 5px ${P.glow}0.60)` }}
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
              {ritualCopy.l1}<br />
              <em style={{ color: P.lilac, fontStyle: 'italic' }}>{ritualCopy.l2}</em>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mt-4 text-[15px] leading-relaxed font-light"
              style={{ color: 'rgba(255,255,255,0.46)' }}
            >
              {ritualCopy.sub}
            </motion.p>

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
              onClick={handleRitualHeroClick}
              disabled={checkoutLoading}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70"
              style={{
                background: `linear-gradient(135deg, ${P.light} 0%, ${P.deep} 100%)`,
                color: '#0D1120',
                boxShadow: `0 10px 36px ${P.glow}0.28), 0 2px 8px rgba(0,0,0,0.40)`,
              }}
            >
              {checkoutLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" fill="currentColor" />
              }
              {ritualCopy.cta}
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
            NOITE 1 — card "featured" estilo App Store
            ══════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-lg px-4 pt-3 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            className="relative overflow-hidden rounded-[24px] p-4"
            style={{
              background: 'linear-gradient(155deg, rgba(124,58,237,0.14) 0%, rgba(18,14,42,0.92) 46%, rgba(12,9,32,0.96) 100%)',
              border: '1px solid rgba(199,184,240,0.16)',
              boxShadow: '0 18px 60px rgba(8,5,24,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Glow morno no canto — eco da trilha de luzes */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(240,196,232,0.16) 0%, transparent 70%)' }}
            />

            {/* Capa grande — clicar (no play de vidro) toca a Noite 1 */}
            <div
              onClick={() => { const n = PROTOCOL_NIGHTS[0]; if (n) handleNightClick(n); }}
              className="group relative cursor-pointer overflow-hidden rounded-[20px]"
              style={{ height: '200px' }}
            >
              {PROTOCOL_NIGHTS[0]?.imageUrl ? (
                <img
                  src={PROTOCOL_NIGHTS[0].imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: PROTOCOL_NIGHTS[0]?.gradient }} />
              )}
              {/* Escurecimento leve pras pílulas e pro play */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(8,5,24,0.46) 0%, rgba(8,5,24,0.10) 34%, rgba(8,5,24,0.34) 100%)' }}
              />

              {/* Pílulas sobre a capa */}
              <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ background: 'rgba(8,5,24,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(199,184,240,0.22)', color: P.lilac }}
                >
                  <span className="h-1 w-1 rounded-full" style={{ background: P.orb }} />
                  Noite 1 de 7
                </span>
                {isPaid && night1IsCompleted ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: 'rgba(52,211,153,0.9)', color: '#04130C' }}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} /> Concluída
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: 'rgba(240,196,232,0.95)', color: '#2A0F22' }}
                  >
                    ★ Grátis
                  </span>
                )}
              </div>

              {/* Play de vidro — centro (glassmorph) */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span
                  className="flex h-[70px] w-[70px] items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 group-active:scale-95"
                  style={{
                    background: 'rgba(167,139,250,0.26)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(196,181,253,0.7)',
                    boxShadow: '0 10px 34px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                >
                  {isPaid && night1IsCompleted
                    ? <Check className="h-7 w-7" strokeWidth={2.5} style={{ color: '#E9DEFF' }} />
                    : <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" style={{ color: '#E9DEFF' }} />
                  }
                </span>
              </div>
            </div>

            {/* Título + descrição abaixo da capa */}
            <h3 className="relative mt-4 font-display text-[18px] font-semibold leading-snug text-white">
              {PROTOCOL_NIGHTS[0]?.title ?? 'Desligando o estado de alerta'}
            </h3>
            <p className="relative mt-1.5 font-subtitle text-[13px] leading-relaxed" style={{ color: 'rgba(199,184,240,0.66)' }}>
              {PROTOCOL_NIGHTS[0]?.description ?? 'Ensina seu sistema nervoso a reconhecer o sinal para dormir.'}
            </p>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            NOITES 2–7 — carrossel horizontal (estilo "screenshots")
            ══════════════════════════════════════════════════════════ */}
        <section id="sono-protocolo-completo" className="pt-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 65, damping: 18 }}
          >
            {/* Cabeçalho da seção */}
            <div className="mx-auto mb-4 flex max-w-lg items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2">
                {isPaid
                  ? <Play className="h-3.5 w-3.5" style={{ color: 'rgba(52,211,153,0.7)' }} fill="currentColor" />
                  : <Lock className="h-3.5 w-3.5" style={{ color: P.lilac }} />
                }
                <span
                  className="text-[12px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: isPaid ? 'rgba(52,211,153,0.75)' : P.lilac }}
                >
                  {isPaid ? 'Noites 2 a 7 — Desbloqueadas' : 'Noites 2 a 7'}
                </span>
              </div>
              {!isPaid && (
                <span className="text-[11px] font-medium md:hidden" style={{ color: 'rgba(199,184,240,0.45)' }}>
                  Deslize →
                </span>
              )}
            </div>

            {/* Trilho com scroll-snap; primeiro card alinhado à margem do conteúdo */}
            <div
              ref={nightsScrollRef}
              onScroll={handleNightsScroll}
              className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:snap-none md:max-w-lg md:mx-auto"
            >
              {PROTOCOL_NIGHTS.slice(1).map((night) => {
                const nightCompleted = completedNights.has(night.night);
                return (
                  <div
                    key={night.id}
                    onClick={() => handleNightClick(night)}
                    className="group relative h-[162px] w-[58%] max-w-[200px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl md:w-auto md:max-w-none"
                  >
                    {night.imageUrl ? (
                      <img
                        src={night.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                        style={isPaid ? undefined : { filter: 'brightness(0.5) saturate(0.72) blur(2px)', transform: 'scale(1.06)' }}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: night.gradient, opacity: isPaid ? 1 : 0.3 }} />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 12%, rgba(8,5,24,0.92) 100%)' }}
                    />

                    <div className="absolute inset-0 flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.12em]"
                          style={{ color: isPaid ? 'rgba(255,255,255,0.6)' : 'rgba(199,184,240,0.5)' }}
                        >
                          Noite {night.night}
                        </span>

                        {isPaid ? (
                          nightCompleted ? (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full"
                              style={{ background: 'rgba(52,211,153,0.22)', border: '1px solid rgba(52,211,153,0.4)' }}
                            >
                              <Check className="h-3 w-3 text-emerald-400" strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                              <Play className="ml-px h-3 w-3 text-white/75" fill="currentColor" />
                            </div>
                          )
                        ) : (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{ background: 'rgba(124,58,237,0.28)', backdropFilter: 'blur(6px)', border: '1px solid rgba(199,184,240,0.22)' }}
                          >
                            <Lock className="h-3 w-3" style={{ color: P.lilac }} />
                          </div>
                        )}
                      </div>

                      <p
                        className="line-clamp-2 font-display text-[13.5px] font-semibold leading-snug"
                        style={{ color: isPaid ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.62)' }}
                      >
                        {night.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dots — o ativo recebe a luz quente (só no carrossel mobile) */}
            <div className="mt-4 flex items-center justify-center gap-1.5 md:hidden">
              {PROTOCOL_NIGHTS.slice(1).map((night, i) => {
                const active = i === activeNightCard;
                return (
                  <span
                    key={night.id}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: active ? '18px' : '6px',
                      height: '6px',
                      background: active ? P.orb : 'rgba(199,184,240,0.25)',
                      boxShadow: active ? '0 0 8px rgba(240,196,232,0.6)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FECHO — guest. Sem oferta/trial aqui: a conversão é o fluxo
            inline (Pix vitalício) que abre depois da Noite 1 terminar.
            ══════════════════════════════════════════════════════════ */}
        {isGuestSono && !isPaid && (
          <section className="mx-auto max-w-lg px-6 pt-9 pb-2 text-center">
            <Moon className="mx-auto h-5 w-5" style={{ color: 'rgba(240,196,232,0.55)' }} fill="currentColor" />
            <p className="mt-3 font-subtitle text-[14px] italic" style={{ color: 'rgba(199,184,240,0.5)' }}>
              A primeira noite é por nossa conta.
            </p>
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
                border: `1px solid ${P.glow}0.18)`,
                boxShadow: `0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 ${P.glow}0.06)`,
              }}
            >
              {/* Subtle warm glow top-right */}
              <div
                className="pointer-events-none absolute"
                style={{
                  top: '-50px', right: '-40px',
                  width: '180px', height: '180px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${P.glow}0.08) 0%, transparent 70%)`,
                }}
              />

              <p className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(212,168,71,0.75)' }}>
                Protocolo Completo — 7 Noites
              </p>
              <div className="flex items-baseline justify-center gap-2.5 mb-1">
                <span className="font-display text-[44px] font-bold text-white leading-none tracking-tight">7 dias gratuitos</span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>Depois R$ 15,90/mês · cancele quando quiser</p>

              <p
                className="text-[12px] italic mb-6"
                style={{ color: 'rgba(212,168,71,0.65)' }}
              >
                Inclui o Ecotopia completo: Eco IA, meditações e mais.
              </p>

              <button
                onClick={() => {
                  if (isGuestSono) openCheckout({ origin: 'quiz_sono_guest' });
                  else openCheckout();
                }}
                disabled={checkoutLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
                style={{
                  background: `linear-gradient(135deg, ${P.light} 0%, ${P.deep} 100%)`,
                  color: '#0D1120',
                  boxShadow: `0 10px 32px ${P.glow}0.32)`,
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
                <span className="text-[13px] font-bold" style={{ color: P.light }}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${P.light}, ${P.deep})` }}
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
                className="mb-3 w-full rounded-full py-4 text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${P.light} 0%, ${P.deep} 100%)`,
                  boxShadow: `0 10px 32px ${P.glow}0.42)`,
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

      {/* Modal de contexto pré-áudio — Noite 1 de 7 (planta a oferta antes de ouvir) */}
      {isGuestSono && (
        <SonoPreAudioModal
          open={preAudioOpen}
          guestId={guestId}
          source={source}
          onConfirm={() => {
            setPreAudioOpen(false);
            startGuestNight1Playback();
          }}
          onClose={() => setPreAudioOpen(false)}
        />
      )}

    </MotionConfig>
  );
}
