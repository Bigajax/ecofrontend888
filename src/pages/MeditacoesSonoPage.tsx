import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft,
  Activity, Zap, TrendingUp, Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSonoEntitlement } from '@/hooks/useSonoEntitlement';
import { useSonoCheckout } from '@/hooks/useSonoCheckout';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';
import { SonoPostExperienceModal, type SonoOfferVariant } from '@/components/sono/SonoPostExperienceModal';
import { SonoGuestPostFlow } from '@/components/sono/SonoGuestPostFlow';
import mixpanel from '@/lib/mixpanel';
import { trackGuestUnlockClicked } from '@/lib/mixpanelSonoGuestEvents';

// Paid/VIP: full access. Others: only free nights (night 1).
function isNightAccessible(night: ProtocolNight, isPaid: boolean, isVip: boolean): boolean {
  if (isVip || isPaid) return true;
  return night.isFree;
}

const SUBSCRIPTION_PATH = '/app/subscription/demo';

export default function MeditacoesSonoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isVipUser } = useAuth();
  const { hasAccess: hasSonoEntitlement } = useSonoEntitlement();
  const { loading: checkoutLoading, openCheckout } = useSonoCheckout();
  const isPaid = isVipUser || hasSonoEntitlement;
  const uid = user?.id || 'guest';

  // ── Guest sono mode detection ──────────────────────────────────
  const source = searchParams.get('source') || '';
  const isGuestSono =
    searchParams.get('guestSono') === '1' ||
    localStorage.getItem('sono_guest_mode') === 'true';

  const guestId = useMemo(() => {
    const fromUrl = searchParams.get('guest_id');
    const fromStorage = localStorage.getItem('eco_guest_id');
    if (fromUrl) { localStorage.setItem('eco_guest_id', fromUrl); return fromUrl; }
    if (fromStorage) return fromStorage;
    const newId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem('eco_guest_id', newId);
    return newId;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isGuestSono) return;
    localStorage.setItem('sono_guest_mode', 'true');
    localStorage.setItem('sono_guest_started_at', new Date().toISOString());
    sessionStorage.setItem('eco.sono.guest_id', guestId);
    sessionStorage.setItem('eco.sono.source', source || 'quiz_sono');
    mixpanel.track('Sleep Guest Page Viewed', { source, guest_id: guestId, product_key: 'protocolo_sono_7_noites' });
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
  const [offerVariant, setOfferVariant] = useState<SonoOfferVariant>('locked_night');
  const [showGuestPostFlow, setShowGuestPostFlow] = useState(false);

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
            setShowGuestPostFlow(true);
            localStorage.setItem(offerKey, 'true');
            mixpanel.track('Sleep Free Experience Completed', { night_id: 'night_1', source, guest_id: guestId, product_key: 'protocolo_sono_7_noites' });
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
  const handleNightClick = (night: ProtocolNight) => {
    const accessible = isNightAccessible(night, isPaid, isVipUser);
    if (!accessible) {
      if (isGuestSono) {
        trackGuestUnlockClicked(night.id);
        setOfferVariant('locked_night');
        setShowOfferModal(true);
      } else {
        openCheckout();
      }
      return;
    }
    if (!night.hasAudio || !night.audioUrl) return;
    sessionStorage.setItem('eco.sono.lastPlayedNight', String(night.night));

    const playerRoute = user ? '/app/meditation-player' : '/guest/meditation-player';
    const returnTo = user
      ? '/app/meditacoes-sono'
      : `/app/meditacoes/sono?guestSono=1&source=${encodeURIComponent(source || 'quiz_sono')}&guest_id=${encodeURIComponent(guestId)}`;

    if (isGuestSono && night.night === 1) {
      mixpanel.track('Sleep Free Experience Started', { night_id: night.id, source, guest_id: guestId });
    }

    navigate(playerRoute, {
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
    if (isGuestSono && completedCount > 0 && !isPaid) {
      const offerKey = `eco.sono.offer_modal_shown.${guestId}`;
      if (localStorage.getItem(offerKey)) {
        openCheckout({ origin: 'hero_cta_guest' });
      } else {
        setShowGuestPostFlow(true);
        localStorage.setItem(offerKey, 'true');
      }
      return;
    }
    const targetNight = PROTOCOL_NIGHTS[nextNight - 1];
    if (targetNight) handleNightClick(targetNight);
  };

  // ── Derived labels ─────────────────────────────────────────────
  const pillLabel = isPaid
    ? 'Protocolo Sono Profundo · Acesso Completo'
    : 'Protocolo Sono Profundo · Noite 1 Gratuita';

  const heroCTALabel = checkoutLoading
    ? 'Carregando…'
    : completedCount === 7
      ? 'Protocolo Concluído'
      : isPaid
        ? completedCount === 0 ? 'Iniciar Noite 1' : `Continuar — Noite ${nextNight}`
        : completedCount === 0
          ? isGuestSono ? 'Iniciar Noite 1 grátis — agora' : 'Iniciar Noite 1 grátis'
          : 'Garantir acesso completo — R$37';

  // ── Completion Screen ──────────────────────────────────────────
  if (showCompletion) {
    return (
      <div
        className="min-h-screen font-primary flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'linear-gradient(160deg, #06091A 0%, #0C1226 40%, #0F1A38 100%)' }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        >
          <div className="text-6xl mb-6">🎉</div>
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
              className="w-full rounded-full px-6 py-3.5 text-[15px] font-bold text-[#06091A] transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #A78BFA 100%)', boxShadow: '0 6px 24px rgba(167,139,250,0.35)' }}
            >
              Explorar outros programas
            </button>
            <button
              onClick={() => navigate(SUBSCRIPTION_PATH)}
              className="w-full rounded-full border px-6 py-3.5 text-[15px] font-semibold text-white/70 transition-all hover:text-white active:scale-95"
              style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}
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
    );
  }

  // ── Main Page ──────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen font-primary"
      style={{ background: 'linear-gradient(180deg, #06091A 0%, #06091A 38%, #0A1020 55%, #0D1530 75%, #0F1A38 100%)' }}
    >
      {user && !isGuestSono && <HomeHeader />}

      <main className="pb-24">

        {/* ══════════════════════════════════════════════════════════
            HERO — cinematic, unified
            ══════════════════════════════════════════════════════════ */}
        <section className="relative flex min-h-[720px] flex-col overflow-hidden sm:min-h-[800px]">
          {/* Back button — shown only when no HomeHeader above */}
          {(!user || isGuestSono) && (
            <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:text-white/80"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Background */}
          <div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: 'url("/images/meditacoes-sono-hero.webp")', backgroundPosition: 'center 30%', transform: 'scale(1.06)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,9,26,0.25) 0%, rgba(6,9,26,0.10) 25%, rgba(6,9,26,0.65) 60%, rgba(6,9,26,1) 100%)' }} />
          <div
            className="pointer-events-none absolute"
            style={{ bottom: '12%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '220px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(70,55,140,0.09) 0%, transparent 70%)', filter: 'blur(60px)' }}
          />

          {/* Content */}
          <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-32 pb-20 text-center sm:max-w-md sm:px-8 sm:pt-40">
            {/* Pill */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{ background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.28)', color: '#C4B5FD', backdropFilter: 'blur(12px)' }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#A78BFA', boxShadow: '0 0 4px rgba(167,139,250,0.45)' }} />
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
              Esta noite,<br />
              <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>sua mente descansa.</em>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="mt-4 text-[15px] leading-relaxed font-light"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              7 minutos. Sem remédio.<br />Sem contar ovelhas.
            </motion.p>

            {/* Stars */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-5 flex items-center gap-2.5"
            >
              <span style={{ color: '#FBBF24', fontSize: '14px', letterSpacing: '2px' }}>★★★★★</span>
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)' }}>12.400+ pessoas dormindo melhor</span>
            </motion.div>

            {/* Urgency countdown — guest funnel only */}
            {isGuestSono && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-6 flex items-center justify-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)' }}
              >
                <span style={{ color: '#FBBF24', fontSize: '13px' }}>⏱</span>
                <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Acesso gratuito disponível por{' '}
                  <span className="font-mono font-bold" style={{ color: '#FBBF24' }}>{formatCountdown(timeLeft)}</span>
                </span>
              </motion.div>
            )}

            {/* Progress badge — paid users with progress */}
            {isPaid && completedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="mt-6 flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.22)' }}
              >
                <span className="text-[12px] font-medium" style={{ color: 'rgba(196,181,253,0.80)' }}>
                  {completedCount === 7 ? '✓ Protocolo concluído' : `${completedCount} de 7 noites concluídas`}
                </span>
              </motion.div>
            )}

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.38, ease: 'easeOut' }}
              onClick={handleHeroButtonClick}
              disabled={checkoutLoading}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)', boxShadow: '0 10px 40px rgba(100,70,190,0.32), 0 2px 10px rgba(0,0,0,0.35)' }}
            >
              {checkoutLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" fill="currentColor" />
              }
              {heroCTALabel}
            </motion.button>

            {/* Subtext */}
            {!isPaid && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-3 text-[11px]"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {isGuestSono ? 'Sem cadastro · Sem cartão · Acesso imediato' : 'Acesso imediato à Noite 1 grátis'}
              </motion.p>
            )}
          </div>
        </section>

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
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,9,26,0.05) 0%, rgba(6,9,26,0.22) 35%, rgba(6,9,26,0.96) 88%)' }} />

            {/* Top row */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ background: 'rgba(6,9,26,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(196,181,253,0.80)' }}
              >
                <span className="h-1 w-1 rounded-full" style={{ background: '#A78BFA' }} />
                Noite 1 de 7
              </span>
              {!isPaid && (
                <div
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)', boxShadow: '0 4px 14px rgba(124,58,237,0.50)' }}
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
              <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.48)' }}>
                {PROTOCOL_NIGHTS[0]?.description ?? 'Ensina seu sistema nervoso a reconhecer o sinal para dormir.'}
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={
                    isPaid && night1IsCompleted
                      ? { background: 'rgba(52,211,153,0.22)', boxShadow: '0 6px 24px rgba(52,211,153,0.30)', border: '1px solid rgba(52,211,153,0.40)' }
                      : { background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)', boxShadow: '0 6px 24px rgba(124,58,237,0.60)' }
                  }
                >
                  {isPaid && night1IsCompleted
                    ? <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                    : <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
                  }
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">
                    {isPaid
                      ? night1IsCompleted ? 'Rever Noite 1' : 'Iniciar Noite 1'
                      : 'Iniciar agora — grátis'}
                  </p>
                  {!isPaid && (
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
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
              { icon: Activity,    text: 'Sua respiração desacelera — sem você tentar. Seu peito afrouxa. Os pensamentos perdem força.', color: '#A78BFA' },
              { icon: Zap,         text: 'Você para de calcular quantas horas de sono ainda dá pra pegar. Sua mente solta.', color: '#A78BFA' },
              { icon: TrendingUp,  text: 'Cada noite aprofunda mais. No 7º dia, seu corpo já sabe o que fazer — sem o áudio.', color: '#34D399' },
            ].map(({ icon: Icon, text, color }, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 rounded-2xl px-4 py-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ type: 'spring', stiffness: 80, damping: 20, delay: i * 0.07 }}
              >
                <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <p className="text-[13px] leading-relaxed pt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            NIGHTS 2–7 — 2-column grid
            ══════════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-lg px-4 pt-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 65, damping: 18 }}
          >
            {/* Section divider */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, transparent, ${isPaid ? 'rgba(52,211,153,0.25)' : 'rgba(167,139,250,0.25)'})` }}
              />
              <div
                className="flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{
                  background: isPaid ? 'rgba(52,211,153,0.10)' : 'rgba(167,139,250,0.10)',
                  border: `1px solid ${isPaid ? 'rgba(52,211,153,0.20)' : 'rgba(167,139,250,0.20)'}`,
                }}
              >
                {isPaid
                  ? <Play className="h-3 w-3" style={{ color: 'rgba(52,211,153,0.70)' }} fill="currentColor" />
                  : <Lock className="h-3 w-3" style={{ color: 'rgba(196,181,253,0.55)' }} />
                }
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: isPaid ? 'rgba(52,211,153,0.70)' : 'rgba(196,181,253,0.55)' }}
                >
                  {isPaid ? 'Noites 2 a 7 — Desbloqueadas' : 'Noites 2 a 7'}
                </span>
              </div>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, transparent, ${isPaid ? 'rgba(52,211,153,0.25)' : 'rgba(167,139,250,0.25)'})` }}
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
                        className="absolute inset-0 w-full h-full object-cover"
                        style={isPaid ? undefined : { filter: 'brightness(0.30) saturate(0.50)' }}
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: night.gradient, opacity: isPaid ? 1 : 0.35 }} />
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 15%, rgba(6,9,26,0.85) 100%)' }} />

                    <div className="absolute inset-0 flex flex-col justify-between p-3.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: isPaid ? 'rgba(255,255,255,0.65)' : 'rgba(196,181,253,0.55)' }}
                        >
                          Noite {night.night}
                        </span>

                        {isPaid ? (
                          nightCompleted ? (
                            <div
                              className="h-5 w-5 flex items-center justify-center rounded-full"
                              style={{ background: 'rgba(52,211,153,0.25)', border: '1px solid rgba(52,211,153,0.45)' }}
                            >
                              <Check className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} />
                            </div>
                          ) : (
                            <div
                              className="h-5 w-5 flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                              style={{ background: 'rgba(167,139,250,0.20)', border: '1px solid rgba(167,139,250,0.35)' }}
                            >
                              <Play className="h-2.5 w-2.5 ml-px" style={{ color: 'rgba(196,181,253,0.80)' }} fill="currentColor" />
                            </div>
                          )
                        ) : (
                          <div
                            className="h-5 w-5 flex items-center justify-center rounded-full"
                            style={{ background: 'rgba(6,9,26,0.72)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' }}
                          >
                            <Lock className="h-2.5 w-2.5 text-white/40" />
                          </div>
                        )}
                      </div>

                      <p
                        className="text-[11px] font-semibold leading-snug line-clamp-2"
                        style={{ color: isPaid ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.58)' }}
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
            CONVERSION BLOCK — non-paid users
            ══════════════════════════════════════════════════════════ */}
        {!isPaid && (
          <section className="mx-auto max-w-lg px-4 pt-6 pb-12 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ type: 'spring', stiffness: 65, damping: 18, delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl px-6 py-7 text-center"
              style={{
                background: 'linear-gradient(160deg, rgba(70,52,140,0.16) 0%, rgba(10,10,30,0.98) 100%)',
                border: '1px solid rgba(140,115,210,0.22)',
                boxShadow: '0 8px 40px rgba(50,40,100,0.20)',
              }}
            >
              <div className="pointer-events-none absolute" style={{ top: '-40px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)' }} />
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold mb-4" style={{ color: 'rgba(251,191,36,0.80)' }}>
                ⚡ Oferta especial de lançamento
              </p>
              <div className="flex items-baseline justify-center gap-3 mb-1">
                <span className="text-[14px] line-through" style={{ color: 'rgba(255,255,255,0.25)' }}>R$97</span>
                <span className="font-display text-[40px] font-bold text-white leading-none">R$37</span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.32)' }}>Pagamento único · Sem mensalidade</p>

              {isGuestSono ? (
                <div className="flex items-center justify-center gap-1.5 mb-6">
                  <span style={{ color: '#FBBF24', fontSize: '12px' }}>⏱</span>
                  <span className="text-[12px]" style={{ color: 'rgba(251,191,36,0.70)' }}>
                    Expira em{' '}
                    <span className="font-mono font-bold">{formatCountdown(timeLeft)}</span>
                  </span>
                </div>
              ) : (
                <div className="mb-6" />
              )}

              <button
                onClick={() => {
                  if (isGuestSono) openCheckout({ origin: 'quiz_sono_guest' });
                  else openCheckout();
                }}
                disabled={checkoutLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mb-3"
                style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)', boxShadow: '0 10px 36px rgba(107,79,187,0.60)' }}
              >
                {checkoutLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo…</span>
                  : isGuestSono ? 'Garantir as 7 noites — R$37 →' : 'Desbloquear as 7 noites — R$37 →'}
              </button>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>Acesso imediato · Sem risco</p>
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
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-white/70">
                  {completedCount === 7 ? 'Programa concluído!' : `Noite ${nextNight} de 7`}
                </p>
                <span className="text-[13px] font-bold text-[#A78BFA]">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #A78BFA, #7C3AED)' }}
                />
              </div>
              <p className="mt-2 text-[12px] text-white/35">{completedCount} de 7 noites concluídas</p>
            </motion.div>
          </section>
        )}

        {/* ── Offer modal (guest sono) ──────────────────────────────── */}
        <SonoPostExperienceModal
          open={showOfferModal}
          variant={offerVariant}
          guestId={guestId}
          source={source || 'quiz_sono_guest'}
          onClose={() => setShowOfferModal(false)}
          onCheckout={() => openCheckout({ origin: 'quiz_sono_guest' })}
          checkoutLoading={checkoutLoading}
        />

      </main>

      {/* ── Mini quiz pós-meditação (6 passos) ───────────────────────── */}
      <AnimatePresence>
        {showGuestPostFlow && (
          <SonoGuestPostFlow
            onCheckout={() => openCheckout({ origin: 'quiz_sono_guest_post_meditation' })}
            checkoutLoading={checkoutLoading}
            onDismiss={() => setShowGuestPostFlow(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
