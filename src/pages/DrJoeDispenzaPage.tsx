import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, ArrowLeft, Lock } from 'lucide-react';
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
          <section className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden py-12 sm:min-h-[500px] sm:py-16 md:min-h-[600px] md:py-20">
            <button
              onClick={() => navigate('/app')}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--eco-text)] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg sm:left-6 sm:top-6 md:left-8 md:top-8"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: 'url("/images/caduceu-dourado.webp")',
                backgroundPosition: 'center 40%',
                transform: 'scale(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(59, 30, 119, 0.6) 0%, rgba(59, 30, 119, 0.85) 100%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center px-4 text-center sm:px-6">
              <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                Desperte Seu Potencial Infinito
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/95 drop-shadow-md sm:mt-4 sm:text-base md:text-lg lg:text-xl" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                Sua mente criou os padrões que te limitam. Essas meditações foram criadas para desfazê-los — um por um.
              </p>

              <button
                onClick={() => {
                  if (completedCount < totalCount) {
                    handleMeditationClick(nextMeditation ?? meditations[0]);
                  }
                }}
                disabled={completedCount === totalCount}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#3B1E77] shadow-lg transition-all duration-300 hover:bg-white/95 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-default sm:mt-8 sm:px-8 sm:py-3 sm:text-base"
              >
                {completedCount < totalCount && <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />}
                {heroCTALabel}
              </button>
            </div>
          </section>

          {/* Toast de celebração */}
          {sessionJustCompleted !== null && (
            <div className="mx-auto max-w-4xl px-4 sm:px-8 mb-4 animate-fade-in">
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-2.5 flex items-center gap-2">
                <span className="text-violet-600 text-sm font-semibold">
                  Você avançou para {sessionJustCompleted}% da sua jornada
                </span>
              </div>
            </div>
          )}

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
            {/* Bloco de progresso */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{urgencyLabel}</span>
                <span className="text-sm font-bold text-gray-800">{pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct === 100
                        ? 'linear-gradient(to right, #34d399, #10b981)'
                        : '#89CFF0',
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {completedCount} de {totalCount} sessões concluídas
                {pct >= 50 && pct < 100 ? ' · A maioria desiste antes da metade — você passou' : ''}
              </p>
            </div>

            <h2 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg mb-4">Sua jornada · {completedCount} de {totalCount} concluídas</h2>

            <div className="space-y-3 sm:space-y-4">
              {meditations.map((meditation, index) => {
                const isNext = index === nextIndex && !meditation.completed;
                return (
                  <div key={meditation.id} className="space-y-3 sm:space-y-4">
                    {/* Card da meditação */}
                    <div
                      className={`flex items-center gap-3 rounded-2xl border p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] sm:gap-4 sm:p-4 ${
                        isNext
                          ? 'border-[#89CFF0]/60 bg-[#89CFF0]/5'
                          : 'border-[var(--eco-line)] bg-white'
                      }`}
                    >
                      {/* A — Círculo numerado */}
                      <div className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        meditation.completed
                          ? 'bg-[#89CFF0] text-white'
                          : isNext
                          ? 'border-2 border-[#89CFF0] text-[#89CFF0]'
                          : 'border-2 border-[var(--eco-line)] text-[var(--eco-muted)]'
                      }`}>
                        {meditation.completed
                          ? <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          : index + 1}
                      </div>

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
                              <span className="rounded-full bg-[#89CFF0]/15 px-2 py-0.5 text-[10px] font-semibold text-[#89CFF0]">
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
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                            meditation.isPremium ? 'bg-gray-200' : 'bg-[#89CFF0]/10'
                          }`}>
                            <Play className={`h-4 w-4 sm:h-5 sm:w-5 ${
                              meditation.isPremium ? 'text-gray-400' : 'text-[#89CFF0]'
                            }`} fill="currentColor" />
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* B — CTA intermediária após item 0 para não-VIP */}
                    {index === 0 && !isVipUser && (
                      <div className="rounded-2xl border border-[#89CFF0]/30 bg-[#89CFF0]/5 px-4 py-5 text-center">
                        <p className="text-sm font-medium text-[var(--eco-text)] leading-snug">
                          Você sentiu o primeiro passo.<br />
                          <span className="text-[var(--eco-muted)] font-normal">
                            Desbloqueie as 4 sessões restantes para completar a jornada.
                          </span>
                        </p>
                        <button
                          onClick={() => requestUpgrade('dr_joe_list_cta')}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#3B1E77] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                          Continuar a jornada →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
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
