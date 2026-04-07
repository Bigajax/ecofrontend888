import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import mixpanel from '@/lib/mixpanel';
import { useGuest } from '@/hooks/useGuest';

// ─── Constants ────────────────────────────────────────────────
const EMOTION_CHIPS = [
  'Empoderado',
  'Livre',
  'Alegre',
  'Inspirado',
  'Apaixonado pela vida',
  'Digno',
];

const REFINEMENT_PLACEHOLDERS = [
  'Ex: trabalhar com propósito',
  'Ex: ganhar mais',
  'Ex: mais liberdade',
  'Ex: viajar',
];

const fadeUp = {
  hidden: { opacity: 0, y: 18, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const cardClass =
  'rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md sm:p-6';

// ─── Sub-components ───────────────────────────────────────────
function StepBadge({ number }: { number: number }) {
  return (
    <span className="mb-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-eco-baby/30 bg-eco-baby/15 text-[11px] font-bold text-white">
      {number}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function MinigamePotencialPage() {
  const navigate = useNavigate();
  const { guestUser } = useGuest();

  // State
  const [intention, setIntention] = useState('');
  const [letter, setLetter] = useState('');
  const [refinements, setRefinements] = useState(['', '', '', '']);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [breathingStarted, setBreathingStarted] = useState(false);
  const [embodimentDone, setEmbodimentDone] = useState(false);

  // Refs for auto-scroll
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  const step6Ref = useRef<HTMLDivElement>(null);
  const shownSteps = useRef(new Set<number>());

  // Derived unlock conditions
  const show2 = intention.trim().length > 0;
  const show3 = show2 && /^[A-Za-z]$/.test(letter);
  const filledCount = refinements.filter(r => r.trim().length > 0).length;
  const show4 = show3 && filledCount >= 4;
  const show5 = show4 && emotions.length >= 1;
  const show6 = show5 && embodimentDone;

  // Auto-scroll helper — stable, only reads refs
  const revealStep = useCallback((n: number, ref: React.RefObject<HTMLDivElement>) => {
    if (!shownSteps.current.has(n)) {
      shownSteps.current.add(n);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (show2) revealStep(2, step2Ref); }, [show2]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (show3) revealStep(3, step3Ref); }, [show3]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (show4) revealStep(4, step4Ref); }, [show4]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (show5) revealStep(5, step5Ref); }, [show5]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (show6) revealStep(6, step6Ref); }, [show6]);

  // Breathing timer — 10 seconds, then unlock step 6
  useEffect(() => {
    if (!breathingStarted) return;
    const timer = setTimeout(() => setEmbodimentDone(true), 10000);
    return () => clearTimeout(timer);
  }, [breathingStarted]);

  function toggleEmotion(e: string) {
    setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  }

  function updateRefinement(i: number, value: string) {
    setRefinements(prev => prev.map((r, idx) => idx === i ? value : r));
  }

  return (
    <div className="relative min-h-screen bg-[#070A12] font-primary">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(1000px 520px at 30% 10%, rgba(110,200,255,0.18) 0%, transparent 62%), linear-gradient(135deg, #070A12 0%, #0B1220 42%, #0A0F1C 100%)',
        }}
      />

      {/* Sticky header */}
      <div className="sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <button
            onClick={() => navigate('/app/guest/intro-potencial')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/85 backdrop-blur-md transition-all hover:bg-white/[0.10] active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-white/90">
            Criando seu potencial
          </span>
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      <main className="relative z-10 mx-auto max-w-lg space-y-12 px-4 py-10 pb-28">
        {/* ── STEP 1 — Intenção ── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className={cardClass}>
          <StepBadge number={1} />
          <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
            Escolha uma experiência que você quer criar
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Pense em uma experiência que você quer viver.
          </p>
          <textarea
            rows={3}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 transition-all focus:border-eco-baby/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/20 sm:text-base"
            placeholder="Ex: um novo trabalho, mais liberdade, um relacionamento saudável..."
            value={intention}
            onChange={e => setIntention(e.target.value)}
          />
        </motion.div>

        {/* ── STEP 2 — Letra / Símbolo ── */}
        <AnimatePresence>
          {show2 && (
            <motion.div ref={step2Ref} key="s2" initial="hidden" animate="visible" variants={fadeUp} className={cardClass}>
              <StepBadge number={2} />
              <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Atribua uma letra a essa experiência
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Pense nessa letra como um símbolo dessa possibilidade.
              </p>
              <div className="mt-4 flex items-center gap-5">
                <input
                  maxLength={1}
                  className="h-14 w-14 flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.05] text-center text-2xl font-bold uppercase text-white/90 transition-all focus:border-eco-baby/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/20"
                  value={letter}
                  onChange={e => setLetter(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())}
                  placeholder="A"
                />
                <AnimatePresence>
                  {show3 && (
                    <motion.div
                      key="letter-glow"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                      className="relative flex h-16 w-16 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10"
                      style={{
                        boxShadow: '0 0 0 8px rgba(110,200,255,0.06), 0 0 0 18px rgba(59,130,246,0.04)',
                      }}
                    >
                      <motion.span
                        className="font-display text-3xl font-bold text-white"
                        animate={{
                          textShadow: [
                            '0 0 6px rgba(110,200,255,0.0)',
                            '0 0 28px rgba(110,200,255,0.55)',
                            '0 0 6px rgba(110,200,255,0.0)',
                          ],
                        }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {letter}
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 3 — Refinamentos ── */}
        <AnimatePresence>
          {show3 && (
            <motion.div ref={step3Ref} key="s3" initial="hidden" animate="visible" variants={fadeUp} className={cardClass}>
              <StepBadge number={3} />
              <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Dê mais clareza ao que você quer criar
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Liste pelo menos quatro detalhes dessa experiência.
              </p>
              <div className="mt-4 space-y-3">
                {refinements.map((r, i) => (
                  <input
                    key={i}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/90 placeholder:text-white/35 transition-all focus:border-eco-baby/50 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-eco-baby/20"
                    placeholder={REFINEMENT_PLACEHOLDERS[i]}
                    value={r}
                    onChange={e => updateRefinement(i, e.target.value)}
                  />
                ))}
                <p className="text-xs text-white/45">
                  {filledCount} / 4 preenchidos
                  {filledCount >= 4 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="ml-1 font-semibold text-white/90"
                    >
                      ✓
                    </motion.span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 4 — Emoções ── */}
        <AnimatePresence>
          {show4 && (
            <motion.div ref={step4Ref} key="s4" initial="hidden" animate="visible" variants={fadeUp} className={cardClass}>
              <StepBadge number={4} />
              <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Como você vai se sentir quando isso acontecer?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Essas emoções são a energia que transmite sua intenção.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {/* Gratidão — destaque especial */}
                <button
                  onClick={() => toggleEmotion('Grato')}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    emotions.includes('Grato')
                      ? 'border-blue-400/40 bg-blue-400/15 text-white shadow-[0_10px_30px_rgba(59,130,246,0.14)]'
                      : 'border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]'
                  }`}
                >
                  ✦ Gratidão
                </button>
                {EMOTION_CHIPS.map(label => (
                  <button
                    key={label}
                    onClick={() => toggleEmotion(label)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all active:scale-95 ${
                      emotions.includes(label)
                        ? 'border-eco-baby/40 bg-eco-baby/15 text-white shadow-[0_10px_30px_rgba(110,200,255,0.10)]'
                        : 'border-white/12 bg-white/[0.04] text-white/80 hover:bg-white/[0.06]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45">Se não souber, comece pela gratidão.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 5 — Ativação / Respiração ── */}
        <AnimatePresence>
          {show5 && (
            <motion.div ref={step5Ref} key="s5" initial="hidden" animate="visible" variants={fadeUp} className={cardClass}>
              <StepBadge number={5} />
              <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Sinta isso no seu corpo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Isso não é um processo intelectual. É visceral.
              </p>

              <div className="mt-8 flex flex-col items-center gap-5">
                {!breathingStarted ? (
                  <button
                    onClick={() => setBreathingStarted(true)}
                    className="rounded-full border border-eco-baby/30 bg-eco-baby/10 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-eco-baby/15 active:scale-95"
                  >
                    Começar
                  </button>
                ) : (
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    {/* Outer pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2"
                      style={{ borderColor: 'rgba(110,200,255,0.22)' }}
                      animate={embodimentDone
                        ? { scale: 1, opacity: 0.30 }
                        : { scale: [1, 1.38, 1], opacity: [0.28, 0.70, 0.28] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut' }}
                    />
                    {/* Mid ring */}
                    <motion.div
                      className="absolute rounded-full border"
                      style={{ inset: 10, borderColor: 'rgba(110,200,255,0.14)' }}
                      animate={embodimentDone
                        ? { scale: 1, opacity: 0.22 }
                        : { scale: [1, 1.25, 1], opacity: [0.18, 0.50, 0.18] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut', delay: 0.3 }}
                    />
                    {/* Inner filled circle */}
                    <motion.div
                      className="rounded-full"
                      style={{ width: 72, height: 72, background: 'rgba(110,200,255,0.10)' }}
                      animate={embodimentDone
                        ? { scale: 1 }
                        : { scale: [1, 1.2, 1], opacity: [0.65, 1, 0.65] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut' }}
                    />
                    {/* Letter inside */}
                    {letter && (
                      <span className="absolute font-display text-2xl font-bold text-white/70">
                        {letter}
                      </span>
                    )}
                  </div>
                )}

                {breathingStarted && (
                  <AnimatePresence mode="wait">
                    {embodimentDone ? (
                      <motion.p
                        key="done"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-semibold text-white/90"
                      >
                        ✓ Feito
                      </motion.p>
                    ) : (
                      <motion.p
                        key="breathing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-white/45"
                      >
                        Respire fundo e sinta...
                      </motion.p>
                    )}
                  </AnimatePresence>
                )}

                <p className="max-w-xs text-center text-xs text-white/45">
                  Ensine ao seu corpo como esse futuro se sente.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 6 — Final CTA ── */}
        <AnimatePresence>
          {show6 && (
            <motion.div
              ref={step6Ref}
              key="s6"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-eco-baby/25 bg-eco-baby/10">
                <span className="font-display text-2xl font-bold text-white">{letter}</span>
              </div>
              <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Seu corpo começou a reconhecer esse futuro.
              </p>
              <button
                onClick={() => {
                  mixpanel.track('Guest Minigame Completed', {
                    source: 'minigame_potencial',
                    guestId: guestUser?.id ?? null,
                    timestamp: new Date().toISOString(),
                  });
                  navigate('/app/guest/dr-joe-preview');
                }}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(110,200,255,0.95) 0%, rgba(59,130,246,0.95) 50%, rgba(30,58,138,0.95) 100%)',
                  boxShadow: '0 16px 45px rgba(110,200,255,0.16)',
                }}
              >
                Iniciar meditação
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

