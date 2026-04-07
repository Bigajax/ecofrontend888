import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import mixpanel from '@/lib/mixpanel';
import { useGuest } from '@/hooks/useGuest';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const ITEMS = [
  'Definir o que você quer viver',
  'Dar clareza a essa experiência',
  'Sentir isso como se já fosse real',
];

export default function IntroPotencialPage() {
  const navigate = useNavigate();
  const { guestUser, initGuestSession } = useGuest();

  useEffect(() => {
    mixpanel.track('Guest Intro Viewed', {
      source: 'landing',
      guestId: guestUser?.id ?? null,
      timestamp: new Date().toISOString(),
    });
  }, [guestUser?.id]);

  function handleStart() {
    initGuestSession('intro_potencial');

    mixpanel.track('Guest Intro Continued', {
      source: 'intro_potencial',
      guestId: guestUser?.id ?? null,
      timestamp: new Date().toISOString(),
    });

    navigate('/app/minigame-potencial');
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#070A12] font-primary">

      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: [
            'radial-gradient(ellipse 700px 460px at 60% -5%, rgba(110,200,255,0.11) 0%, transparent 65%)',
            'radial-gradient(ellipse 500px 300px at 10% 90%, rgba(59,130,246,0.07) 0%, transparent 60%)',
            'linear-gradient(175deg, #070A12 0%, #0B1220 55%, #080C18 100%)',
          ].join(', '),
        }}
      />

      {/* Centered content */}
      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col justify-center px-6 py-14">

        {/* ── Label ── */}
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
          className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35"
        >
          Antes de começar
        </motion.p>

        {/* ── Título ── */}
        <motion.h1
          initial="hidden"
          animate="visible"
          custom={0.08}
          variants={fadeUp}
          className="font-display text-[1.75rem] font-bold leading-[1.25] text-white sm:text-[2.1rem]"
        >
          Você não vai apenas imaginar.
          <br />
          <span className="text-eco-baby">
            Vai começar a condicionar&nbsp;um novo estado.
          </span>
        </motion.h1>

        {/* ── Texto curto ── */}
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.18}
          variants={fadeUp}
          className="mt-5 text-[0.9375rem] leading-[1.65] text-white/55"
        >
          Nos próximos minutos, você vai criar com clareza uma experiência
          que deseja viver, associar a ela uma emoção elevada e começar a
          ensinar isso ao seu corpo.
        </motion.p>

        {/* ── Bloco de apoio ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.28}
          variants={fadeUp}
          className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 backdrop-blur-sm"
        >
          <p className="text-[0.875rem] leading-[1.6] text-white/65 italic">
            "É essa combinação entre intenção clara + emoção sentida que
            começa a interromper o padrão automático."
          </p>
        </motion.div>

        {/* ── Mini lista ── */}
        <motion.ul
          initial="hidden"
          animate="visible"
          custom={0.36}
          variants={fadeUp}
          className="mt-7 space-y-2.5"
          aria-label="O que você vai fazer"
        >
          {ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-eco-baby/60"
              />
              <span className="text-sm text-white/70">{item}</span>
            </li>
          ))}
        </motion.ul>

        {/* ── Fechamento ── */}
        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.44}
          variants={fadeUp}
          className="mt-8 text-[0.9375rem] leading-[1.6] text-white/45"
        >
          Não é sobre pensar mais.
          <br />
          É sobre começar a sentir diferente.
        </motion.p>

        {/* ── CTA ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.54}
          variants={fadeUp}
          className="mt-10"
        >
          <button
            onClick={handleStart}
            className="w-full rounded-full py-[15px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.015] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, rgba(110,200,255,0.96) 0%, rgba(59,130,246,0.96) 52%, rgba(30,58,138,0.96) 100%)',
              boxShadow: '0 14px 40px rgba(110,200,255,0.16)',
            }}
          >
            Começar experiência
          </button>

          <p className="mt-3 text-center text-[11px] text-white/28">
            Sem cadastro&nbsp;•&nbsp;leva menos de 3 minutos
          </p>
        </motion.div>

      </main>
    </div>
  );
}
