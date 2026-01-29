import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, Circle, ArrowLeft, Lock } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';
import MeditationPageSkeleton from '@/components/MeditationPageSkeleton';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import MeditacaoExitModal from '@/components/MeditacaoExitModal';
import mixpanel from '@/lib/mixpanel';
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
    id: 'intro_1',
    title: 'Primeiros passos',
    description: 'Descubra o que é meditar e prepare-se para sua jornada',
    duration: '5 min',
    audioUrl: '/audio/intro-primeiros-passos.mp3',
    image: 'url("/images/meditacao-introducao.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
    completed: false,
  },
  {
    id: 'intro_2',
    title: 'Observando a respiração',
    description: 'Aprenda a focar sua atenção na respiração',
    duration: '4 min',
    audioUrl: '/audio/observando-respiracao.mp3',
    image: 'url("/images/observando-respiracao.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: false,
  },
  {
    id: 'intro_3',
    title: 'Sentindo',
    description: 'Conecte-se com suas sensações e emoções',
    duration: '4 min',
    audioUrl: '/audio/sentindo.mp3',
    image: 'url("/images/sentindo.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'intro_4',
    title: 'Desacelerando e relaxando',
    description: 'Reduza o ritmo e alcance um estado profundo de relaxamento',
    duration: '8 min',
    audioUrl: '/audio/intro-relaxando.mp3',
    image: 'url("/images/meditacao-introducao.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'intro_5',
    title: 'Observando o corpo',
    description: 'Desenvolva consciência corporal através do body scan',
    duration: '9 min',
    audioUrl: '/audio/intro-corpo.mp3',
    image: 'url("/images/meditacao-introducao.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
];

// Chave para sessionStorage - modal aparece apenas uma vez por sessão
const EXIT_MODAL_SHOWN_KEY = 'eco.meditacao.exitModalShown';

export default function IntroducaoMeditacaoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const [isLoading, setIsLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  // Load meditations from localStorage
  const [meditations, setMeditations] = useState<Meditation[]>(() => {
    const storageKey = `eco.introducao.meditations.v2.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_MEDITATIONS to ensure all properties are updated
        return parsed.map((saved: Meditation) => {
          const initial = INITIAL_MEDITATIONS.find(m => m.id === saved.id);
          return {
            ...initial,
            completed: saved.completed || false,
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
    const storageKey = `eco.introducao.meditations.v2.${user?.id || 'guest'}`;
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
          category: 'introducao',
          duration_seconds: parseDurationToSeconds(meditation.duration),
          is_premium: true,
          source_page: location.pathname,
          has_subscription: false,
        };
        trackMeditationEvent('Front-end: Premium Content Blocked', payload);

        // Show upgrade modal
        requestUpgrade('introducao_meditacao');
        return;
      }
    }

    // Track meditation selected
    const payload: Omit<MeditationSelectedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
      meditation_id: meditation.id,
      meditation_title: meditation.title,
      category: 'introducao',
      duration_seconds: parseDurationToSeconds(meditation.duration),
      is_premium: meditation.isPremium || false,
      is_completed: meditation.completed,
      source_page: location.pathname,
    };
    trackMeditationEvent('Front-end: Meditation Selected', payload);

    sessionStorage.setItem('introducaoPageScrollPosition', window.scrollY.toString());

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
          category: 'introducao',
          isPremium: meditation.isPremium || false,
        },
        returnTo: '/app/introducao-meditacao',
      },
    });
  };

  const handleToggleComplete = (id: string) => {
    setMeditations(prev =>
      prev.map(m => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const completedCount = meditations.filter(m => m.completed).length;
  const totalCount = meditations.length;

  // Se o usuário está logado, pode fazer logout
  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  };

  // Interceptar clique no botão Voltar
  const handleBackClick = () => {
    // Só mostra modal para guests
    if (!user) {
      // Verificar se já foi mostrado nesta sessão
      const wasShown = sessionStorage.getItem(EXIT_MODAL_SHOWN_KEY);

      if (!wasShown) {
        sessionStorage.setItem(EXIT_MODAL_SHOWN_KEY, 'true');
        setShowExitModal(true);

        mixpanel.track('Meditacao Primeiros Passos: Exit Modal Shown', {
          timestamp: new Date().toISOString(),
        });
        return; // Não navega ainda
      }
    }

    // Navega normalmente
    navigate(user ? '/app' : '/');
  };

  // Handlers do modal
  const handleModalSignup = () => {
    mixpanel.track('Meditacao Primeiros Passos: Exit Modal - Signup Clicked');
    setShowExitModal(false);
    navigate('/register', { state: { from: 'meditacao-primeiros-passos' } });
  };

  const handleModalStay = () => {
    mixpanel.track('Meditacao Primeiros Passos: Exit Modal - Stayed');
    setShowExitModal(false);
  };

  const handleModalLeave = () => {
    mixpanel.track('Meditacao Primeiros Passos: Exit Modal - Left Anyway');
    setShowExitModal(false);
    navigate('/');
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Simulate loading time to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);

      // Track list viewed after loading
      const payload: Omit<MeditationListViewedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        category: 'introducao',
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
      {/* Header - apenas se usuário logado */}
      {user && <HomeHeader onLogout={handleLogout} />}

      {isLoading ? (
        <MeditationPageSkeleton />
      ) : (
        <main className="pb-20">
          <section className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden py-12 sm:min-h-[500px] sm:py-16 md:min-h-[600px] md:py-20">
            {/* Navegação superior */}
            <div className="absolute left-4 top-4 right-4 z-20 flex items-center justify-between sm:left-6 sm:top-6 sm:right-6 md:left-8 md:top-8 md:right-8">
              {/* Botão Voltar */}
              <button
                onClick={handleBackClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--eco-text)] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {/* CTA para guest */}
              {!user && (
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-eco-400 to-eco-500 rounded-full hover:shadow-lg transition-all duration-200"
                >
                  Criar conta grátis
                </button>
              )}
            </div>
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: 'url("/images/meditacao-introducao.webp")',
                backgroundPosition: 'center 32%',
                transform: 'scale(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,1) 100%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center px-4 text-center sm:px-6">
              <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                Primeiros passos
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/95 drop-shadow-md sm:mt-4 sm:text-base md:text-lg lg:text-xl" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                Bem-vindo ao Ecotopia! Com estas pequenas práticas, você vai descobrir o que é meditar e dar os seus primeiros passos nesta experiência.
              </p>

              <button
                onClick={() => handleMeditationClick(meditations[0])}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#2D88B8] shadow-lg transition-all duration-300 hover:bg-white/95 hover:shadow-xl hover:scale-105 active:scale-95 sm:mt-8 sm:px-8 sm:py-3 sm:text-base"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                Tocar
              </button>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">E agora?</h2>
              <span className="text-xs text-[var(--eco-muted)] sm:text-sm">
                {completedCount} concluído(s) de {totalCount}
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {meditations.map((meditation) => (
              <div
                key={meditation.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--eco-line)] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] sm:items-center sm:gap-4 sm:p-4"
              >
                <button
                  onClick={() => handleToggleComplete(meditation.id)}
                  className="flex-shrink-0 pt-1 sm:pt-0"
                  disabled={meditation.isPremium}
                >
                  {meditation.completed ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6EC1E4] sm:h-8 sm:w-8">
                      <Check className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={3} />
                    </div>
                  ) : (
                    <Circle className="h-7 w-7 text-[var(--eco-line)] sm:h-8 sm:w-8" strokeWidth={2} />
                  )}
                </button>

                <button
                  onClick={() => handleMeditationClick(meditation)}
                  className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                        {meditation.title}
                      </h3>
                      {meditation.isPremium && (
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
                      meditation.isPremium ? 'bg-gray-200' : 'bg-[#6EC1E4]/10'
                    }`}>
                      <Play className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        meditation.isPremium ? 'text-gray-400' : 'text-[#6EC1E4]'
                      }`} fill="currentColor" />
                    </div>
                  </div>
                </button>
              </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* Exit Modal */}
      <MeditacaoExitModal
        open={showExitModal}
        onClose={handleModalStay}
        onSignup={handleModalSignup}
        onLeaveAnyway={handleModalLeave}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="introducao_meditacao"
      />
    </div>
  );
}
