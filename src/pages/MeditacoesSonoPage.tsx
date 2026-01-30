import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Check, Circle, ArrowLeft, Lock } from 'lucide-react';
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
    id: 'sono_1',
    title: 'Sono Profundo',
    description: 'Relaxe profundamente e prepare-se para uma noite de sono restaurador',
    duration: '9 min',
    audioUrl: '/audio/meditacao-sono.mp4',
    image: 'url("/images/meditacao-sono-new.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #3E4277 20%, #333665 40%, #282B52 60%, #1E2140 80%, #14172E 100%)',
    completed: false,
    isPremium: false,
  },
  {
    id: 'sono_2',
    title: 'Ansiedade + Sono Profundo',
    description: 'Acalme a mente ansiosa e encontre paz profunda para uma noite tranquila',
    duration: '15 min',
    audioUrl: '/audio/meditacao-ansiedade-sono.mp3',
    image: 'url("/images/meditacao-ansiedade-sono.webp")',
    imagePosition: 'center center',
    gradient: 'linear-gradient(to bottom, #6B5B95 0%, #5D4E85 20%, #4F4175 40%, #413465 60%, #332755 80%, #251A45 100%)',
    completed: false,
    isPremium: false,
  },
];

export default function MeditacoesSonoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const [isLoading, setIsLoading] = useState(true);

  // Load meditations from localStorage
  const [meditations, setMeditations] = useState<Meditation[]>(() => {
    const storageKey = `eco.sono.meditations.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_MEDITATIONS to ensure all properties are updated
        return INITIAL_MEDITATIONS.map((initial) => {
          const savedMed = parsed.find((m: Meditation) => m.id === initial.id);
          return {
            ...initial,
            completed: savedMed?.completed || false,
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
    const storageKey = `eco.sono.meditations.v1.${user?.id || 'guest'}`;
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
          category: 'sono',
          duration_seconds: parseDurationToSeconds(meditation.duration),
          is_premium: true,
          source_page: location.pathname,
          has_subscription: false,
        };
        trackMeditationEvent('Front-end: Premium Content Blocked', payload);

        // Show upgrade modal
        requestUpgrade('meditacoes_sono');
        return;
      }
    }

    // Track meditation selected
    const payload: Omit<MeditationSelectedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
      meditation_id: meditation.id,
      meditation_title: meditation.title,
      category: 'sono',
      duration_seconds: parseDurationToSeconds(meditation.duration),
      is_premium: meditation.isPremium || false,
      is_completed: meditation.completed,
      source_page: location.pathname,
    };
    trackMeditationEvent('Front-end: Meditation Selected', payload);

    sessionStorage.setItem('sonoPageScrollPosition', window.scrollY.toString());

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          id: meditation.id,
          title: meditation.title,
          duration: meditation.duration,
          audioUrl: meditation.audioUrl,
          imageUrl: meditation.image.replace('url("', '').replace('")', ''),
          backgroundMusic: 'Sono',
          gradient: meditation.gradient,
          category: 'sono',
          isPremium: meditation.isPremium || false,
        },
        returnTo: '/app/meditacoes-sono',
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

  // Botão de voltar
  const handleBackClick = () => {
    navigate('/app');
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Simulate loading time to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false);

      // Track list viewed after loading
      const payload: Omit<MeditationListViewedPayload, 'user_id' | 'session_id' | 'timestamp'> = {
        category: 'sono',
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
                backgroundImage: 'url("/images/meditacoes-sono-hero.webp")',
                backgroundPosition: 'center center',
                transform: 'scale(1.05)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(35,39,96,0) 0%, rgba(35,39,96,0) 40%, rgba(255,255,255,1) 100%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center px-4 text-center sm:px-6">
              <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                Durma em Paz
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/95 drop-shadow-md sm:mt-4 sm:text-base md:text-lg lg:text-xl" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                Liberte-se das preocupações do dia e encontre o caminho para um descanso profundo e restaurador. Meditações que guiam você suavemente para o sono.
              </p>

              <button
                onClick={() => handleMeditationClick(meditations[0])}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#4A4E8A] shadow-lg transition-all duration-300 hover:bg-white/95 hover:shadow-xl hover:scale-105 active:scale-95 sm:mt-8 sm:px-8 sm:py-3 sm:text-base"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                Tocar
              </button>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
            <div className="mb-4 flex items-center justify-between sm:mb-6">
              <h2 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">Meditações disponíveis</h2>
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A4E8A] sm:h-8 sm:w-8">
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
                      meditation.isPremium ? 'bg-gray-200' : 'bg-[#4A4E8A]/10'
                    }`}>
                      <Play className={`h-4 w-4 sm:h-5 sm:w-5 ${
                        meditation.isPremium ? 'text-gray-400' : 'text-[#4A4E8A]'
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="meditacoes_sono"
      />
    </div>
  );
}
