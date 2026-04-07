import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, ArrowLeft, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import DrJoeDispenzaSkeleton from '@/components/DrJoeDispenzaSkeleton';
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
const BLUE       = '#3B82F6';
const BLUE_SOFT  = 'rgba(59,130,246,0.12)';
const BLUE_BORDER = 'rgba(59,130,246,0.25)';
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
    description: 'Ative seu corpo para um novo estado interno',
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
    description: 'Acesse o campo de possibilidades além do seu passado',
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
  const { user } = useAuth();
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

  const sintonizeMeditation = meditations.find(m => m.id === 'blessing_2')!;
  const etapa1Meditation = meditations.find(m => m.id === 'blessing_1') ?? INITIAL_MEDITATIONS[0];
  const getMeditationById = (id: string) =>
    meditations.find(m => m.id === id) ?? INITIAL_MEDITATIONS.find(m => m.id === id)!;
  const recondicioneMeditation = getMeditationById('blessing_3');
  const caminhandoMeditation = getMeditationById('blessing_5');
  const espacoTempoMeditation = getMeditationById('blessing_6');
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
      ? 'Comece sua primeira prática'
      : pct === 100
      ? 'Programa concluído 🎉'
      : pct >= 80
      ? 'Você está quase lá'
      : `Continue sua jornada · Faltam ${totalCount - completedCount} práticas`;

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

  const scrollToJourney = () => {
    document.getElementById('jornada')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const EtapaHeader = ({
    label,
    title,
    description,
    backgroundImage,
    backgroundPosition,
  }: {
    label: string;
    title: string;
    description: ReactNode;
    backgroundImage: string;
    backgroundPosition?: string;
  }) => (
    <div className="relative" style={{ minHeight: 220 }}>
      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundImage,
          backgroundPosition: backgroundPosition ?? 'center 40%',
          transform: 'scale(1.06)',
          filter: 'saturate(1.05) brightness(0.62) contrast(1.10)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.68) 55%, rgba(0,0,0,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 35%, rgba(59,130,246,0.18) 0%, transparent 68%)',
        }}
      />
      <div className="relative z-10 px-6 py-8 text-white sm:px-8">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: 'rgba(255,255,255,0.92)',
            background: 'rgba(0,0,0,0.52)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {label}
        </span>
        <h2
          className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: '#FFFFFF', textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
        >
          {title}
        </h2>
        <div
          className="mt-3 space-y-2 text-sm leading-relaxed sm:text-base"
          style={{ color: '#FFFFFF', opacity: 0.88, textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
        >
          {description}
        </div>
      </div>
    </div>
  );

  const EtapaSection = ({
    label,
    title,
    description,
    backgroundImage,
    backgroundPosition,
    children,
  }: {
    label: string;
    title: string;
    description: ReactNode;
    backgroundImage: string;
    backgroundPosition?: string;
    children: ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.55 }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-sm"
    >
      <EtapaHeader
        label={label}
        title={title}
        description={description}
        backgroundImage={backgroundImage}
        backgroundPosition={backgroundPosition}
      />
      <div className="px-5 py-5 sm:px-8 sm:py-6">
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#07090F] font-primary">
      <HomeHeader onLogout={handleLogout} />

      {isLoading ? (
        <DrJoeDispenzaSkeleton />
      ) : (
        <main className="pb-20">
          <section className="relative flex min-h-[640px] flex-col items-center justify-end overflow-hidden sm:min-h-[720px] md:min-h-[780px]">
            <button
              onClick={() => navigate('/app')}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-black/20 sm:left-6 sm:top-6 md:left-8 md:top-8"
              style={{
                background: 'rgba(59,130,246,0.18)',
                border: '1px solid rgba(59,130,246,0.38)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </button>
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: 'url("/images/capa-dr-joe-dispenza.png")',
                backgroundPosition: 'center 40%',
                transform: 'scale(1.03)',
                filter: 'saturate(1.05) brightness(0.82) contrast(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.50) 55%, rgba(0,0,0,0.70) 100%)',
              }}
            />
            {/* Focus area: reduz interferência exatamente atrás do texto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.00) 78%)',
                filter: 'blur(2px)',
              }}
            />
            {/* Ambient blue glow: ecoa o halo do caduceu */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 35%, rgba(59,130,246,0.20) 0%, transparent 68%)' }}
            />

            <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-16 pt-28 text-center sm:px-8 sm:pb-20">
              <div
                className="w-full max-w-2xl rounded-3xl px-5 py-7 sm:px-8 sm:py-8"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 55px rgba(0,0,0,0.25)',
                }}
              >
                <span
                  className="mb-6 inline-flex items-center rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{
                    background: 'rgba(59,130,246,0.16)',
                    border: '1px solid rgba(59,130,246,0.34)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.92)',
                  }}
                >
                  DR. JOE DISPENZA
                </span>

                <h1
                  className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl"
                  style={{ textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
                >
                  Você não precisa repetir o passado.
                  <br />
                  <span
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0px 4px 20px rgba(0,0,0,0.6), 0 0 52px rgba(147,197,253,0.55)',
                    }}
                  >
                    Pode criar uma nova realidade.
                  </span>
                </h1>

                <p
                  className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg"
                  style={{ color: 'rgba(255,255,255,0.82)', textShadow: '0px 4px 20px rgba(0,0,0,0.6)' }}
                >
                  Um processo guiado para alinhar intenção clara e emoções elevadas,<br />
                  e transformar sua mente, seu corpo e sua vida.
                </p>
              </div>

              <div
                className="mt-8 w-full max-w-xl rounded-2xl px-5 py-5 text-left"
                style={{
                  background: 'rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(26px)',
                  WebkitBackdropFilter: 'blur(26px)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,0.28)',
                }}
              >
                <ul className="space-y-3 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.92)' }}>
                  {[
                    'Neurociência aplicada à transformação mental',
                    'Intenção clara + emoção elevada = nova energia',
                    'Prática guiada passo a passo',
                  ].map((label) => (
                    <li key={label} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: 'rgba(59,130,246,0.28)',
                          border: '1px solid rgba(59,130,246,0.55)',
                          boxShadow: '0 10px 26px rgba(59,130,246,0.22)',
                        }}
                      >
                        <Check className="h-3.5 w-3.5" style={{ color: '#FFFFFF' }} strokeWidth={3} />
                      </span>
                      <span className="leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                <button
                  onClick={() => {
                    if (completedCount < totalCount) {
                      handleMeditationClick(nextMeditation ?? meditations[0]);
                    }
                  }}
                  disabled={completedCount === totalCount}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] disabled:cursor-default disabled:opacity-70 sm:text-base"
                  style={{
                    background: BLUE,
                    color: '#FFFFFF',
                    boxShadow: '0 10px 40px rgba(59,130,246,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
                  }}
                >
                  {completedCount < totalCount && <Play className="h-4 w-4" fill="currentColor" />}
                  Criar minha nova realidade
                </button>

                <button
                  onClick={scrollToJourney}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 active:scale-[0.99] sm:text-base"
                  style={{
                    color: 'rgba(255,255,255,0.88)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  Ver a jornada <span className="text-white/70">↓</span>
                </button>
              </div>

              <p className="mt-4 text-center text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
                {heroCTALabel} · {completedCount}/{totalCount} concluídas
              </p>
            </div>
          </section>

          {/* ══════════════════════════════════════════
               JORNADA: VISÃO GERAL
          ══════════════════════════════════════════ */}
          <div className="mx-auto max-w-4xl px-4 pt-10 pb-2 md:px-8">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">Jornada</span>
                <span className="h-3 w-px bg-white/20" />
                <span className="text-xs text-white/45">Visão geral</span>
              </div>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>

          {/* ══════════════════════════════════════════
               INTRODUÇÃO EMOCIONAL
          ══════════════════════════════════════════ */}
          <section className="mx-auto max-w-2xl px-6 md:px-4">

            {/* Bloco 1: Abertura */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-16 text-center"
            >
              <p className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
                A maioria das pessoas vive no passado.
              </p>
              <p className="text-base leading-relaxed text-white/70 sm:text-lg">
                Pensando igual.<br />
                Sentindo igual.<br />
                Agindo igual.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                E, com o tempo,<br />
                isso se torna identidade.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 2: Quebra de crença */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-white/70 sm:text-lg">
                Você pensa no futuro…
              </p>
              <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                mas sente as emoções do passado.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                E nada muda.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 3: Ideia central */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-white/70 sm:text-lg">
                Mas existe outra possibilidade.
              </p>
              <p className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
                Quando você muda sua energia,<br />
                você começa a mudar o que atrai.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                Clareza mental + emoção elevada.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 4: Ciência + experiência */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base font-medium leading-relaxed text-white/80 sm:text-lg">
                Não é misticismo.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                É treino do sistema nervoso.
              </p>
              <p className="text-base leading-relaxed text-white/70 sm:text-lg">
                Pensamento + sentimento, até virar novo padrão.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 5: Virada */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-3xl font-semibold leading-[1.12] text-white sm:text-4xl">
                Uma nova energia.
                <br />
                Um novo futuro.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                Não como teoria.<br />
                Como prática.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 6: Abertura da jornada */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Intenção clara.<br />
                Emoções elevadas.
              </p>
              <p className="text-base leading-relaxed text-white/65 sm:text-lg">
                Passo a passo, até o corpo aprender esse futuro.
              </p>
            </motion.div>

            <div className="mx-auto w-16 border-t border-white/10" />

            {/* Bloco 7: Fechamento */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-3 pb-14 pt-14 text-center"
            >
              <p className="text-base leading-relaxed text-white/70 sm:text-lg">
                Agora a pergunta é simples:
              </p>
              <p className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
                Você está pronto para criar uma nova realidade?
              </p>
            </motion.div>

          </section>

          {/* BLOCO 1: EXPLICAÇÃO COMPLETA */}
          <section className="mx-auto max-w-4xl px-4 pt-10 pb-10 sm:pt-14 sm:pb-12 md:px-8">

            {/* ── 🔹 INTRO (blocos 1 e 2) ── */}
            <div className="mb-10">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/45">
                Antes de começar
              </p>
              {/* Bloco 1: Abertura */}
              <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                Quando você está verdadeiramente presente,{' '}
                <span className="text-blue-400">todas as possibilidades existem como potenciais.</span>
              </p>
              <p className="mt-3 text-base leading-relaxed text-white/65 sm:text-lg">
                A experiência que você quer viver já existe como energia no campo. O que você está prestes a fazer é aprender a se sintonizar com ela.
              </p>

              {/* Bloco 2: Conceito central */}
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm">
                <p className="text-base font-semibold leading-snug text-white/90 sm:text-lg">
                  Para transformar um potencial em realidade, são necessárias duas coisas:{' '}
                  <span className="text-blue-400">intenção clara</span> e{' '}
                  <span className="text-blue-400">emoção elevada.</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Intenção é o que você quer criar. Emoção é a energia que sustenta essa criação.
                </p>
              </div>
            </div>

            {/* ── 🔹 CARD EXPLICATIVO (blocos 3 a 6) ── */}
            <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-8 backdrop-blur-sm sm:px-8 sm:py-10">
              <p className="mb-7 text-[10px] font-bold uppercase tracking-widest text-white/45">
                Como essa prática funciona
              </p>
              <div className="space-y-8">

                {/* Bloco 3: Intenção (parte mental) */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-white/25 pt-0.5">01</span>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Intenção: parte mental</p>
                    <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                      <span className="font-semibold text-white/90">Intenção clara</span> é saber exatamente o que você quer. Seus pensamentos são a carga elétrica que você envia ao campo. Quanto mais claro e específico você for, mais coerente será o sinal que você transmite.
                    </p>
                  </div>
                </div>

                {/* Bloco 4: Emoção (parte corporal) */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-white/25 pt-0.5">02</span>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Emoção: parte corporal</p>
                    <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                      <span className="font-semibold text-white/90">Emoções elevadas</span> como gratidão, amor, inspiração ou alegria elevam seu estado interno. Essas emoções são a carga magnética que atrai a experiência.
                    </p>
                  </div>
                </div>

                {/* Bloco 5: A assinatura */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-white/25 pt-0.5">03</span>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">A assinatura: ponto-chave</p>
                    <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                      Quando você combina intenção com emoção elevada, cria uma <span className="font-semibold text-white/90">assinatura eletromagnética</span>. Essa assinatura é o que conecta você a uma nova possibilidade no campo.
                    </p>
                  </div>
                </div>

                {/* Bloco 6: Como o campo funciona */}
                <div className="flex gap-4">
                  <span className="flex-shrink-0 w-7 text-right text-xs font-bold tabular-nums text-white/25 pt-0.5">04</span>
                  <div className="flex-1 border-l border-white/10 pl-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1">Como o campo funciona</p>
                    <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                      Os potenciais existem como frequências no campo. Quando sua energia combina com uma dessas frequências, você começa a atrair essa experiência para a sua vida.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* ── 🔹 FRASE DE IMPACTO (bloco 7) ── */}
            <div className="mb-6 border-t border-b border-white/12 py-9">
              <p className="text-center font-display text-xl font-semibold italic leading-snug text-white/85 sm:text-2xl md:text-3xl">
                "Se você pensa no futuro, mas continua sentindo emoções do passado, nada muda."
              </p>
            </div>

            {/* ── 🔹 DIAGRAMA (bloco 5 visualizado) ── */}
            <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-8 sm:px-8 sm:py-10">
              <h3 className="mb-7 text-center font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
                <span className="text-blue-400">Intenção clara</span>{' '}
                <span className="text-white/30">+</span>{' '}
                <span className="text-white/85">emoções elevadas</span>{' '}
                <span className="text-white/30">=</span>{' '}
                <span className="text-white">nova energia</span>
              </h3>
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="mb-1 text-center leading-tight">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-blue-400">INTENÇÃO</div>
                    <div className="mt-0.5 text-[10px] font-medium text-blue-400/60">(pensamentos)</div>
                  </div>
                  {[
                    '1. Trabalhar de qualquer lugar no mundo',
                    '2. Ganhar o mesmo ou mais',
                    '3. Contratos de seis meses a um ano',
                    '4. Amar o que eu faço',
                    '5. Ser meu chefe e liderar minha equipe',
                  ].map(item => (
                    <span
                      key={item}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-center text-[10px] font-medium leading-snug text-white/80 sm:text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-shrink-0 flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px w-6 bg-blue-500/40 sm:w-8" />
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-bold text-white/40">
                      +
                    </span>
                    <div className="h-px w-6 bg-white/25 sm:w-8" />
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-blue-500/15 blur-md" aria-hidden />
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#3B82F6] text-base font-extrabold text-white shadow-lg sm:h-14 sm:w-14 sm:text-lg">
                      A
                    </div>
                  </div>
                  <span className="mt-0.5 max-w-[8rem] text-center text-[10px] font-semibold leading-tight text-white/45">
                    nova assinatura energética
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-xs font-bold text-white/40">
                    =
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="mb-1 text-center leading-tight">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/85">EMOÇÃO ELEVADA</div>
                    <div className="mt-0.5 text-[10px] font-medium text-white/50">(sentimentos)</div>
                  </div>
                  {['1. Empoderado', '2. Apaixonado pela vida', '3. Livre', '4. Grato'].map(item => (
                    <span
                      key={item}
                      className="w-full rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] px-2.5 py-2 text-center text-[10px] font-medium leading-snug text-white/80 sm:text-xs"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-7 text-center text-xs text-white/40">
                Pensamentos dão direção. Emoções dão energia.
              </p>
            </div>

            {/* ── 🔹 EMOÇÃO + GRATIDÃO (blocos 13 e 14) ── */}
            <div className="mb-10">
              {/* Bloco 13: Gratidão */}
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-5 sm:px-8">
                <p className="text-sm font-semibold text-white/90 sm:text-base">
                  Se você não souber o que sentir, comece pela gratidão.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Normalmente sentimos gratidão <em>depois</em> de receber algo. Sentir gratidão agora significa que isso já aconteceu.
                </p>
              </div>

              {/* Bloco 14: Integração */}
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] px-6 py-5 sm:px-8">
                <p className="text-sm font-semibold text-white/90 sm:text-base">
                  Isso não é um processo intelectual. É um processo visceral.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Você precisa realmente <em>sentir</em> essas emoções. Ensine ao seu corpo como esse futuro se sente.
                </p>
              </div>
            </div>

            {/* Bloco 15: Fechamento */}
            <div className="mb-8 text-center">
              <p className="text-sm leading-relaxed text-white/65 sm:text-base">
                Quando você faz isso, seu corpo começa a acreditar{' '}
                <span className="font-semibold text-white/90">que esse futuro já é real.</span>
              </p>
            </div>

            {/* ── 🔹 TRANSIÇÃO (bloco 16) ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/12" />
              <p className="text-sm font-medium text-white/50">
                Agora você vai aplicar isso na prática.
              </p>
              <div className="h-px flex-1 bg-white/12" />
            </div>

          </section>

          {/* Toast de celebração */}
          {sessionJustCompleted !== null && (
            <div className="mx-auto max-w-4xl px-4 sm:px-8 mb-4 animate-fade-in">
              <div className="rounded-2xl border border-blue-500/25 bg-blue-500/[0.12] px-4 py-3 flex items-center gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs text-white font-bold">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-blue-300">
                    Prática concluída!
                  </p>
                  <p className="text-xs text-blue-400">
                    Você avançou para {sessionJustCompleted}% da jornada
                  </p>
                </div>
              </div>
            </div>
          )}

          <div id="jornada" className="scroll-mt-24" />

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
            <div className="space-y-10">
              <div>
                <EtapaSection
                  label="ETAPA 1"
                  title="Criando seu potencial"
                  description={<p>Defina a experiência que você quer criar e conecte-se com a emoção desse futuro antes de meditar.</p>}
                  backgroundImage={'url("/images/capa-dr-joe-dispenza.png")'}
                  backgroundPosition="center 40%"
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                      style={{ borderColor: BLUE, color: BLUE, background: 'rgba(59,130,246,0.10)' }}
                    >
                      ✦
                    </div>
                    <button
                      onClick={() => navigate('/app/minigame-potencial')}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            Criando seu novo potencial
                          </h3>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: BLUE_SOFT,
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              border: `1px solid ${BLUE_BORDER}`,
                              color: 'rgba(147,197,253,0.95)',
                            }}
                          >
                            EXPERIÊNCIA
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          3 minutos para definir sua intenção e sentir a emoção.
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">3 min</span>
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10"
                          style={{ background: 'rgba(59,130,246,0.12)' }}
                        >
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="ETAPA 2"
                  title={sintonizeMeditation.title}
                  description={<p>Acesse o campo de possibilidades além do seu passado</p>}
                  backgroundImage={sintonizeMeditation.image}
                  backgroundPosition={sintonizeMeditation.imagePosition}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    {sintonizeMeditation.completed ? (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                      >
                        2
                      </div>
                    )}
                    <button
                      onClick={() => handleMeditationClick(sintonizeMeditation)}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            {sintonizeMeditation.title}
                          </h3>
                          {sintonizeMeditation.isPremium && !sintonizeMeditation.completed && (
                            <Lock className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          {sintonizeMeditation.description}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">{sintonizeMeditation.duration}</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: sintonizeMeditation.isPremium && !sintonizeMeditation.completed ? 'rgba(255,255,255,0.30)' : BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="ETAPA 3"
                  title={etapa1Meditation.title}
                  description={<p>Ative seu corpo para um novo estado interno</p>}
                  backgroundImage={etapa1Meditation.image}
                  backgroundPosition={etapa1Meditation.imagePosition}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    {etapa1Meditation.completed ? (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                      >
                        3
                      </div>
                    )}
                    <button
                      onClick={() => handleMeditationClick(etapa1Meditation)}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            {etapa1Meditation.title}
                          </h3>
                          {etapa1Meditation.isPremium && !etapa1Meditation.completed && (
                            <Lock className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          {etapa1Meditation.description}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">{etapa1Meditation.duration}</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: etapa1Meditation.isPremium && !etapa1Meditation.completed ? 'rgba(255,255,255,0.30)' : BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="ETAPA 4"
                  title={recondicioneMeditation.title}
                  description={<p>{recondicioneMeditation.description}</p>}
                  backgroundImage={recondicioneMeditation.image}
                  backgroundPosition={recondicioneMeditation.imagePosition}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    {recondicioneMeditation.completed ? (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                      >
                        4
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/app/recondicione-antes-de-comecar')}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            {recondicioneMeditation.title}
                          </h3>
                          {recondicioneMeditation.isPremium && !recondicioneMeditation.completed && (
                            <Lock className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          {recondicioneMeditation.description}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">{recondicioneMeditation.duration}</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: recondicioneMeditation.isPremium && !recondicioneMeditation.completed ? 'rgba(255,255,255,0.30)' : BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="ETAPA 5"
                  title={caminhandoMeditation.title}
                  description={<p>{caminhandoMeditation.description}</p>}
                  backgroundImage={caminhandoMeditation.image}
                  backgroundPosition={caminhandoMeditation.imagePosition}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    {caminhandoMeditation.completed ? (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                      >
                        5
                      </div>
                    )}
                    <button
                      onClick={() => handleMeditationClick(caminhandoMeditation)}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            {caminhandoMeditation.title}
                          </h3>
                          {caminhandoMeditation.isPremium && !caminhandoMeditation.completed && (
                            <Lock className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          {caminhandoMeditation.description}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">{caminhandoMeditation.duration}</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: caminhandoMeditation.isPremium && !caminhandoMeditation.completed ? 'rgba(255,255,255,0.30)' : BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              <div>
                <EtapaSection
                  label="ETAPA 6"
                  title={espacoTempoMeditation.title}
                  description={<p>{espacoTempoMeditation.description}</p>}
                  backgroundImage={espacoTempoMeditation.image}
                  backgroundPosition={espacoTempoMeditation.imagePosition}
                >
                  <div
                    className="flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(59,130,246,0.20)`,
                    }}
                  >
                    {espacoTempoMeditation.completed ? (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUE }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold"
                        style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.06)' }}
                      >
                        6
                      </div>
                    )}
                    <button
                      onClick={() => handleMeditationClick(espacoTempoMeditation)}
                      className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-white/90 sm:text-base">
                            {espacoTempoMeditation.title}
                          </h3>
                          {espacoTempoMeditation.isPremium && !espacoTempoMeditation.completed && (
                            <Lock className="h-3.5 w-3.5 text-white/40" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-white/65 sm:mt-1 sm:text-sm">
                          {espacoTempoMeditation.description}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                        <span className="text-xs text-white/55 sm:text-sm">{espacoTempoMeditation.duration}</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: espacoTempoMeditation.isPremium && !espacoTempoMeditation.completed ? 'rgba(255,255,255,0.30)' : BLUE }} fill="currentColor" />
                        </div>
                      </div>
                    </button>
                  </div>
                </EtapaSection>
              </div>

              {/* ── Progresso da jornada ── */}
              <div className="mt-10 mb-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm sm:p-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-white/90">{urgencyLabel}</span>
                  <span className="text-sm font-bold text-white">{pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(59,130,246,0.14)' }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: BLUE,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/45">
                  {completedCount} de {totalCount} práticas concluídas
                  {pct >= 50 && pct < 100 ? ' · A maioria desiste antes da metade. Você passou.' : ''}
                </p>
              </div>
            </div>
          </section>

          {/* (Etapas adicionais removidas para manter a sequência e o padrão visual) */}

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
