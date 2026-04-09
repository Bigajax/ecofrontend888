import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fadeScale = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function RecondicioneAntesDeComecarPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#070A12] font-primary">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(900px 520px at 35% 12%, rgba(192,180,224,0.16) 0%, transparent 62%), linear-gradient(135deg, #070A12 0%, #0B1220 42%, #0A0F1C 100%)',
        }}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <button
            onClick={() => navigate('/app/dr-joe-dispenza')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/85 backdrop-blur-md transition-all hover:bg-white/[0.10] active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl items-center px-4 pb-28 pt-10">
        <motion.div initial="hidden" animate="visible" variants={fadeScale} className="mx-auto w-full max-w-xl">
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Antes de começar
            </h1>
            <p className="mt-3 text-sm font-medium text-white/80 sm:text-base">
              Essa meditação começa antes mesmo de você dar play
            </p>
          </div>

          <div className="mt-10 space-y-4 rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-left leading-relaxed text-white/75 backdrop-blur-md sm:p-8">
            <p>Seu corpo carrega padrões que foram repetidos muitas vezes.</p>
            <p>
              Reações automáticas.
              <br />
              Emoções recorrentes.
              <br />
              Estados que parecem naturais… mas não são conscientes.
            </p>
            <p>Essa prática não é apenas sobre relaxar.</p>
            <p>
              É sobre interromper esses padrões
              <br />
              e criar espaço para algo novo.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-eco-baby/25 bg-eco-baby/10 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-white/90">
              O que você vai sentir durante a meditação
              <br />
              começa com o estado que você escolhe agora.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        <div
          className="h-10"
          style={{
            background: 'linear-gradient(to top, rgba(7,10,18,0.98) 0%, rgba(7,10,18,0) 100%)',
          }}
        />
        <div className="border-t border-white/10 bg-[#070A12]/90 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <button
              onClick={() => navigate('/app/recondicione-corpo-mente')}
              className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 active:scale-[0.99] sm:text-base"
              style={{
                background:
                  'linear-gradient(135deg, rgba(192,180,224,0.95) 0%, rgba(148,136,196,0.95) 50%, rgba(100,90,160,0.95) 100%)',
                boxShadow: '0 16px 45px rgba(192,180,224,0.18)',
              }}
            >
              Preparar meu estado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

