import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { usePremiumContent } from '@/hooks/usePremiumContent';

const NOW_OPTIONS = ['Tensão', 'Ansiedade', 'Cansaço', 'Agitação', 'Neutro'] as const;
const INSTALL_OPTIONS = ['Calma', 'Leveza', 'Confiança', 'Presença', 'Clareza'] as const;

const fadeScale = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const cardClass =
  'rounded-3xl border border-white/15 bg-[#0C1525] p-5 text-white sm:p-6';

function OptionPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: active ? 1.055 : 1.015 }}
      whileTap={{ scale: active ? 1.03 : 0.99 }}
      className="rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200"
      style={{
        borderColor: active ? 'rgba(192,180,224,0.55)' : 'rgba(255,255,255,0.12)',
        background: active ? 'rgba(192,180,224,0.14)' : 'rgba(255,255,255,0.10)',
        color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.88)',
        boxShadow: active ? '0 16px 46px rgba(192,180,224,0.16)' : 'none',
      }}
      animate={
        active
          ? {
              scale: 1.05,
              boxShadow: [
                '0 16px 46px rgba(192,180,224,0.12)',
                '0 16px 46px rgba(192,180,224,0.20)',
                '0 16px 46px rgba(192,180,224,0.12)',
              ],
            }
          : { scale: 1, boxShadow: 'none' }
      }
      transition={active ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.18 }}
      aria-pressed={active}
    >
      {label}
    </motion.button>
  );
}

export default function RecondicioneCorpoMentePage() {
  const navigate = useNavigate();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();

  const [nowFeeling, setNowFeeling] = useState<(typeof NOW_OPTIONS)[number] | null>(null);
  const [installState, setInstallState] = useState<(typeof INSTALL_OPTIONS)[number] | null>(null);

  const canStart = useMemo(() => nowFeeling !== null && installState !== null, [installState, nowFeeling]);

  const handleStart = () => {
    const payload = {
      now: nowFeeling,
      install: installState,
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem('eco.recondition.v1', JSON.stringify(payload));

    const { hasAccess } = checkAccess(true);
    if (!hasAccess) {
      requestUpgrade('dr_joe_dispenza_meditation');
      return;
    }

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: 'blessing_3',
          title: 'Recondicione Seu Corpo e Mente',
          duration: '7 min',
          audioUrl: '/audio/recondicione-corpo-mente.mp3',
          imageUrl: '/images/meditacao-recondicionar.webp',
          backgroundMusic: 'Cristais',
          gradient: 'linear-gradient(to bottom, #9B79C9 0%, #3B2463 100%)',
          category: 'dr_joe_dispenza',
          isPremium: true,
        },
        returnTo: '/app/dr-joe-dispenza',
      },
    });
  };

  return (
    <div className="relative min-h-screen bg-[#070A12] font-primary">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(900px 520px at 35% 12%, rgba(192,180,224,0.18) 0%, transparent 62%), linear-gradient(135deg, #070A12 0%, #0B1220 42%, #0A0F1C 100%)',
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
          <span className="ml-3 text-sm font-semibold text-white/90">
            Recondicione seu corpo e mente
          </span>
        </div>
        <div className="h-px w-full bg-white/10" />
      </div>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-28 pt-10">
        <motion.div initial="hidden" animate="visible" variants={fadeScale} className="space-y-10">
          {/* Head */}
          <header className="space-y-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Recondicione seu corpo e mente
            </h1>
            <p className="text-sm font-medium text-white/80 sm:text-base">
              Liberte seu corpo do passado e ensine um novo estado interno
            </p>
            <div className="max-w-xl space-y-3 text-sm leading-relaxed text-white/70 sm:text-base">
              <p>
                Não é sobre pensar.
                <br />
                <span className="text-white/85">É sobre começar a sentir diferente.</span>
              </p>
              <p className="text-white/85">
                Agora é a primeira vez que você pode interromper isso.
              </p>
            </div>
          </header>

          {/* Pause block */}
          <div className="rounded-2xl border border-white/15 bg-[#0C1525] px-4 py-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              Observe por um instante.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Antes de escolher…
              <br />
              <span className="text-white/85">apenas perceba.</span>
            </p>
          </div>

          {/* Block 1 */}
          <section className={cardClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              Presente
            </p>
            <p className="mt-2 text-sm text-white/80">O que está presente no seu corpo agora?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {NOW_OPTIONS.map((label) => (
                <OptionPill
                  key={label}
                  label={label}
                  active={nowFeeling === label}
                  onClick={() => setNowFeeling(label)}
                />
              ))}
            </div>
          </section>

          {/* Block 2 */}
          <section className={cardClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              Direção
            </p>
            <p className="mt-2 text-sm text-white/80">Qual estado você quer começar a sentir?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INSTALL_OPTIONS.map((label) => (
                <OptionPill
                  key={label}
                  label={label}
                  active={installState === label}
                  onClick={() => setInstallState(label)}
                />
              ))}
            </div>
          </section>

          {/* Insight */}
          <div className="rounded-2xl border border-eco-baby/25 bg-eco-baby/10 px-4 py-3">
            <p className="text-sm font-semibold text-white/90">
              Seu corpo pode desaprender padrões antigos.
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
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 active:scale-[0.99] disabled:cursor-default disabled:opacity-60 sm:text-base"
              style={{
                background:
                  'linear-gradient(135deg, rgba(192,180,224,0.95) 0%, rgba(148,136,196,0.95) 50%, rgba(100,90,160,0.95) 100%)',
                boxShadow: '0 16px 45px rgba(192,180,224,0.18)',
              }}
            >
              Levar esse estado comigo
            </button>
            <p className="mt-2 text-center text-xs text-white/70">
              {canStart ? 'Continue no seu ritmo.' : 'Escolha um estado atual e um novo estado.'}
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="dr_joe_dispenza"
      />
    </div>
  );
}
