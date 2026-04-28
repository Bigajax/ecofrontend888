import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Play, Check, Lock, ArrowLeft, Gift,
  Moon, ShieldCheck, Wind,
  Activity, Zap, TrendingUp, Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSonoEntitlement } from '@/hooks/useSonoEntitlement';
import { useSonoCheckout } from '@/hooks/useSonoCheckout';
import { PROTOCOL_NIGHTS, type ProtocolNight } from '@/data/protocolNights';
import { SonoPostExperienceModal } from '@/components/sono/SonoPostExperienceModal';
import mixpanel from '@/lib/mixpanel';
import { trackGuestUnlockClicked } from '@/lib/mixpanelSonoGuestEvents';

function isNightAccessible(night: number, completed: Set<number>, isPaid: boolean, isVip: boolean, isFree: boolean): boolean {
  if (isVip) return true;
  if (isFree) return true;
  if (!isPaid) return false;
  return completed.has(night - 1);
}

const SUBSCRIPTION_PATH = '/app/subscription/demo';

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 20 } },
};

export default function MeditacoesSonoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isVipUser } = useAuth();
  const { hasAccess: hasSonoEntitlement } = useSonoEntitlement();
  const { loading: checkoutLoading, openCheckout } = useSonoCheckout();
  const isPaid = isVipUser || hasSonoEntitlement;
  const uid = user?.id || 'guest';

  // ── Guest sono mode ────────────────────────────────────────────
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
    mixpanel.track('Sleep Guest Page Viewed', { source, guest_id: guestId });
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
      const markerKey = `eco.meditation.completed80pct.night_${nightNum}`;
      if (localStorage.getItem(markerKey) === 'true') {
        setCompletedNights(prev => {
          const next = new Set([...prev, nightNum]);
          if (next.size === 7) setShowCompletion(true);
          return next;
        });
        // Open offer modal for guest after night 1 completion
        if (isGuestSono && nightNum === 1) {
          const offerKey = `eco.sono.offer_modal_shown.${guestId}`;
          if (!localStorage.getItem(offerKey)) {
            setShowOfferModal(true);
            localStorage.setItem(offerKey, 'true');
            mixpanel.track('Free Experience Completed', { night_id: 'night_1', source, guest_id: guestId });
          }
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const completedCount = completedNights.size;
  const pct = Math.round((completedCount / 7) * 100);
  const nextNight = Math.min(completedCount + 1, 7);

  const heroButtonLabel = isGuestSono && completedCount === 0
    ? 'Iniciar Noite 1 grátis'
    : completedCount === 0 ? 'Iniciar Noite 1'
    : completedCount === 7 ? 'Protocolo Concluído'
    : !isPaid ? 'Garantir acesso completo — R$ 37'
    : `Continuar — Noite ${nextNight}`;

  const handleGuestCheckout = () => {
    openCheckout({ origin: 'quiz_sono_guest' });
  };

  const handleNightClick = (night: ProtocolNight) => {
    const accessible = isNightAccessible(night.night, completedNights, isPaid, isVipUser, night.isFree);
    if (!accessible) {
      if (isGuestSono) {
        trackGuestUnlockClicked(night.id);
        setShowOfferModal(true);
      } else {
        openCheckout();
      }
      return;
    }
    if (!night.hasAudio || !night.audioUrl) return;
    sessionStorage.setItem('eco.sono.lastPlayedNight', String(night.night));

    // Guests use the public meditation player route
    const playerRoute = isGuestSono ? '/guest/meditation-player' : '/app/meditation-player';
    const returnTo = isGuestSono
      ? `/app/meditacoes/sono?guestSono=1&source=${encodeURIComponent(source || 'quiz_sono')}&guest_id=${encodeURIComponent(guestId)}`
      : '/app/meditacoes-sono';

    if (isGuestSono && night.night === 1) {
      mixpanel.track('Free Experience Started', { night_id: night.id, source, guest_id: guestId });
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
    if (!isPaid && nextNight > 1) { openCheckout(); return; }
    if (completedCount === 7) { setShowCompletion(true); return; }
    const targetNight = PROTOCOL_NIGHTS[nextNight - 1];
    if (targetNight) handleNightClick(targetNight);
  };

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

        {isGuestSono ? (
          /* ════════════════════════════════════════════════════════
             GUEST LAYOUT — premium, cinematic, invitation-focused
             ════════════════════════════════════════════════════════ */
          <>
            {/* ── Guest Hero ─────────────────────────────────────── */}
            <section className="relative flex min-h-[720px] flex-col overflow-hidden sm:min-h-[800px]">
              {/* Nav */}
              <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
                <button
                  onClick={() => navigate('/app')}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-all hover:text-white/80"
                  style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover"
                style={{ backgroundImage: 'url("/images/meditacoes-sono-hero.webp")', backgroundPosition: 'center 30%', transform: 'scale(1.06)' }}
              />
              {/* Deep cinematic overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,9,26,0.25) 0%, rgba(6,9,26,0.10) 25%, rgba(6,9,26,0.65) 60%, rgba(6,9,26,1) 100%)' }} />
              {/* Ambient purple glow at bottom */}
              <div
                className="pointer-events-none absolute"
                style={{ bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: '360px', height: '280px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.22) 0%, transparent 70%)', filter: 'blur(50px)' }}
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
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#A78BFA', boxShadow: '0 0 6px rgba(167,139,250,0.9)' }} />
                  Protocolo Sono Profundo · Noite 1 Gratuita
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

                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.35, ease: 'easeOut' }}
                  onClick={handleHeroButtonClick}
                  disabled={checkoutLoading}
                  className="mt-9 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', boxShadow: '0 10px 48px rgba(124,58,237,0.60), 0 2px 10px rgba(0,0,0,0.35)' }}
                >
                  {checkoutLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Play className="h-4 w-4" fill="currentColor" />
                  }
                  {checkoutLoading ? 'Carregando…' : 'Iniciar Noite 1 grátis'}
                </motion.button>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-3 text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                >
                  Sem cadastro · Sem cartão · Acesso imediato
                </motion.p>
              </div>
            </section>

            {/* ── Night 1 Featured Card ───────────────────────────── */}
            <section className="mx-auto max-w-lg px-4 pt-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 65, damping: 18 }}
                onClick={() => { const n = PROTOCOL_NIGHTS[0]; if (n) handleNightClick(n); }}
                className="group relative overflow-hidden rounded-[28px] cursor-pointer"
                style={{
                  background: 'linear-gradient(150deg, rgba(124,58,237,0.20) 0%, rgba(167,139,250,0.07) 100%)',
                  border: '1px solid rgba(167,139,250,0.28)',
                  boxShadow: '0 12px 50px rgba(124,58,237,0.22), 0 2px 16px rgba(0,0,0,0.35)',
                }}
              >
                {/* Top-right ambient glow */}
                <div className="pointer-events-none absolute" style={{ top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,181,253,0.14) 0%, transparent 70%)' }} />

                {/* Hero image */}
                {PROTOCOL_NIGHTS[0]?.imageUrl ? (
                  <div className="relative w-full overflow-hidden rounded-t-[28px]" style={{ height: '200px' }}>
                    <img
                      src={PROTOCOL_NIGHTS[0].imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,9,26,0.10) 0%, rgba(6,9,26,0.80) 100%)' }} />
                    {/* Free badge over image */}
                    <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
                        style={{ background: 'rgba(167,139,250,0.22)', border: '1px solid rgba(167,139,250,0.42)', color: '#E9D5FF', backdropFilter: 'blur(10px)' }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#C4B5FD', boxShadow: '0 0 5px rgba(196,181,253,0.9)' }} />
                        Gratuita
                      </span>
                      <span className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {PROTOCOL_NIGHTS[0]?.duration}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-t-[28px]" style={{ background: PROTOCOL_NIGHTS[0]?.gradient }} />
                )}

                {/* Card body */}
                <div className="px-5 pt-5 pb-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: 'rgba(196,181,253,0.55)' }}>Noite 1</p>
                  <h3 className="font-display text-[21px] font-bold text-white leading-snug mb-2">
                    {PROTOCOL_NIGHTS[0]?.title ?? 'O Sinal de Repouso'}
                  </h3>
                  <p className="text-[13px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.48)' }}>
                    {PROTOCOL_NIGHTS[0]?.description ?? 'Áudio guiado que ensina seu sistema nervoso a reconhecer o sinal para dormir.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
                      style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', boxShadow: '0 6px 20px rgba(124,58,237,0.50)' }}
                    >
                      <Play className="h-4 w-4 text-white ml-0.5" fill="currentColor" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">Iniciar agora</p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Sem cadastro · Sem cartão</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {/* ── Protocol preview — Noites 2-7 ─────────────────── */}
            <section className="mx-auto max-w-lg px-4 pt-10 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 65, damping: 18, delay: 0.05 }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(167,139,250,0.45)' }}>O protocolo completo</p>
                <h3 className="font-display text-[20px] font-bold text-white mb-2 leading-snug">
                  6 noites que aprofundam o processo.
                </h3>
                <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Cada sessão condiciona uma camada diferente do estado de alerta.
                </p>

                {/* Compact locked list */}
                <div className="space-y-2">
                  {PROTOCOL_NIGHTS.slice(1).map((night, idx) => (
                    <motion.div
                      key={night.id}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20, delay: idx * 0.04 }}
                      onClick={() => handleNightClick(night)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div
                        className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.18)' }}
                      >
                        <span className="text-[12px] font-bold" style={{ color: 'rgba(196,181,253,0.55)' }}>{night.night}</span>
                      </div>
                      <p className="flex-1 text-[13px] font-medium line-clamp-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{night.title}</p>
                      <Lock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.20)' }} />
                    </motion.div>
                  ))}
                </div>

                {/* Unlock block */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ type: 'spring', stiffness: 65, damping: 18, delay: 0.25 }}
                  className="mt-5 relative overflow-hidden rounded-2xl px-5 py-5 text-center"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(167,139,250,0.07) 100%)', border: '1px solid rgba(167,139,250,0.20)' }}
                >
                  <div className="pointer-events-none absolute" style={{ top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 70%)' }} />
                  <p className="text-[13px] leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Desbloqueie as 7 noites por
                  </p>
                  <p className="font-display text-[26px] font-bold text-white mb-1">R$37</p>
                  <p className="text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.32)' }}>Pagamento único · Sem mensalidade · Acesso imediato</p>
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-bold text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #7B5FD4 0%, #5A3DB0 100%)', boxShadow: '0 6px 24px rgba(107,79,187,0.45)' }}
                  >
                    Desbloquear protocolo completo
                  </button>
                </motion.div>
              </motion.div>
            </section>

            {/* ── What changes (guest) ───────────────────────────── */}
            <section className="mx-auto max-w-lg px-4 pt-10 pb-8 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ type: 'spring', stiffness: 65, damping: 18 }}
                className="space-y-3"
              >
                {[
                  { icon: Activity, text: 'Sua respiração desacelera — sem você tentar. Seu peito afrouxa. Os pensamentos perdem força.', color: '#A78BFA' },
                  { icon: Zap,      text: 'Você para de calcular quantas horas de sono ainda dá pra pegar. Sua mente solta.', color: '#A78BFA' },
                  { icon: TrendingUp, text: 'Cada noite aprofunda mais. No 7º dia, seu corpo já sabe o que fazer — sem o áudio.', color: '#34D399' },
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
          </>
        ) : (
          /* ════════════════════════════════════════════════════════
             STANDARD LAYOUT — authenticated / paid users
             ════════════════════════════════════════════════════════ */
          <>
            {/* ── Standard Hero ───────────────────────────────── */}
            <section className="relative flex min-h-[600px] flex-col overflow-hidden sm:min-h-[680px]">
              <div className="absolute left-4 top-4 right-4 z-20 flex items-center justify-between sm:left-6 sm:top-6">
                <button
                  onClick={() => navigate('/app')}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute inset-0 bg-cover" style={{ backgroundImage: 'url("/images/meditacoes-sono-hero.webp")', backgroundPosition: 'center center', transform: 'scale(1.05)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.38) 55%, rgba(6,9,26,1) 100%)' }} />
              <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center px-6 pt-24 pb-16 text-center sm:max-w-md sm:px-8 sm:pt-28 sm:pb-20">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 sm:text-xs">7 Noites · Protocolo Progressivo</p>
                <h1
                  className="mt-4 font-display text-[2rem] font-bold text-white sm:text-[2.75rem] leading-[1.12]"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.35)' }}
                >
                  Você deita.<br />
                  <span style={{ color: '#C4B5FD', fontStyle: 'italic' }}>Sua mente não desliga.</span>
                </h1>
                <p className="mt-3 text-sm text-white/60 font-light leading-relaxed sm:text-[0.95rem]">
                  7 noites. Cada uma resolve uma camada diferente do que te mantém acordado.
                </p>
                <div className="mt-10 flex w-full flex-col gap-2.5 sm:mt-11">
                  {[
                    { icon: Moon,        label: 'Adormecer mais rápido' },
                    { icon: ShieldCheck, label: 'Reduzir despertares noturnos' },
                    { icon: Wind,        label: 'Diminuir ansiedade antes de deitar' },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="flex w-full items-center gap-3 rounded-full px-5 py-2.5 text-sm font-medium text-white" style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.28)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 14px rgba(0,0,0,0.18)' }}>
                      <Icon className="h-4 w-4 text-[#A78BFA] flex-shrink-0" strokeWidth={2} />
                      {label}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleHeroButtonClick}
                  disabled={checkoutLoading}
                  className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full py-3.5 text-sm font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 sm:mt-9 sm:py-4 sm:text-base disabled:opacity-70 disabled:cursor-not-allowed"
                  style={
                    !isPaid && completedCount > 0
                      ? { background: 'linear-gradient(135deg, #7B5FD4 0%, #5A3DB0 100%)', boxShadow: '0 8px 28px rgba(107,79,187,0.45)' }
                      : { background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.2)' }
                  }
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPaid && completedCount < 7 ? <Play className="h-4 w-4 text-[#A78BFA]" fill="currentColor" /> : null}
                  {checkoutLoading ? 'Abrindo pagamento…' : heroButtonLabel}
                </button>
              </div>
            </section>

            {/* ── Identification Block ─────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 pt-8 pb-2 sm:px-8">
              <motion.div className="rounded-3xl px-5 py-5 sm:px-6 sm:py-6" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <p className="text-[15px] text-white/65 sm:text-base leading-relaxed">
                  Você não tem dificuldade para dormir.{' '}
                  <span className="text-white/85">Você tem dificuldade para desligar.</span>
                  {' '}Seu sistema nervoso ainda acredita que precisa estar em alerta. Essas 7 noites ensinam ele a parar.
                </p>
              </motion.div>
            </section>

            {/* ── Progress ─────────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 pt-6 pb-2 sm:px-8">
              <motion.div className="rounded-3xl px-5 py-5 sm:px-6" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.05 }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-semibold text-white/70">{completedCount === 7 ? 'Programa concluído!' : `Noite ${nextNight} de 7`}</p>
                  <span className="text-[13px] font-bold text-[#A78BFA]">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #A78BFA, #7C3AED)' }} />
                </div>
                <p className="mt-2 text-[12px] text-white/35">{completedCount} de 7 noites concluídas</p>
              </motion.div>
            </section>

            {/* ── Unlock Banner (non-paid, non-guest) ──────────── */}
            {!isPaid && (
              <section className="mx-auto max-w-4xl px-4 pt-6 pb-2 sm:px-8">
                <motion.div className="relative overflow-hidden rounded-3xl" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 70, damping: 20 }} style={{ background: 'linear-gradient(135deg, #07192E 0%, #0D2E4F 40%, #0F4476 100%)', boxShadow: '0 16px 48px rgba(7,25,46,0.60), 0 4px 16px rgba(167,139,250,0.10)' }}>
                  <div className="pointer-events-none absolute" style={{ top: '-40px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 65%)' }} />
                  <div className="relative z-10 px-5 py-6 sm:px-6">
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(196,181,253,0.6)', letterSpacing: '0.2em' }}>Oferta por tempo limitado</p>
                    <p className="font-display text-[20px] font-semibold text-white leading-snug mb-1">Desbloqueie as 7 noites.</p>
                    <p className="text-[13px] text-white/45 mb-5">Pagamento único de R$ 37. Sem mensalidade. Acesso imediato.</p>
                    <button onClick={openCheckout} disabled={checkoutLoading} className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-[14px] font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #7B5FD4 0%, #5A3DB0 100%)', boxShadow: '0 8px 28px rgba(107,79,187,0.45)' }}>
                      {checkoutLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {checkoutLoading ? 'Abrindo pagamento…' : 'Garantir acesso — R$ 37 →'}
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.25), transparent)' }} />
                </motion.div>
              </section>
            )}

            {/* ── Night Cards ───────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
              <motion.div className="space-y-3" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}>
                {PROTOCOL_NIGHTS.map((night) => {
                  const accessible = isNightAccessible(night.night, completedNights, isPaid, isVipUser, night.isFree);
                  const completed = completedNights.has(night.night);
                  const paidLocked = !night.isFree && !isPaid;
                  const sequentialLocked = !paidLocked && !accessible;
                  const comingSoon = accessible && !night.hasAudio;
                  return (
                    <motion.div key={night.id} variants={cardVariant} onClick={() => handleNightClick(night)} className={`group relative flex items-center gap-4 overflow-hidden rounded-3xl p-4 transition-all duration-200 ${sequentialLocked ? 'opacity-40 cursor-not-allowed' : comingSoon ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'}`} style={{ background: completed ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.05)', border: completed ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden">
                        {night.imageUrl ? <img src={night.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="absolute inset-0" style={{ background: night.gradient }} />}
                        <div className="absolute inset-0" style={{ background: night.gradient, opacity: 0.45 }} />
                        {!completed && !sequentialLocked && <div className="absolute inset-0 flex items-center justify-center"><span className="text-[13px] font-bold text-white/80 drop-shadow">{night.night}</span></div>}
                        {completed && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.25)' }}><Check className="h-5 w-5 text-white" strokeWidth={2.5} /></div>}
                        {sequentialLocked && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Lock className="h-4 w-4 text-white/50" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-0.5">Noite {night.night}</p>
                        <h3 className="font-display text-[15px] sm:text-[16px] font-semibold leading-snug text-white line-clamp-1">{night.title}</h3>
                        <p className="mt-0.5 text-[12px] text-white/45 line-clamp-1">{night.description}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[11px] text-white/35 font-medium">{night.duration}</span>
                        {paidLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: 'rgba(167,139,250,0.20)', border: '1px solid rgba(167,139,250,0.35)' }}><Lock size={10} />R$ 37</span>
                        ) : comingSoon ? (
                          <span className="text-[11px] font-medium text-white/30 px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>Em breve</span>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110" style={{ background: sequentialLocked ? 'rgba(255,255,255,0.05)' : completed ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.12)', border: sequentialLocked ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.18)' }}>
                            <Play className={`h-4 w-4 ${sequentialLocked ? 'text-white/15' : 'text-white/70'}`} fill="currentColor" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>

            {/* ── SOS Bonus ─────────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 pt-2 pb-4 sm:px-8">
              <motion.div
                onClick={() => { if (!isPaid) return; navigate('/app/meditation-player', { state: { meditation: { id: 'sos_track', title: 'SOS: Não Consigo Dormir Hoje', duration: '5 min', audioUrl: '/audio/sos-nao-consigo-dormir.mp3', imageUrl: '/images/meditacoes-sono-hero.webp', backgroundMusic: 'Sono', gradient: 'linear-gradient(to bottom, #8A4A4A 0%, #2E1414 100%)', category: 'sono' }, returnTo: '/app/meditacoes-sono' } }); }}
                className={`flex items-center gap-4 rounded-3xl p-4 transition-all duration-200 ${isPaid ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : 'opacity-40 cursor-not-allowed'}`}
                style={{ background: isPaid ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)', border: isPaid ? '1px solid rgba(251,191,36,0.20)' : '1px solid rgba(255,255,255,0.06)' }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: isPaid ? 1 : 0.4, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ type: 'spring', stiffness: 70, damping: 20 }}
              >
                <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: isPaid ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', border: isPaid ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
                  {isPaid ? <Gift className="h-6 w-6 text-amber-400" /> : <Lock className="h-5 w-5 text-white/25" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: isPaid ? 'rgba(251,191,36,0.60)' : 'rgba(255,255,255,0.25)' }}>Áudio Extra</p>
                  <h3 className="font-display text-[15px] font-semibold text-white leading-snug">SOS: Não Consigo Dormir Hoje</h3>
                  <p className="mt-0.5 text-[12px] text-white/40">Para quando nada está funcionando e o teto parece longe demais.</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className="text-[11px] text-white/30">5 min</span>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: isPaid ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)', color: isPaid ? '#FBBF24' : 'rgba(255,255,255,0.25)' }}>
                    {isPaid ? 'Disponível' : 'Premium'}
                  </span>
                </div>
              </motion.div>
            </section>

            {/* ── Why It Works ─────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 pt-6 pb-12 sm:px-8">
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ type: 'spring', stiffness: 70, damping: 20 }}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A78BFA]/50 mb-2" style={{ letterSpacing: '0.2em' }}>O que muda</p>
                <h3 className="font-display text-[20px] font-bold text-white mb-6">O que acontece quando você para de lutar.</h3>
                <div className="space-y-3">
                  {[
                    { icon: Activity, text: 'Sua respiração desacelera — sem você tentar. Seu peito afrouxa. Os pensamentos perdem força.', color: '#A78BFA' },
                    { icon: Zap,      text: 'Você para de calcular quantas horas de sono ainda dá pra pegar. Sua mente solta.', color: '#A78BFA' },
                    { icon: TrendingUp, text: 'Cada noite aprofunda mais. No 7º dia, seu corpo já sabe o que fazer — sem o áudio.', color: '#34D399' },
                  ].map(({ icon: Icon, text, color }, i) => (
                    <motion.div key={i} className="flex items-start gap-4 rounded-3xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ type: 'spring', stiffness: 70, damping: 20, delay: i * 0.08 }}>
                      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <p className="text-[14px] text-white/55 leading-relaxed pt-1">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </section>
          </>
        )}

        {/* ── Offer modal (guest sono) — shared ─────────────────── */}
        <SonoPostExperienceModal
          open={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          onCheckout={handleGuestCheckout}
          checkoutLoading={checkoutLoading}
        />

      </main>
    </div>
  );
}
