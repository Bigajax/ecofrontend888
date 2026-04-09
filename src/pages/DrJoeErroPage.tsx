import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function DrJoeErroPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[100dvh] bg-[#070A12] font-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 600px 400px at 50% 0%, rgba(239,68,68,0.06) 0%, transparent 65%), linear-gradient(175deg, #070A12 0%, #0B1220 55%, #080C18 100%)',
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[480px] flex-col items-center justify-center px-6 py-14 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10"
        >
          <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="font-display text-[1.75rem] font-bold leading-[1.25] text-white"
        >
          Pagamento não concluído
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-5 text-[0.9375rem] leading-[1.7] text-white/50"
        >
          Seu cartão não foi cobrado.
          <br />
          Você pode tentar novamente ou usar outro método de pagamento.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="mt-10 w-full space-y-3"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-full rounded-full py-[15px] text-[0.9375rem] font-bold text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.015] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, rgba(176,166,216,0.96) 0%, rgba(148,136,196,0.96) 52%, rgba(100,90,160,0.96) 100%)',
              boxShadow: '0 14px 40px rgba(148,136,196,0.35)',
            }}
          >
            Tentar novamente
          </button>

          <p className="text-[11px] text-white/25">
            Precisa de ajuda?{' '}
            <a
              href="mailto:ecotopia.app777@gmail.com"
              className="underline underline-offset-2 hover:text-white/45 transition-colors"
            >
              ecotopia.app777@gmail.com
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
