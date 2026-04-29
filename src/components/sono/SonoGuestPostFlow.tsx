import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2, X } from 'lucide-react';
import { PROTOCOL_NIGHTS } from '@/data/protocolNights';
import { supabase } from '@/lib/supabaseClient';

interface SonoGuestPostFlowProps {
  onCheckout: () => void;
  checkoutLoading: boolean;
  onDismiss: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type ReflectionAnswer = 'yes' | 'little' | 'no';

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const NIGHTS_2_7 = PROTOCOL_NIGHTS.slice(1);

const VALIDATION: Record<ReflectionAnswer, { lead: string; body: string }> = {
  yes:    { lead: 'Perfeito.',             body: 'Isso significa que seu corpo já respondeu.' },
  little: { lead: 'Isso já é o começo.',   body: 'Seu corpo ainda está aprendendo.' },
  no:     { lead: 'Normal.',               body: 'Na primeira noite, o corpo ainda está saindo do padrão antigo.' },
};

const stepVariants = {
  enter:  { opacity: 0, y: 28 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -18 },
};

function getGuestId(): string {
  return (
    sessionStorage.getItem('eco.sono.guest_id') ||
    localStorage.getItem('eco_guest_id') ||
    `anon_${Math.random().toString(36).slice(2)}`
  );
}

function getSource(): string {
  return sessionStorage.getItem('eco.sono.source') || 'direct';
}

async function upsertEvent(patch: Record<string, unknown>) {
  try {
    await supabase
      .from('sono_guest_flow_events')
      .upsert({ guest_id: getGuestId(), source: getSource(), ...patch }, { onConflict: 'guest_id' });
  } catch {
    // fire-and-forget analytics — swallow errors silently
  }
}

export function SonoGuestPostFlow({ onCheckout, checkoutLoading, onDismiss }: SonoGuestPostFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [answer, setAnswer] = useState<ReflectionAnswer | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const stored = sessionStorage.getItem('eco.sono.offer_expires');
    if (stored) return Math.max(0, parseInt(stored) - Date.now());
    const expires = Date.now() + 15 * 60 * 1000;
    sessionStorage.setItem('eco.sono.offer_expires', String(expires));
    return 15 * 60 * 1000;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const stored = sessionStorage.getItem('eco.sono.offer_expires');
      setTimeLeft(stored ? Math.max(0, parseInt(stored) - Date.now()) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const advance = (to?: Step) => {
    const next = (to ?? (step + 1)) as Step;
    setStep(next);
    upsertEvent({ max_step_reached: next, ...(next === 6 ? { reached_offer: true } : {}) });
  };

  const selectAnswer = (a: ReflectionAnswer) => {
    setAnswer(a);
    upsertEvent({ reflection_answer: a, max_step_reached: 2 });
    setStep(2);
  };

  const handleCheckout = () => {
    upsertEvent({ cta_clicked: true });
    onCheckout();
  };

  const validation = answer ? VALIDATION[answer] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[9998] flex flex-col"
      style={{ background: 'linear-gradient(180deg, #04060F 0%, #080C1E 100%)' }}
    >
      {/* ── Sticky top bar: progress + close ────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-10 pb-4">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5, 6] as Step[]).map(s => (
            <span
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === step ? '18px' : '6px',
                height: '6px',
                background:
                  s < step
                    ? 'rgba(196,181,253,0.45)'
                    : s === step
                    ? '#C4B5FD'
                    : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.40)' }} />
        </button>
      </div>

      {/* ── Scrollable content area ───────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col items-center px-6 pb-10">
        <div className="w-full max-w-[320px] flex flex-col justify-center min-h-full py-4">
          <AnimatePresence mode="wait">

            {/* ── Step 1 — Reflexão ──────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] mb-8" style={{ color: 'rgba(196,181,253,0.50)' }}>
                  Noite 1 · Concluída
                </p>
                <h2
                  className="font-display text-[26px] font-bold text-white leading-snug mb-10"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.60)' }}
                >
                  Você conseguiu sentir<br />
                  <em style={{ color: '#C4B5FD', fontStyle: 'italic' }}>alguma diferença agora?</em>
                </h2>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => selectAnswer('yes')}
                    className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                      boxShadow: '0 8px 28px rgba(107,79,187,0.45)',
                    }}
                  >
                    Sim, relaxei
                  </button>
                  <button
                    onClick={() => selectAnswer('little')}
                    className="w-full rounded-full py-3.5 text-[14px] font-semibold text-white/80 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}
                  >
                    Um pouco
                  </button>
                  <button
                    onClick={() => selectAnswer('no')}
                    className="w-full py-3 text-[13px] text-white/45 transition-colors hover:text-white/65"
                  >
                    Ainda estou agitado
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2 — Validação ─────────────────────── */}
            {step === 2 && validation && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.10, duration: 0.50 }}
                  className="font-display text-[42px] font-bold text-white leading-none mb-5"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.70)' }}
                >
                  {validation.lead}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.50 }}
                  className="text-[17px] leading-relaxed mb-14"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  {validation.body}
                </motion.p>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.48 }}
                  onClick={() => advance()}
                  className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
                >
                  Continuar →
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 3 — Revelação ─────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.55 }}
                  className="font-display text-[28px] font-bold text-white leading-snug mb-5"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.60)' }}
                >
                  O que você sentiu agora…<br />
                  <em style={{ color: '#C4B5FD' }}>não é sorte.</em>
                </motion.h2>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.40, duration: 0.45, ease: 'easeOut' }}
                  className="w-12 h-px mb-5"
                  style={{ background: 'rgba(196,181,253,0.35)' }}
                />

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.50 }}
                  className="space-y-3 mb-14"
                >
                  <p className="font-display text-[22px] font-semibold text-white/90">É um processo.</p>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                    E o seu corpo já começou<br />a responder a ele.
                  </p>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                    Ele só funciona quando<br />existe continuidade.
                  </p>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.75 }}
                  onClick={() => advance()}
                  className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
                >
                  Continuar →
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 4 — Progressão ────────────────────── */}
            {step === 4 && (
              <motion.div
                key="step4"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col"
              >
                <p className="font-display text-[22px] font-bold text-white leading-snug mb-6 text-center">
                  Cada noite resolve<br />
                  <em style={{ color: '#C4B5FD' }}>uma camada diferente:</em>
                </p>

                <div className="space-y-2 mb-8">
                  {NIGHTS_2_7.map((night, idx) => (
                    <motion.div
                      key={night.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + idx * 0.07, duration: 0.38, ease: 'easeOut' }}
                      className="flex items-center gap-3 rounded-2xl overflow-hidden"
                      style={{
                        background: idx === 0 ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.04)',
                        border: idx === 0 ? '1px solid rgba(167,139,250,0.22)' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative flex-shrink-0 overflow-hidden"
                        style={{ width: '44px', height: '44px' }}
                      >
                        {night.imageUrl ? (
                          <img
                            src={night.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{
                              filter: idx === 0
                                ? 'brightness(0.55) saturate(0.7)'
                                : 'brightness(0.30) saturate(0.40)',
                            }}
                          />
                        ) : (
                          <div className="w-full h-full" style={{ background: night.gradient }} />
                        )}
                        {/* Lock overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock
                            className="h-3 w-3"
                            style={{ color: idx === 0 ? 'rgba(196,181,253,0.80)' : 'rgba(255,255,255,0.35)' }}
                          />
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-3 py-3">
                        <span
                          className="block text-[10px] font-bold uppercase tracking-wider mb-0.5"
                          style={{ color: idx === 0 ? 'rgba(196,181,253,0.55)' : 'rgba(255,255,255,0.22)' }}
                        >
                          Noite {night.night}
                        </span>
                        <span
                          className="text-[12px] font-medium leading-tight"
                          style={{ color: idx === 0 ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.40)' }}
                        >
                          {night.title}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => advance()}
                  className="w-full rounded-full py-3.5 text-[14px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}
                >
                  Continuar →
                </button>
              </motion.div>
            )}

            {/* ── Step 5 — Tensão ────────────────────────── */}
            {step === 5 && (
              <motion.div
                key="step5"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Amber radial decoration */}
                <div
                  className="pointer-events-none absolute"
                  style={{
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '240px',
                    height: '240px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 65%)',
                    filter: 'blur(30px)',
                  }}
                />

                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.55 }}
                  className="font-display text-[28px] font-bold text-white leading-snug mb-6 relative z-10"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.70)' }}
                >
                  A maioria das pessoas<br />
                  para{' '}
                  <em style={{ color: 'rgba(251,191,36,0.90)', fontStyle: 'italic' }}>exatamente aqui.</em>
                </motion.h2>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.38, duration: 0.40 }}
                  className="w-8 h-px mb-6 relative z-10"
                  style={{ background: 'rgba(251,191,36,0.35)' }}
                />

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52, duration: 0.50 }}
                  className="text-[16px] leading-relaxed mb-14 relative z-10"
                  style={{ color: 'rgba(255,255,255,0.48)' }}
                >
                  E nunca chega no ponto onde<br />o corpo realmente muda.
                </motion.p>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.72 }}
                  onClick={() => advance()}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97] relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)',
                    boxShadow: '0 10px 32px rgba(107,79,187,0.50)',
                  }}
                >
                  Não vou parar →
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 6 — Oferta ────────────────────────── */}
            {step === 6 && (
              <motion.div
                key="step6"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center text-center"
              >
                {/* Ambient glow */}
                <div
                  className="pointer-events-none absolute"
                  style={{
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '300px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(124,58,237,0.20) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                  }}
                />

                {/* Night progress */}
                <div className="flex items-center gap-1.5 mb-6 relative z-10">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #C4B5FD 0%, #7C3AED 100%)',
                      boxShadow: '0 0 12px rgba(124,58,237,0.60)',
                    }}
                  >
                    ✓
                  </div>
                  {([2, 3, 4, 5, 6, 7] as const).map((n, idx) => (
                    <div
                      key={n}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        opacity: Math.max(0.35, 0.95 - idx * 0.09),
                      }}
                    >
                      <Lock className="h-3 w-3 text-white/30" />
                    </div>
                  ))}
                </div>

                <h2
                  className="font-display text-[22px] font-bold text-white leading-snug mb-5 relative z-10"
                  style={{ textShadow: '0 2px 18px rgba(0,0,0,0.60)' }}
                >
                  Seu corpo já começou a mudar.<br />
                  <span style={{ color: '#C4B5FD' }}>Agora é onde o resultado acontece.</span>
                </h2>

                {/* Offer glass card */}
                <div
                  className="w-full rounded-2xl px-5 py-5 mb-5 relative z-10"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(167,139,250,0.18)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-2.5 mb-1">
                    <span className="text-[13px] line-through" style={{ color: 'rgba(255,255,255,0.25)' }}>R$97</span>
                    <span className="font-display text-[38px] font-bold text-white leading-none">R$37</span>
                  </div>
                  <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    Pagamento único · Sem mensalidade
                  </p>

                  {/* Countdown */}
                  {timeLeft > 0 && (
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <span style={{ color: '#FBBF24', fontSize: '12px' }}>⏱</span>
                      <span className="text-[12px]" style={{ color: 'rgba(251,191,36,0.70)' }}>
                        Expira em{' '}
                        <span className="font-mono font-bold">{fmt(timeLeft)}</span>
                      </span>
                    </div>
                  )}

                  {/* Stars */}
                  <div className="flex items-center justify-center gap-2">
                    <span style={{ color: '#FBBF24', fontSize: '11px', letterSpacing: '1px' }}>★★★★★</span>
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>12.400+ dormem melhor</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full rounded-full py-4 text-[15px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mb-3 relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #A78BFA 0%, #5A3DB0 100%)',
                    boxShadow: '0 10px 36px rgba(124,58,237,0.60)',
                  }}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abrindo pagamento…
                    </span>
                  ) : (
                    'Quero continuar dormindo assim →'
                  )}
                </button>

                <p className="text-[12px] leading-relaxed mb-3 relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Você já começou. Interromper agora faz o<br />corpo voltar ao padrão antigo.
                </p>
                <p className="text-[11px] mb-5 relative z-10" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  Acesso imediato · Sem assinatura · Sem risco
                </p>

                <button
                  onClick={onDismiss}
                  disabled={checkoutLoading}
                  className="text-[12px] transition-colors disabled:opacity-40 relative z-10"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                >
                  Agora não
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
