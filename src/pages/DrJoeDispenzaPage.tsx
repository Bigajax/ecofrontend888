import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import MeditationPageSkeleton from '@/components/MeditationPageSkeleton';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import {
  trackMeditationEvent,
  parseDurationToSeconds,
  type MeditationListViewedPayload,
  type MeditationSelectedPayload,
  type PremiumContentBlockedPayload,
} from '@/analytics/meditation';

// ── Paleta Dr. Joe Dispenza ────────────────────────────────────────────────
const BLUE      = '#3B82F6';
const BLUE_DARK = '#1E3A8A';
const BLUE_SOFT = 'rgba(59,130,246,0.10)';
const BLUE_BORDER = 'rgba(59,130,246,0.28)';
// ────────────────────────────────────────────────────────────────────────────

interface Meditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl: string;
  image: string;
  imagePosition: string;
  gradient: string;
  completed: boolean;
  isPremium?: boolean;
}

const INITIAL_MEDITATIONS: Meditation[] = [
  {
    id: 'blessing_1',
    title: 'Bênção dos Centros de Energia',
    description: 'O ponto de partida. Ative o que já estava adormecido em você.',
    duration: '7 min',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    image: 'url("/images/meditacao-bencao-energia.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    completed: false,
  },
  {
    id: 'blessing_2',
    title: 'Sintonize Novos Potenciais',
    description: 'Treine sua mente a reconhecer oportunidades que antes passavam invisíveis.',
    duration: '7 min',
    audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
    image: 'url("/images/meditacao-novos-potenciais.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_3',
    title: 'Recondicione Seu Corpo e Mente',
    description: 'O que você repete, vira padrão. Esta sessão interrompe o ciclo antigo.',
    duration: '7 min',
    audioUrl: '/audio/recondicionar-corpo-nova-mente.mp3',
    image: 'url("/images/meditacao-recondicionar.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #9B79C9 0%, #8766B5 20%, #7454A0 40%, #61438C 60%, #4E3377 80%, #3B2463 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_5',
    title: 'Meditação Caminhando',
    description: 'Para quando sentar não for suficiente. Leve a prática para o movimento.',
    duration: '5 min',
    audioUrl: '/audio/meditacao-caminhando.mp3',
    image: 'url("/images/meditacao-caminhando.webp")',
    imagePosition: 'center 15%',
    gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_6',
    title: 'Espaço-Tempo, Tempo-Espaço',
    description: 'A sessão mais profunda da jornada. Reserve um momento só seu.',
    duration: '5 min',
    audioUrl: '/audio/meditacao-espaco-tempo.mp3',
    image: 'url("/images/meditacao-espaco-tempo.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
    completed: false,
    isPremium: true,
  },
];

export default function DrJoeDispenzaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVipUser } = useAuth();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionJustCompleted, setSessionJustCompleted] = useState<number | null>(null);

  // Load meditations from localStorage
  const [meditations, setMeditations] = useState<Meditation[]>(() => {
    const storageKey = `eco.drJoe.meditations.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_MEDITATIONS to ensure isPremium is updated
        return parsed.map((saved: Meditation) => {
          const initial = INITIAL_MEDITATIONS.find(m => m.id === saved.id);
          return {
            ...saved,
            isPremium: initial?.isPremium || false,
          };
        });
      } catch {
        return INITIAL_MEDITATIONS;
      }
    }
    return INITIAL_MEDITATIONS;
  });

  // Save to localStorage whenever meditations change
  useEffect(() => {
    const storageKey = `eco.drJoe.meditations.v1.${user?.id || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify(meditations));
  }, [meditations, user?.id]);

  const handleMeditationClick = (meditation: Meditation) => {
    // Check premium access
    if (meditation.isPremium) {
      const { hasAccess } = checkAccess(true);

      if (!hasAccess) {
        // Track premium content blocked
        const payload: Omit<PremiumContentBlockedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
          meditation_id: meditation.id,
          meditation_title: meditation.title,
          category: 'dr_joe_dispenza',
          duration_seconds: parseDurationToSeconds(meditation.duration),
          is_premium: true,
          source_page: location.pathname,
          has_subscription: false,
        };
        trackMeditationEvent('Front-end: Premium Content Blocked', payload);

        // Show upgrade modal
        requestUpgrade('dr_joe_dispenza_meditation');
        return;
      }
    }

    // Track meditation selected
    const payload: Omit<MeditationSelectedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
      meditation_id: meditation.id,
      meditation_title: meditation.title,
      category: 'dr_joe_dispenza',
      duration_seconds: parseDurationToSeconds(meditation.duration),
      is_premium: meditation.isPremium || false,
      is_completed: meditation.completed,
      source_page: location.pathname,
    };
    trackMeditationEvent('Front-end: Meditation Selected', payload);

    sessionStorage.setItem('drJoePageScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('eco.drJoe.lastPlayedId', meditation.id);

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: meditation.id,
          title: meditation.title,
          duration: meditation.duration,
          audioUrl: meditation.audioUrl,
          imageUrl: meditation.image.replace('url("', '').replace('")', ''),
          backgroundMusic: 'Cristais',
          gradient: meditation.gradient,
          category: 'dr_joe_dispenza',
          isPremium: meditation.isPremium || false,
        },
        returnTo: '/app/dr-joe-dispenza',
      },
    });
  };

  const completedCount = meditations.filter(m => m.completed).length;
  const totalCount = meditations.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const nextMeditation = meditations.find(m => !m.completed);
  const nextIndex = meditations.findIndex(m => !m.completed);
  const heroCTALabel =
    completedCount === 0
      ? `Começar: ${meditations[0].title}`
      : completedCount === totalCount
      ? 'Programa concluído 🎉'
      : `Continuar: ${nextMeditation?.title ?? meditations[0].title}`;
  const urgencyLabel =
    pct === 0
      ? 'Comece sua primeira sessão'
      : pct === 100
      ? 'Programa concluído 🎉'
      : pct >= 80
      ? 'Você está quase lá'
      : `Continue sua jornada · Faltam ${totalCount - completedCount} sessões`;

  // Marcar sessão como concluída automaticamente ao voltar do player
  useEffect(() => {
    if (!location.state?.returnFromMeditation) return;
    const lastId = sessionStorage.getItem('eco.drJoe.lastPlayedId');
    if (!lastId) return;
    sessionStorage.removeItem('eco.drJoe.lastPlayedId');

    if (localStorage.getItem(`eco.meditation.completed80pct.${lastId}`) !== 'true') return;

    setMeditations(prev => {
      if (prev.find(m => m.id === lastId)?.completed) return prev;
      const next = prev.map(m => m.id === lastId ? { ...m, completed: true } : m);
      const newPct = Math.round(next.filter(m => m.completed).length / next.length * 100);
      setSessionJustCompleted(newPct);
      setTimeout(() => setSessionJustCompleted(null), 3000);
      localStorage.setItem(
        `eco.program.lastActive.drJoe.${user?.id || 'guest'}`,
        new Date().toISOString()
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleLogout = () => {
    navigate('/');
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Simulate loading time to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);

      // Track list viewed after loading
      const payload: Omit<MeditationListViewedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        category: 'dr_joe_dispenza',
        total_meditations: meditations.length,
        completed_count: meditations.filter(m => m.completed).length,
        premium_count: meditations.filter(m => m.isPremium).length,
        page_path: location.pathname,
      };
      trackMeditationEvent('Front-end: Meditation List Viewed', payload);
    }, 800);

    return () => clearTimeout(timer);
  }, [meditations, location.pathname]);

  return (
    <div className="min-h-screen bg-white font-primary">
      <HomeHeader onLogout={handleLogout} />

      {isLoading ? (
        <MeditationPageSkeleton />
      ) : (
        <main className="pb-20">
          <section className="relative flex min-h-[600px] flex-col items-center justify-end overflow-hidden sm:min-h-[700px] md:min-h-[760px]">
            <button
              onClick={() => navigate('/app')}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all hover:shadow-lg sm:left-6 sm:top-6 md:left-8 md:top-8"
              style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.38)' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </button>
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
                backgroundPosition: 'center 40%',
                transform: 'scale(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(7,13,46,0.08) 0%, rgba(7,13,46,0.85) 100%)' }}
            />
            {/* Ambient blue glow — ecoa o halo do caduceu */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 35%, rgba(59,130,246,0.20) 0%, transparent 68%)' }}
            />

            <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center px-6 pb-14 pt-24 text-center sm:px-8 sm:pb-18">
              {/* Badge */}
              <span
                className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{
                  background: 'rgba(59,130,246,0.18)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(59,130,246,0.40)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                Dr. Joe Dispenza
              </span>

              <h1 className="leading-tight text-white" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.55)' }}>
                <span className="block text-2xl font-semibold sm:text-3xl md:text-4xl">Como se tornar</span>
                <span
                  className="block text-4xl font-extrabold uppercase tracking-widest sm:text-5xl md:text-6xl"
                  style={{
                    color: '#FFFFFF',
                    textShadow: '0 0 40px rgba(59,130,246,0.80), 0 0 80px rgba(59,130,246,0.35), 0 2px 20px rgba(0,0,0,0.7)',
                  }}
                >
                  Sobrenatural
                </span>
              </h1>

              <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>
                Pessoas comuns realizando o extraordinário.
              </p>

              {/* Benefit pills — glassmorphism */}
              <div className="mt-6 flex w-full flex-col gap-2">
                {[
                  'Neurociência aplicada à reprogramação mental',
                  'Intenção + emoção elevada = nova realidade',
                  '5 sessões progressivas de meditação guiada',
                ].map((label) => (
                  <span
                    key={label}
                    className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 14px rgba(0,0,0,0.28)',
                      color: 'rgba(255,255,255,0.82)',
                    }}
                  >
                    <Check className="h-4 w-4 flex-shrink-0" style={{ color: BLUE }} strokeWidth={2.5} />
                    {label}
                  </span>
                ))}
              </div>

              {/* CTA — sólido com glow */}
              <button
                onClick={() => {
                  if (completedCount < totalCount) {
                    handleMeditationClick(nextMeditation ?? meditations[0]);
                  }
                }}
                disabled={completedCount === totalCount}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-default disabled:opacity-70"
                style={{
                  background: BLUE,
                  color: '#FFFFFF',
                  boxShadow: `0 4px 24px rgba(59,130,246,0.50)`,
                }}
              >
                {completedCount < totalCount && <Play className="h-4 w-4" fill="currentColor" />}
                {heroCTALabel}
              </button>
            </div>
          </section>

          {/* ══════════════════════════════════════════
               INTRODUÇÃO EMOCIONAL
          ══════════════════════════════════════════ */}
          <section className="mx-auto max-w-2xl px-6 md:px-4">

            {/* Bloco 1 — Abertura */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4 pb-14 pt-16 text-center"
            >
              <p className="text-xl font-medium leading-relaxed text-gray-800 sm:text-2xl">
                Existe algo dentro de você…<br />
                que ainda não foi totalmente explorado.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                Ao longo da história, pessoas comuns relataram experiências<br />
                que ultrapassam aquilo que consideramos possível.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                A questão não é se isso existe.
              </p>
              <p className="text-lg font-semibold text-gray-800">
                A questão é:<br />
                isso também é possível para você?
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 2 — Quebra de crença */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-gray-500">
                A maior parte das pessoas vive baseada<br />
                no que já conhece.
              </p>
              <p className="text-base leading-relaxed text-gray-400">
                Pensamentos repetidos.<br />
                Emoções conhecidas.<br />
                Comportamentos automáticos.
              </p>
              <p className="text-lg font-semibold text-gray-800">
                E, com o tempo…<br />
                isso define quem você acredita ser.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 3 — Ideia central */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-gray-600">
                Mas existe uma outra possibilidade.
              </p>
              <p className="text-lg font-medium leading-relaxed text-gray-800">
                Quando você acessa um novo potencial…<br />
                você não precisa mais repetir o passado.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                Você pode começar a criar…<br />
                de forma consciente.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 4 — Ciência + experiência */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base font-medium leading-relaxed text-gray-700">
                Este não é apenas um conceito.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                É algo que vem sendo estudado<br />
                através da neurociência, biologia e física.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                Pessoas estão aprendendo a mudar<br />
                seus estados mentais e emocionais…<br />
                <br />
                e, com isso, transformar a forma como vivem.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 5 — Virada */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
                O que antes parecia impossível…<br />
                começa a se tornar acessível.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                Não como teoria.<br />
                Mas como prática.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 6 — Abertura da jornada */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-gray-600">
                Este é um processo.
              </p>
              <p className="text-base leading-relaxed text-gray-500">
                Não de entender mais…<br />
                mas de experimentar diferente.
              </p>
              <p className="text-lg font-medium leading-relaxed text-gray-800">
                Aqui, você não vai apenas aprender.<br />
                <br />
                Você vai treinar sua mente e seu corpo<br />
                para um novo estado de ser.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-gray-100" />

            {/* Bloco 7 — Fechamento */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-gray-500">
                A pergunta não é mais<br />
                se isso é possível.
              </p>
              <p className="text-base leading-relaxed text-gray-600">
                A pergunta é:
              </p>
              <p className="text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
                você está pronto para se tornar sobrenatural?
              </p>
            </motion.div>

            {/* Card Semana 1 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-14"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{ minHeight: 220 }}>
                <div
                  className="absolute inset-0 bg-cover"
                  style={{
                    backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
                    backgroundPosition: 'center 40%',
                    transform: 'scale(1.05)',
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(7,13,46,0.25) 0%, rgba(7,13,46,0.92) 100%)' }}
                />
                <div className="relative z-10 px-6 py-8 text-white sm:px-8">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
                    Semana 1
                  </span>
                  <h2 className="mt-2 text-xl font-semibold sm:text-2xl">
                    Despertar da consciência
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                    Você vai começar a observar seus pensamentos,<br />
                    emoções e padrões.<br />
                    <br />
                    Antes de mudar…<br />
                    você precisa enxergar.
                  </p>
                </div>
              </div>
            </motion.div>

          </section>

          {/* ══════════════════════════════════════════
               BLOCO 1 — EXPLICAÇÃO COMPLETA
          ══════════════════════════════════════════ */}
          <section className="mx-auto max-w-4xl px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 md:px-8">

            {/* ── 🔹 INTRO (blocos 1–2) ── */}
            <div className="mb-10">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]/50">
                Antes de começar
              </p>
              {/* Bloco 1 — Abertura */}
              <p className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl">
                Quando você está verdadeiramente presente,{' '}
                <span className="text-[#1E3A8A]">todas as possibilidades existem como potenciais.</span>
              </p>
              <p className="mt-3 text-base leading-relaxed text-gray-500 sm:text-lg">
                A experiência que você quer viver já existe como energia no campo. O que você está prestes a fazer é aprender a se sintonizar com ela.
              </p>

              {/* Bloco 2 — Conceito central */}
              <div className="mt-6 rounded-xl border-l-4 border-[#1E3A8A]/30 bg-[#1E3A8A]/5 px-4 py-3">
                <p className="text-base font-semibold leading-snug text-gray-800 sm:text-lg">
                  Para transformar um potencial em realidade, são necessárias duas coisas:{' '}
                  <span className="text-[#1E3A8A]">intenção clara</span> e{' '}
                  <span className="text-[#1E3A8A]">emoção elevada.</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Intenção é o que você quer criar. Emoção é a energia que sustenta essa criação.
                </p>
              </div>
            </div>

            {/* ── 🔹 CARD EXPLICATIVO (blocos 3–6) ── */}
            <div className="mb-10 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-7 sm:px-8 sm:py-8">
              <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Como essa prática funciona
              </p>
              <div className="space-y-7">

                {/* Bloco 3 — Intenção (parte mental) */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-[#1E3A8A]/35 pt-0.5">01</span>
                  <div className="flex-1 border-l border-[#1E3A8A]/15 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">Intenção — parte mental</p>
                    <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                      <span className="font-semibold text-gray-900">Intenção clara</span> é saber exatamente o que você quer. Seus pensamentos são a carga elétrica que você envia ao campo. Quanto mais claro e específico você for, mais coerente será o sinal que você transmite.
                    </p>
                  </div>
                </div>

                {/* Bloco 4 — Emoção (parte corporal) */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-[#1E3A8A]/35 pt-0.5">02</span>
                  <div className="flex-1 border-l border-[#1E3A8A]/15 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">Emoção — parte corporal</p>
                    <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                      <span className="font-semibold text-gray-900">Emoções elevadas</span> como gratidão, amor, inspiração ou alegria elevam seu estado interno. Essas emoções são a carga magnética que atrai a experiência.
                    </p>
                  </div>
                </div>

                {/* Bloco 5 — A assinatura */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-[#1E3A8A]/35 pt-0.5">03</span>
                  <div className="flex-1 border-l border-[#1E3A8A]/15 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">A assinatura — ponto-chave</p>
                    <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                      Quando você combina intenção com emoção elevada, cria uma <span className="font-semibold text-gray-900">assinatura eletromagnética</span>. Essa assinatura é o que conecta você a uma nova possibilidade no campo.
                    </p>
                  </div>
                </div>

                {/* Bloco 6 — Como o campo funciona */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-[#1E3A8A]/35 pt-0.5">04</span>
                  <div className="flex-1 border-l border-[#1E3A8A]/15 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Como o campo funciona</p>
                    <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
                      Os potenciais existem como frequências no campo. Quando sua energia combina com uma dessas frequências, você começa a atrair essa experiência para a sua vida.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* ── 🔹 FRASE DE IMPACTO (bloco 7) ── */}
            <div className="mb-6 border-t border-b border-gray-200 py-9">
              <p className="text-center font-display text-xl font-semibold italic leading-snug text-gray-800 sm:text-2xl md:text-3xl">
                "Se você pensa no futuro, mas continua sentindo emoções do passado, nada muda."
              </p>
            </div>

            {/* Bloco 8 — A virada */}
            <div className="mb-10 text-center">
              <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
                Seu corpo ainda está vivendo no passado. Para criar algo novo,{' '}
                <span className="font-semibold text-gray-700">você precisa sentir antes que aconteça.</span>
              </p>
            </div>

            {/* ── 🔹 DIAGRAMA (bloco 5 visualizado) ── */}
            <div className="mb-10 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-7 sm:px-8 sm:py-8">
              <p className="mb-7 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
                Nova energia, novo futuro
              </p>
              <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-violet-500">Intenção</span>
                  {['Propósito', 'Prosperidade', 'Liberdade'].map(item => (
                    <span key={item} className="w-full rounded-xl border border-violet-200 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium text-violet-700 shadow-sm sm:px-2 sm:text-xs">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-shrink-0 flex-col items-center gap-1 text-gray-300">
                  <span className="text-sm sm:text-base">→</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E3A8A] text-base font-bold text-white shadow-lg sm:h-12 sm:w-12 sm:text-lg">A</div>
                  <span className="text-sm sm:text-base">←</span>
                  <span className="mt-1 text-[9px] text-center leading-tight text-gray-400">nova<br/>assinatura</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-500">Emoção</span>
                  {['Empoderado', 'Livre', 'Grato'].map(item => (
                    <span key={item} className="w-full rounded-xl border border-amber-200 bg-white px-1.5 py-1.5 text-center text-[10px] font-medium text-amber-700 shadow-sm sm:px-2 sm:text-xs">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-7 text-center text-xs text-gray-400">
                Pensamentos definem a intenção. Emoções elevam a energia.
              </p>
            </div>

            {/* ── 🔹 PREPARAÇÃO PRÁTICA (blocos 9–12) ── */}
            <div className="mb-10 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-7 sm:px-8 sm:py-8">
              <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
                Preparação para a prática
              </p>
              <div className="space-y-6">

                {/* Bloco 9 — A experiência */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 sm:text-base">
                    Pense em uma experiência que você quer viver.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Lembre-se: essa experiência já existe como energia. Você está prestes a se sintonizar com ela.
                  </p>
                </div>

                <div className="border-t border-gray-200" />

                {/* Bloco 10 — O símbolo */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 sm:text-base">
                    Atribua uma letra maiúscula para representar essa experiência.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Pense nessa letra como um símbolo dessa possibilidade na sua vida. Dar um símbolo torna sua intenção mais clara e mais real para o seu cérebro.
                  </p>
                </div>

                <div className="border-t border-gray-200" />

                {/* Bloco 11 — Clareza */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 sm:text-base">
                    Defina com clareza o que você quer criar.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Relacione pelo menos quatro aspectos específicos dessa experiência.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1">
                    <span className="text-xs font-semibold text-amber-700">Importante:</span>
                    <span className="text-xs text-amber-600">não inclua prazos.</span>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* Bloco 12 — Emoção */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 sm:text-base">
                    Agora escreva como você vai se sentir quando isso acontecer.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    Essas emoções são a energia que transmite sua intenção.
                  </p>
                </div>

              </div>
            </div>

            {/* ── 🔹 EMOÇÃO + GRATIDÃO (blocos 13–14) ── */}
            <div className="mb-10">
              {/* Bloco 13 — Gratidão */}
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/50 px-6 py-5 sm:px-8">
                <p className="text-sm font-semibold text-gray-800 sm:text-base">
                  Se você não souber o que sentir, comece pela gratidão.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Normalmente sentimos gratidão <em>depois</em> de receber algo. Sentir gratidão agora significa que isso já aconteceu.
                </p>
              </div>

              {/* Bloco 14 — Integração */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 px-6 py-5 sm:px-8">
                <p className="text-sm font-semibold text-gray-800 sm:text-base">
                  Isso não é um processo intelectual. É um processo visceral.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Você precisa realmente <em>sentir</em> essas emoções. Ensine ao seu corpo como esse futuro se sente.
                </p>
              </div>
            </div>

            {/* Bloco 15 — Fechamento */}
            <div className="mb-8 text-center">
              <p className="text-sm leading-relaxed text-gray-500 sm:text-base">
                Quando você faz isso, seu corpo começa a acreditar{' '}
                <span className="font-semibold text-gray-700">que esse futuro já é real.</span>
              </p>
            </div>

            {/* ── 🔹 TRANSIÇÃO (bloco 16) ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <p className="text-sm font-medium text-gray-500">
                Agora você vai aplicar isso na prática.
              </p>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

          </section>

          {/* Toast de celebração */}
          {sessionJustCompleted !== null && (
            <div className="mx-auto max-w-4xl px-4 sm:px-8 mb-4 animate-fade-in">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3 shadow-sm">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    Sessão concluída!
                  </p>
                  <p className="text-xs text-blue-500">
                    Você avançou para {sessionJustCompleted}% da jornada
                  </p>
                </div>
              </div>
            </div>
          )}

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">

            {/* ── Experiência — passo 1 ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Experiência</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div
              className="mb-6 flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 sm:gap-4 sm:p-4"
              style={{ background: BLUE_SOFT, border: `1px solid ${BLUE_BORDER}`, boxShadow: `0 2px 12px rgba(59,130,246,0.10)` }}
            >
              <div
                className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                style={{ borderColor: BLUE, color: BLUE_DARK }}
              >
                ✦
              </div>
              <button
                onClick={() => navigate('/app/minigame-potencial')}
                className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                      Criando seu novo potencial
                    </h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: BLUE_SOFT,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${BLUE_BORDER}`,
                        color: BLUE_DARK,
                      }}
                    >
                      EXPERIÊNCIA
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:mt-1 sm:text-sm">
                    Defina uma intenção clara e conecte-se com a emoção desse futuro.
                  </p>
                </div>
                <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                  <span className="text-xs text-[var(--eco-muted)] sm:text-sm">3 min</span>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10"
                    style={{ background: BLUE_SOFT }}
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: BLUE_DARK }} fill="currentColor" />
                  </div>
                </div>
              </button>
            </div>

            {/* ── Meditação guiada — passo 2 ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Meditação guiada</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Primeira meditação — gratuita */}
              <div
                className="flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 sm:gap-4 sm:p-4"
                style={{
                  background: meditations[0].completed ? BLUE_SOFT : '#FFFFFF',
                  border: `1px solid ${meditations[0].completed ? BLUE_BORDER : nextIndex === 0 && !meditations[0].completed ? BLUE : 'var(--eco-line)'}`,
                  boxShadow: meditations[0].completed
                    ? `0 2px 8px rgba(59,130,246,0.12)`
                    : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {meditations[0].completed ? (
                  <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div
                    className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                    style={{
                      borderColor: nextIndex === 0 && !meditations[0].completed ? BLUE : 'var(--eco-line)',
                      color: nextIndex === 0 && !meditations[0].completed ? BLUE_DARK : 'var(--eco-muted)',
                    }}
                  >
                    1
                  </div>
                )}
                <button
                  onClick={() => handleMeditationClick(meditations[0])}
                  className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                        {meditations[0].title}
                      </h3>
                      {nextIndex === 0 && !meditations[0].completed && (
                        <span className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B82F6] backdrop-blur-sm">
                          Próxima
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:mt-1 sm:text-sm">
                      {meditations[0].description}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                    <span className="text-xs text-[var(--eco-muted)] sm:text-sm">{meditations[0].duration}</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: BLUE_SOFT }}>
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: BLUE_DARK }} fill="currentColor" />
                    </div>
                  </div>
                </button>
              </div>

              {/* CTA upgrade após meditação 1 para não-VIP */}
              {!isVipUser && (
                <div
                  className="rounded-2xl px-5 py-5 text-center"
                  style={{ background: BLUE_SOFT, border: `1px solid ${BLUE_BORDER}` }}
                >
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT }}>
                    <Lock className="h-4 w-4" style={{ color: BLUE_DARK }} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">
                    Você sentiu o primeiro passo.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Desbloqueie as 4 sessões restantes para completar a jornada.
                  </p>
                  <button
                    onClick={() => requestUpgrade('dr_joe_list_cta')}
                    className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                    style={{ background: BLUE, color: '#FFFFFF', boxShadow: `0 4px 16px rgba(59,130,246,0.32)` }}
                  >
                    Continuar a jornada →
                  </button>
                </div>
              )}
            </div>

            {/* ── Sua jornada — progresso ── */}
            <div className="mt-10 mb-6">
              <h2 className="mb-4 text-base font-semibold text-[var(--eco-text)] sm:text-lg">
                Sua jornada
              </h2>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{urgencyLabel}</span>
                <span className="text-sm font-bold text-gray-800">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: BLUE_SOFT }}>
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? 'linear-gradient(to right, #34d399, #10b981)' : BLUE,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {completedCount} de {totalCount} sessões concluídas
                {pct >= 50 && pct < 100 ? ' · A maioria desiste antes da metade — você passou' : ''}
              </p>
            </div>

            {/* ── Próximas sessões (premium) ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Próximas sessões</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            <div className="space-y-3 sm:space-y-4">
              {meditations.slice(1).map((meditation, sliceIndex) => {
                const index = sliceIndex + 1;
                const isNext = index === nextIndex && !meditation.completed;
                return (
                  <div
                    key={meditation.id}
                    className="flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 sm:gap-4 sm:p-4"
                    style={{
                      background: meditation.completed ? BLUE_SOFT : '#FFFFFF',
                      border: `1px solid ${meditation.completed ? BLUE_BORDER : isNext ? BLUE : 'var(--eco-line)'}`,
                      boxShadow: meditation.completed
                        ? `0 2px 8px rgba(59,130,246,0.12)`
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {meditation.completed ? (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: BLUE }}
                      >
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{
                          borderColor: isNext ? BLUE : 'var(--eco-line)',
                          color: isNext ? BLUE_DARK : 'var(--eco-muted)',
                        }}
                      >
                        {index + 1}
                      </div>
                    )}

                    <button
                      onClick={() => handleMeditationClick(meditation)}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                            {meditation.title}
                          </h3>
                          {isNext && (
                            <span className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B82F6] backdrop-blur-sm">
                              Próxima
                            </span>
                          )}
                          {meditation.isPremium && !isNext && (
                            <Lock className="h-3.5 w-3.5 text-[var(--eco-muted)] sm:h-4 sm:w-4" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:mt-1 sm:text-sm">
                          {meditation.description}
                        </p>
                      </div>

                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-[var(--eco-muted)] sm:text-sm">
                          {meditation.duration}
                        </span>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10"
                          style={{ background: meditation.isPremium ? '#F3F4F6' : BLUE_SOFT }}
                        >
                          <Play
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            style={{ color: meditation.isPremium ? '#D1D5DB' : BLUE_DARK }}
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Frase Final ── */}
          <section className="mx-auto max-w-4xl px-4 pb-8 md:px-8">
            <div
              className="rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12"
              style={{ background: '#09090F' }}
            >
              <p
                className="text-lg font-medium leading-snug sm:text-xl md:text-2xl"
                style={{ color: 'rgba(255,255,255,0.80)' }}
              >
                "As emoções são a energia que transmite sua intenção."
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: 'rgba(59,130,246,0.55)' }}>
                Dr. Joe Dispenza
              </p>
            </div>
          </section>
        </main>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="dr_joe_dispenza"
      />
    </div>
  );
}
