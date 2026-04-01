import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

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
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── Sub-components ───────────────────────────────────────────
function StepBadge({ number }: { number: number }) {
  return (
    <span className="mb-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3B1E77] text-[10px] font-bold text-white">
      {number}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function MinigamePotencialPage() {
  const navigate = useNavigate();

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
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
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
    <div className="min-h-screen bg-white font-primary">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-100 bg-white/90 px-4 backdrop-blur-sm">
        <button
          onClick={() => navigate('/app/dr-joe-dispenza')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="ml-3 text-sm font-semibold text-gray-800">Criando seu potencial</span>
      </div>

      <main className="mx-auto max-w-lg space-y-12 px-4 py-10 pb-28">

        {/* ── STEP 1 — Intenção ── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <StepBadge number={1} />
          <h2 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
            Escolha uma experiência que você quer criar
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Pense em uma experiência potencial que você quer viver.
          </p>
          <textarea
            rows={3}
            className="mt-4 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#3B1E77]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B1E77]/10 sm:text-base"
            placeholder="Ex: um novo trabalho, mais liberdade, um relacionamento saudável..."
            value={intention}
            onChange={e => setIntention(e.target.value)}
          />
        </motion.div>

        {/* ── STEP 2 — Letra / Símbolo ── */}
        <AnimatePresence>
          {show2 && (
            <motion.div ref={step2Ref} key="s2" initial="hidden" animate="visible" variants={fadeUp}>
              <StepBadge number={2} />
              <h2 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Atribua uma letra a essa experiência
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Pense nessa letra como um símbolo dessa possibilidade.
              </p>
              <div className="mt-4 flex items-center gap-5">
                <input
                  maxLength={1}
                  className="h-14 w-14 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 text-center text-2xl font-bold uppercase text-[#3B1E77] transition-all focus:border-[#3B1E77]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B1E77]/10"
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
                      className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#3B1E77]/8"
                      style={{
                        boxShadow: '0 0 0 8px rgba(59,30,119,0.05), 0 0 0 18px rgba(59,30,119,0.025)',
                      }}
                    >
                      <motion.span
                        className="font-display text-3xl font-bold text-[#3B1E77]"
                        animate={{
                          textShadow: [
                            '0 0 4px rgba(59,30,119,0)',
                            '0 0 22px rgba(59,30,119,0.45)',
                            '0 0 4px rgba(59,30,119,0)',
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
            <motion.div ref={step3Ref} key="s3" initial="hidden" animate="visible" variants={fadeUp}>
              <StepBadge number={3} />
              <h2 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Dê mais clareza ao que você quer criar
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Liste pelo menos quatro detalhes dessa experiência.
              </p>
              <div className="mt-4 space-y-3">
                {refinements.map((r, i) => (
                  <input
                    key={i}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#3B1E77]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B1E77]/10"
                    placeholder={REFINEMENT_PLACEHOLDERS[i]}
                    value={r}
                    onChange={e => updateRefinement(i, e.target.value)}
                  />
                ))}
                <p className="text-xs text-gray-400">
                  {filledCount} / 4 preenchidos
                  {filledCount >= 4 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="ml-1 text-emerald-500 font-semibold"
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
            <motion.div ref={step4Ref} key="s4" initial="hidden" animate="visible" variants={fadeUp}>
              <StepBadge number={4} />
              <h2 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Como você vai se sentir quando isso acontecer?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Essas emoções são a energia que transmite sua intenção.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {/* Gratidão — destaque especial */}
                <button
                  onClick={() => toggleEmotion('Grato')}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all ${
                    emotions.includes('Grato')
                      ? 'border-amber-400 bg-amber-400 text-white shadow-md scale-105'
                      : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  ✦ Gratidão
                </button>
                {EMOTION_CHIPS.map(label => (
                  <button
                    key={label}
                    onClick={() => toggleEmotion(label)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all ${
                      emotions.includes(label)
                        ? 'border-[#3B1E77] bg-[#3B1E77] text-white shadow-sm scale-105'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">Se não souber, comece pela gratidão.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 5 — Ativação / Respiração ── */}
        <AnimatePresence>
          {show5 && (
            <motion.div ref={step5Ref} key="s5" initial="hidden" animate="visible" variants={fadeUp}>
              <StepBadge number={5} />
              <h2 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Sinta isso no seu corpo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Isso não é um processo intelectual. É visceral.
              </p>

              <div className="mt-8 flex flex-col items-center gap-5">
                {!breathingStarted ? (
                  <button
                    onClick={() => setBreathingStarted(true)}
                    className="rounded-full border-2 border-[#3B1E77]/25 bg-[#3B1E77]/5 px-8 py-3 text-sm font-semibold text-[#3B1E77] transition-all hover:bg-[#3B1E77]/10 active:scale-95"
                  >
                    Começar
                  </button>
                ) : (
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    {/* Outer pulse ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-[#3B1E77]/20"
                      animate={embodimentDone
                        ? { scale: 1, opacity: 0.3 }
                        : { scale: [1, 1.38, 1], opacity: [0.3, 0.7, 0.3] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut' }}
                    />
                    {/* Mid ring */}
                    <motion.div
                      className="absolute rounded-full border border-[#3B1E77]/10"
                      style={{ inset: 10 }}
                      animate={embodimentDone
                        ? { scale: 1, opacity: 0.2 }
                        : { scale: [1, 1.25, 1], opacity: [0.2, 0.5, 0.2] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut', delay: 0.3 }}
                    />
                    {/* Inner filled circle */}
                    <motion.div
                      className="rounded-full bg-[#3B1E77]/10"
                      style={{ width: 72, height: 72 }}
                      animate={embodimentDone
                        ? { scale: 1 }
                        : { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }
                      }
                      transition={{ duration: 8, repeat: embodimentDone ? 0 : Infinity, ease: 'easeInOut' }}
                    />
                    {/* Letter inside */}
                    {letter && (
                      <span className="absolute font-display text-2xl font-bold text-[#3B1E77]/50">
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
                        className="text-sm font-semibold text-emerald-600"
                      >
                        ✓ Feito
                      </motion.p>
                    ) : (
                      <motion.p
                        key="breathing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-gray-400"
                      >
                        Respire fundo e sinta...
                      </motion.p>
                    )}
                  </AnimatePresence>
                )}

                <p className="max-w-xs text-center text-xs text-gray-400">
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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B1E77]/10">
                <span className="font-display text-2xl font-bold text-[#3B1E77]">{letter}</span>
              </div>
              <p className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Seu corpo começou a reconhecer esse futuro.
              </p>
              <button
                onClick={() => navigate('/app/dr-joe-dispenza')}
                className="inline-flex items-center gap-2 rounded-full bg-[#3B1E77] px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95"
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
