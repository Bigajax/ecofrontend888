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

      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center px-8 py-14">

        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.08}
          variants={fadeUp}
          className="text-[1.0625rem] leading-[1.85] text-white/55"
        >
          Antes de começar…
        </motion.p>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.2}
          variants={fadeUp}
          className="mt-6 text-[1.0625rem] leading-[1.85] text-white/80"
        >
          A experiência que você quer viver
          <br />
          já existe como um potencial.
        </motion.p>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.34}
          variants={fadeUp}
          className="mt-5 text-[1.0625rem] leading-[1.85] text-white/60"
        >
          O que você vai fazer agora
          <br />
          é aprender a se sintonizar com ela.
        </motion.p>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.48}
          variants={fadeUp}
          className="mt-6 text-[1.0625rem] leading-[1.85] text-white/45"
        >
          Para isso, são necessárias duas coisas:
        </motion.p>

        <motion.p
          initial="hidden"
          animate="visible"
          custom={0.62}
          variants={fadeUp}
          className="mt-4 text-[1.125rem] font-semibold leading-[1.7] text-white/90"
        >
          Intenção clara…
          <br />
          <span className="text-eco-baby">e emoção elevada.</span>
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.78}
          variants={fadeUp}
          className="mt-14"
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
            Começar
          </button>
        </motion.div>

      </main>
    </div>
  );
}
