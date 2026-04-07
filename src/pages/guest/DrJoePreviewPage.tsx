import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';
import { useGuest } from '@/hooks/useGuest';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetchJson } from '@/lib/apiFetch';

// ─── Constantes ──────────────────────────────────────────────────────────────

const SINTONIZE_MEDITATION = {
  id: 'blessing_2',
  title: 'Sintonize Novos Potenciais',
  duration: '7 min',
  audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
  imageUrl: '/images/meditacao-novos-potenciais.webp',
  backgroundMusic: 'Cristais',
  gradient:
    'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
  category: 'dr_joe_dispenza',
} as const;

// A/B testável — ajustar entre 65–80s conforme experimento
const PREVIEW_DURATION = 70;          // segundos de preview
const FADE_START       = PREVIEW_DURATION - 3; // começa fade 3s antes do corte
const IMPACT_DELAY_MS  = 2000;        // ms na tela de impacto antes do modal

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Stage = 'idle' | 'playing' | 'impact' | 'signup' | 'offer' | 'locked';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Variants ────────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
  exit:   { opacity: 0, transition: { duration: 0.35 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 16, scale: 0.99 },
  visible: (d = 0) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const, delay: d },
  }),
};

const slideUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { opacity: 0, y: 16, transition: { duration: 0.3 } },
};

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DrJoePreviewPage() {
  const navigate     = useNavigate();
  const { guestUser } = useGuest();
  const { register } = useAuth();

  // Funil
  const [stage, setStage]       = useState<Stage>('idle');
  const [currentTime, setCurrentTime] = useState(0);

  // Checkout modal
  const [checkoutOpen,    setCheckoutOpen]    = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError,   setCheckoutError]   = useState('');

  // Formulário de cadastro
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [formError,   setFormError]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed,   setConfirmed]   = useState(false); // needs email confirmation

  // Refs
  const audioRef    = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<number | null>(null);

  // ── Tracking: page view ───────────────────────────────────────────────────
  useEffect(() => {
    mixpanel.track('Guest Dr Joe Preview Viewed', {
      source:    'minigame_completion',
      guestId:   guestUser?.id ?? null,
      timestamp: new Date().toISOString(),
    });
  }, [guestUser?.id]);

  // ── Audio progress + fade-out + corte ────────────────────────────────────
  useEffect(() => {
    if (stage !== 'playing') {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;

    intervalRef.current = window.setInterval(() => {
      const t = audio.currentTime;
      setCurrentTime(t);

      // Fade-out suave nos últimos 3s
      if (t >= FADE_START) {
        const pct = (t - FADE_START) / 3;
        audio.volume = Math.max(0, 1 - pct);
      }

      // Corte ao atingir preview
      if (t >= PREVIEW_DURATION) {
        audio.pause();
        window.clearInterval(intervalRef.current!);

        mixpanel.track('Guest Practice Cut', {
          source:          'dr_joe_preview',
          guestId:         guestUser?.id ?? null,
          elapsed_seconds: Math.round(t),
          tempo_ate_corte: PREVIEW_DURATION,
          origem:          'minigame',
          etapa_funil:     'preview_cut',
          timestamp:       new Date().toISOString(),
        });

        setStage('impact');
      }
    }, 150);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [stage, guestUser?.id]);

  // ── Auto-avanço: impact → signup ──────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'impact') return;

    mixpanel.track('Guest Impact Screen Viewed', {
      guestId:     guestUser?.id ?? null,
      origem:      'minigame',
      etapa_funil: 'after_preview_cut',
      timestamp:   new Date().toISOString(),
    });

    const t = window.setTimeout(() => {
      setStage('offer');
    }, IMPACT_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [stage, guestUser?.id]);

  // ── Cleanup ao desmontar ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleStartPractice() {
    mixpanel.track('Guest Practice CTA Clicked', {
      source: 'dr_joe_preview', guestId: guestUser?.id ?? null, timestamp: new Date().toISOString(),
    });

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume     = 1;
    audio.currentTime = 0;

    audio.play()
      .then(() => {
        mixpanel.track('Guest Practice Started', {
          source: 'dr_joe_preview', guestId: guestUser?.id ?? null, timestamp: new Date().toISOString(),
        });
      })
      .catch(() => {/* autoplay bloqueado — UI ainda avança */});

    setStage('playing');
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    mixpanel.track('Guest Signup Started', {
      guestId: guestUser?.id ?? null, origem: 'minigame', timestamp: new Date().toISOString(),
    });

    try {
      const nome = email.split('@')[0];
      const { needsConfirmation } = await register(email, password, nome, '');

      mixpanel.track('User Signed Up From Guest Funnel', {
        guestId: guestUser?.id ?? null, needs_confirmation: needsConfirmation, timestamp: new Date().toISOString(),
      });

      if (needsConfirmation) {
        setConfirmed(true);
      } else {
        navigate('/app/meditation-player', {
          state: { meditation: { ...SINTONIZE_MEDITATION } },
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseSignup() {
    setStage('offer');
  }

  async function startCheckout(source: string = 'offer', step: string = 'offer') {
    mixpanel.track('Guest Offer Clicked', {
      guestId:         guestUser?.id ?? null,
      produto:         'dr_joe_colecao',
      source,
      etapa_funil:     step,
      meditation:      'sintonize_novos_potenciais',
      tempo_ate_corte: PREVIEW_DURATION,
      timestamp:       new Date().toISOString(),
    });

    setCheckoutError('');
    setCheckoutLoading(true);
    setCheckoutOpen(true);

    try {
      const result = await apiFetchJson<{ init_point: string; external_reference: string }>(
        '/api/mp/create-preference',
        {
          method: 'POST',
          body: JSON.stringify({
            productKey: 'dr_joe_colecao',
            origin: source,
            siteUrl: window.location.origin,
          }),
        },
      );

      if (!result.ok || !(result.data as { init_point?: string })?.init_point) {
        const msg = (result.data as { message?: string })?.message;
        throw new Error(msg || 'Não foi possível iniciar o pagamento.');
      }

      const { init_point, external_reference } = result.data as {
        init_point: string;
        external_reference: string;
      };

      // Persiste para a página de obrigado recuperar após redirect
      sessionStorage.setItem('eco.drjoe.external_reference', external_reference);

      mixpanel.track('Guest Checkout Started', {
        guestId:          guestUser?.id ?? null,
        source,
        etapa_funil:      step,
        external_reference,
        meditation:       'sintonize_novos_potenciais',
        tempo_ate_corte:  PREVIEW_DURATION,
        timestamp:        new Date().toISOString(),
      });

      // Redireciona para o checkout do Mercado Pago
      window.location.href = init_point;
    } catch (err) {
      setCheckoutLoading(false);
      setCheckoutError(err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento. Tente novamente.');
    }
  }

  // ─── Derivados ─────────────────────────────────────────────────────────────

  const progressPct = Math.min((currentTime / PREVIEW_DURATION) * 100, 100);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-[100dvh] bg-[#070A12] font-primary">

      {/* Áudio — fora do fluxo visual */}
      <audio ref={audioRef} src={SINTONIZE_MEDITATION.audioUrl} preload="auto" />

      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 700px 500px at 50% 10%, rgba(110,200,255,0.10) 0%, transparent 65%)',
            'radial-gradient(ellipse 400px 300px at 15% 85%, rgba(59,130,246,0.06) 0%, transparent 60%)',
            'linear-gradient(170deg, #070A12 0%, #0B1220 55%, #080C18 100%)',
          ].join(', '),
        }}
      />

      {/* ── STAGE: IDLE ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.main
            key="idle"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col justify-center px-6 py-14 text-center"
          >
            {/* Ícone conclusão */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10"
              style={{ boxShadow: '0 0 0 10px rgba(110,200,255,0.05), 0 0 0 22px rgba(59,130,246,0.03)' }}
            >
              <svg className="h-6 w-6 text-eco-baby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={0.08}
              className="font-display text-[1.75rem] font-bold leading-[1.25] text-white sm:text-[2.1rem]"
            >
              Seu corpo já começou<br />
              <span className="text-eco-baby">a reconhecer esse novo estado</span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={0.18}
              className="mt-5 text-[0.9375rem] leading-[1.7] text-white/55"
            >
              Agora é hora de aprofundar isso.<br />
              Você vai começar a condicionar seu corpo a esse novo estado,
              através de uma prática guiada.
            </motion.p>

            {/* Card próximo passo */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.28}
              className="mt-8 w-full rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-left backdrop-blur-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Próximo passo</p>
              <p className="mt-3 text-[1.0625rem] font-semibold text-white/90">{SINTONIZE_MEDITATION.title}</p>
              <p className="mt-1 text-sm leading-snug text-white/45">Uma prática para alinhar mente e corpo com o novo estado</p>
              <p className="mt-3 text-xs text-white/30">Dr. Joe Dispenza · {SINTONIZE_MEDITATION.duration}</p>
              <div className="mt-5 flex h-12 items-center gap-1 px-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-white/[0.08]"
                    style={{ height: `${8 + Math.sin(i * 0.7) * 6}px` }}
                  />
                ))}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0.38} className="mt-8">
              <button
                onClick={handleStartPractice}
                className="w-full rounded-full py-[15px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.015] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                  boxShadow: '0 14px 40px rgba(110,200,255,0.16)',
                }}
              >
                Iniciar prática
              </button>
              <p className="mt-3 text-center text-[11px] text-white/25">Sem cadastro · experiência gratuita</p>
            </motion.div>
          </motion.main>
        )}

        {/* ── STAGE: PLAYING ──────────────────────────────────────────────────── */}
        {stage === 'playing' && (
          <motion.main
            key="playing"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col items-center justify-center px-6 py-14"
          >
            {/* Orb pulsante */}
            <div className="relative flex items-center justify-center">
              {[60, 92, 124].map((size, i) => (
                <motion.div
                  key={size}
                  className="absolute rounded-full border"
                  style={{
                    width: size, height: size,
                    borderColor: `rgba(110,200,255,${0.18 - i * 0.05})`,
                  }}
                  animate={{ scale: [1, 1.12 - i * 0.02, 1], opacity: [0.5 - i * 0.12, 0.9 - i * 0.18, 0.5 - i * 0.12] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                />
              ))}
              <div
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-eco-baby/15"
                style={{ boxShadow: '0 0 28px rgba(110,200,255,0.22)' }}
              >
                <svg className="h-6 w-6 text-eco-baby" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zM9.5 8.5a1 1 0 011-1h.01a1 1 0 011 1v7a1 1 0 01-1 1H10.5a1 1 0 01-1-1v-7zm3.99 0a1 1 0 011-1h.01a1 1 0 011 1v7a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-7z" />
                </svg>
              </div>
            </div>

            {/* Título */}
            <p className="mt-10 text-lg font-semibold text-white/90">{SINTONIZE_MEDITATION.title}</p>
            <p className="mt-1 text-sm text-white/40">Dr. Joe Dispenza</p>

            {/* Waveform animada — CSS animation para evitar re-renders */}
            <style>{`
              @keyframes eco-bar {
                0%, 100% { transform: scaleY(0.25); }
                50%       { transform: scaleY(1); }
              }
            `}</style>
            <div className="mt-8 flex w-full max-w-xs items-center justify-center gap-[3px]" style={{ height: 32 }}>
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full bg-eco-baby/55"
                  style={{
                    width: 3,
                    height: 24,
                    transformOrigin: 'center',
                    animation: `eco-bar ${0.7 + (i % 6) * 0.12}s ease-in-out infinite`,
                    animationDelay: `${i * 0.045}s`,
                  }}
                />
              ))}
            </div>

            {/* Barra de progresso */}
            <div className="mt-6 w-full max-w-xs">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-eco-baby/70"
                  style={{ width: `${progressPct}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-white/30">
                <span>{fmt(currentTime)}</span>
                <span>{fmt(PREVIEW_DURATION)}</span>
              </div>
            </div>

            <p className="mt-8 text-[11px] text-white/20">Feche os olhos e respire fundo</p>
          </motion.main>
        )}

        {/* ── STAGE: IMPACT ───────────────────────────────────────────────────── */}
        {stage === 'impact' && (
          <motion.main
            key="impact"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col items-center justify-center px-6 py-14 text-center"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[1.75rem] font-bold leading-[1.35] text-white sm:text-[2rem]"
            >
              Você sentiu isso?
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 text-[0.9375rem] leading-[1.8] text-white/50"
            >
              Esse é o início.<br />
              Mas é na repetição que isso começa<br />a mudar de verdade.
            </motion.p>
          </motion.main>
        )}

        {/* ── STAGE: SIGNUP ───────────────────────────────────────────────────── */}
        {stage === 'signup' && (
          <motion.div
            key="signup"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 z-20 flex items-end justify-center sm:items-center"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#070A12]/80 backdrop-blur-sm" />

            {/* Card */}
            <motion.div
              variants={slideUp} initial="hidden" animate="visible" exit="exit"
              className="relative z-10 w-full max-w-[480px] rounded-t-3xl border border-white/[0.08] bg-[#0C1525] px-6 pb-10 pt-8 sm:rounded-3xl"
            >
              {/* Fechar */}
              <button
                onClick={handleCloseSignup}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:text-white/70"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              {confirmed ? (
                /* Confirmação de e-mail */
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10">
                    <svg className="h-5 w-5 text-eco-baby" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-white/90">Confirme seu e-mail</p>
                  <p className="mt-2 text-sm text-white/45">Enviamos um link para <span className="text-white/70">{email}</span>. Clique nele para ativar sua conta e continuar a prática.</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    Continue exatamente de onde parou
                  </p>
                  <h3 className="mt-2 text-[1.125rem] font-bold leading-snug text-white/95">
                    Crie sua conta para salvar esse progresso
                    e continuar a prática
                  </h3>

                  <form onSubmit={handleSignup} noValidate className="mt-6 space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setFormError(''); }}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white/90 placeholder:text-white/30 focus:border-eco-baby/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/15"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Crie uma senha (mín. 6 caracteres)"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormError(''); }}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-white/90 placeholder:text-white/30 focus:border-eco-baby/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/15"
                    />

                    {formError && (
                      <p className="text-xs text-red-400/80">{formError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !email || !password}
                      className="w-full rounded-full py-[14px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                        boxShadow: '0 10px 30px rgba(110,200,255,0.14)',
                      }}
                    >
                      {isSubmitting ? 'Criando conta…' : 'Continuar minha experiência'}
                    </button>
                  </form>

                  <p className="mt-3 text-center text-[11px] text-white/25">
                    Leva menos de 30 segundos · Gratuito
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── STAGE: OFFER ────────────────────────────────────────────────────── */}
        {stage === 'offer' && (
          <motion.main
            key="offer"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col justify-center px-6 py-14"
          >
            <motion.div variants={slideUp} initial="hidden" animate="visible"
              className="w-full rounded-3xl border border-white/[0.08] bg-white/[0.04] p-7 backdrop-blur-sm"
            >
              {/* Headline */}
              <h2 className="font-display text-2xl font-bold leading-snug text-white">
                Você já ativou algo dentro de você.
                <br />
                <span className="text-eco-baby">Agora é sobre sustentar isso.</span>
              </h2>

              {/* Subhead */}
              <p className="mt-4 text-sm leading-[1.85] text-white/55">
                Esse estado que você sentiu…
                <br /><br />
                não é imaginação.
                <br /><br />
                É o começo de uma nova forma de funcionar.
              </p>

              {/* Benefícios */}
              <ul className="mt-5 space-y-2">
                {[
                  'Sustentar esse estado no seu dia a dia',
                  'Ensinar seu corpo a viver esse novo padrão',
                  'Criar coerência entre pensamento e emoção',
                  'Tornar essa experiência real, não passageira',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-eco-baby/60" />
                    <span className="text-sm text-white/65">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Frase de quebra */}
              <p className="mt-5 text-sm leading-[1.85] text-white/40">
                Não é sobre entender.
                <br /><br />
                É sobre repetir até se tornar você.
              </p>

              {/* Oferta */}
              <div className="mt-5 border-t border-white/[0.07] pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Acesso completo à prática
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Meditações guiadas para sustentar esse estado
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-white">R$&nbsp;37</span>
                  <span className="text-sm text-white/35">· acesso vitalício</span>
                </div>
              </div>

              {/* CTA principal */}
              <button
                onClick={() => startCheckout('guest_funnel', 'offer')}
                className="mt-6 w-full rounded-full py-[14px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.015] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                  boxShadow: '0 14px 40px rgba(110,200,255,0.16)',
                }}
              >
                Continuar essa experiência
              </button>

              <p className="mt-2 text-center text-[11px] text-white/25">
                Acesso imediato · Você já começou — não pare agora.
              </p>

              {/* CTA secundário */}
              <button
                onClick={() => {
                  mixpanel.track('Guest Signup Modal Viewed', {
                    guestId: guestUser?.id ?? null, origem: 'offer', etapa_funil: 'offer', timestamp: new Date().toISOString(),
                  });
                  setStage('signup');
                }}
                className="mt-3 w-full rounded-full border border-white/10 py-[11px] text-[0.875rem] font-medium text-white/35 transition-all hover:border-white/20 hover:text-white/55 active:scale-[0.98]"
              >
                Salvar meu progresso
              </button>
            </motion.div>
          </motion.main>
        )}
        {/* ── STAGE: LOCKED ───────────────────────────────────────────────────── */}
        {stage === 'locked' && (
          <motion.main
            key="locked"
            variants={fadeIn} initial="hidden" animate="visible" exit="exit"
            className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col items-center justify-center px-6 py-14"
          >
            {/* Player congelado — mesma UI do playing, porém estático */}
            <div className="relative flex items-center justify-center">
              {[60, 92, 124].map((size, i) => (
                <div
                  key={size}
                  className="absolute rounded-full border"
                  style={{
                    width: size, height: size,
                    borderColor: `rgba(110,200,255,${0.08 - i * 0.02})`,
                  }}
                />
              ))}
              <div
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]"
              >
                {/* Ícone de cadeado */}
                <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m6-6V9a4 4 0 00-8 0v2M5 11h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z" />
                </svg>
              </div>
            </div>

            <p className="mt-10 text-base font-semibold text-white/40">{SINTONIZE_MEDITATION.title}</p>
            <p className="mt-1 text-sm text-white/25">Dr. Joe Dispenza</p>

            {/* Barra congelada no ponto do corte */}
            <div className="mt-8 w-full max-w-xs">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-white/20" style={{ width: '100%' }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-white/20">
                <span>{fmt(PREVIEW_DURATION)}</span>
                <span>{fmt(PREVIEW_DURATION)}</span>
              </div>
            </div>

            {/* Impacto residual */}
            <p className="mt-10 text-[0.875rem] text-white/35 text-center">
              Você estava no caminho certo.
            </p>

            {/* CTAs */}
            <div className="mt-5 w-full max-w-xs space-y-3 text-center">
              <button
                onClick={() => startCheckout('guest_funnel', 'locked')}
                className="w-full rounded-full py-[14px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                  boxShadow: '0 14px 40px rgba(110,200,255,0.14)',
                }}
              >
                Continuar essa experiência
              </button>
              <button
                onClick={() => {
                  mixpanel.track('Guest Signup Modal Viewed', {
                    guestId: guestUser?.id ?? null, origem: 'locked', etapa_funil: 'locked', timestamp: new Date().toISOString(),
                  });
                  setStage('signup');
                }}
                className="w-full rounded-full border border-white/10 py-[13px] text-[0.875rem] font-semibold text-white/50 transition-all hover:border-white/20 hover:text-white/70 active:scale-[0.98]"
              >
                Salvar meu progresso
              </button>
              <button
                onClick={() => setStage('offer')}
                className="w-full text-[11px] text-white/20 underline underline-offset-2 transition-colors hover:text-white/40"
              >
                Ver opções de acesso
              </button>
            </div>
          </motion.main>
        )}

      </AnimatePresence>

      {/* ── CHECKOUT MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            key="checkout-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => { if (!checkoutLoading) setCheckoutOpen(false); }}
            />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0C1525] p-8 text-center"
              style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.55)' }}
            >
              {/* Fechar — só quando não está carregando */}
              {!checkoutLoading && (
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:text-white/70"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {checkoutLoading ? (
                <>
                  {/* Pulsing orb enquanto redireciona */}
                  <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-full border border-eco-baby/25"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <Loader2 className="h-7 w-7 animate-spin text-eco-baby/80" />
                  </div>
                  <p className="text-[0.9375rem] font-semibold text-white/90">
                    Preparando seu pagamento…
                  </p>
                  <p className="mt-2 text-sm text-white/40">
                    Você será redirecionado em instantes.
                  </p>
                </>
              ) : checkoutError ? (
                <>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{checkoutError}</p>
                  <button
                    onClick={() => startCheckout('offer_retry', 'offer')}
                    className="mt-5 w-full rounded-full py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
                    }}
                  >
                    Tentar novamente
                  </button>
                  <button
                    onClick={() => setCheckoutOpen(false)}
                    className="mt-3 w-full rounded-full border border-white/10 py-2.5 text-sm text-white/35 transition-colors hover:text-white/55"
                  >
                    Voltar
                  </button>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
