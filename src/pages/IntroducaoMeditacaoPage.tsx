import ProximoCaminho from '@/components/reino/ProximoCaminho';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';
import { useAuth } from '@/contexts/AuthContext';
import ReinoCarregando from '@/components/reino/ReinoCarregando';
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
    description: '5 minutos para entender o que acontece quando você para.',
    duration: '5 min',
    audioUrl: '/audio/intro-primeiros-passos.mp3',
    image: 'url("/images/reino/capa-primeiros-passos.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #1C2350 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #1C2350 80%, #1F7BAD 100%)',
    completed: false,
  },
  {
    id: 'intro_2',
    title: 'Observando a respiração',
    description: 'Sua respiração sempre esteve lá. Agora você vai ouvi-la.',
    duration: '4 min',
    audioUrl: '/audio/observando-respiracao.mp3',
    image: 'url("/images/reino/capa-respire.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #1C2350 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #1C2350 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: false,
  },
  {
    id: 'intro_3',
    title: 'Sentindo',
    description: 'O que o seu corpo sente quando a mente para de falar?',
    duration: '4 min',
    audioUrl: '/audio/sentindo.mp3',
    image: 'url("/images/reino/capa-primeiros-passos.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #1C2350 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #1C2350 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'intro_4',
    title: 'Desacelerando e relaxando',
    description: 'Para o dia que não quer terminar. 8 min para soltar tudo.',
    duration: '8 min',
    audioUrl: '/audio/intro-relaxando.mp3',
    image: 'url("/images/reino/capa-solte.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #1C2350 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #1C2350 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'intro_5',
    title: 'Observando o corpo',
    description: 'Uma viagem de cima a baixo. Você vai se surpreender com o que vai sentir.',
    duration: '9 min',
    audioUrl: '/audio/intro-corpo.mp3',
    image: 'url("/images/reino/capa-primeiros-passos.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #1C2350 0%, #1C2350 20%, #4AA5CE 40%, #3B96C3 60%, #1C2350 80%, #1F7BAD 100%)',
    completed: false,
    isPremium: true,
  },
];

// Chave para sessionStorage - modal aparece apenas uma vez por sessão
const EXIT_MODAL_SHOWN_KEY = 'eco.meditacao.exitModalShown';

export default function IntroducaoMeditacaoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVipUser } = useAuth();
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
    sessionStorage.setItem('eco.intro.lastPlayedId', meditation.id);

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

  const [sessionJustCompleted, setSessionJustCompleted] = useState<number | null>(null);

  const completedCount = meditations.filter(m => m.completed).length;
  const totalCount = meditations.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const remaining = totalCount - completedCount;
  const nextMeditation = meditations.find(m => !m.completed);
  const nextIndex = meditations.findIndex(m => !m.completed);
  const heroCTALabel =
    completedCount === 0
      ? `Começar: ${meditations[0].title}`
      : completedCount === totalCount
      ? 'Trilha concluída'
      : `Continuar: ${nextMeditation?.title ?? meditations[0].title}`;
  const urgencyLabel =
    pct === 0
      ? `Comece por aqui. ${completedCount} de ${totalCount} sessões feitas`
      : pct === 100
      ? 'Trilha concluída. Todas as 5 sessões feitas.'
      : pct >= 80
      ? 'Você está quase lá'
      : `Faltam ${remaining} sessões. ${completedCount} de ${totalCount} feitas`;

  // Interceptar clique no botão Voltar
  const handleBackClick = () => {
    // Só mostra modal para guests
    if (!user) {
      // Verificar se já foi mostrado nesta sessão
      const wasShown = sessionStorage.getItem(EXIT_MODAL_SHOWN_KEY);

      if (!wasShown) {
        sessionStorage.setItem(EXIT_MODAL_SHOWN_KEY, 'true');
        setShowExitModal(true);

        mixpanel.track('Meditação · Exit modal exibido', {
          timestamp: new Date().toISOString(),
        });
        return; // Não navega ainda
      }
    }

    // Navega normalmente
    navigate(user ? '/app' : '/login');
  };

  // Handlers do modal
  const handleModalSignup = () => {
    mixpanel.track('Meditação · Exit modal signup');
    setShowExitModal(false);
    navigate('/register?returnTo=' + encodeURIComponent('/app/introducao-meditacao'));
  };

  const handleModalStay = () => {
    mixpanel.track('Meditação · Exit modal ficou');
    setShowExitModal(false);
  };

  const handleModalLeave = () => {
    mixpanel.track('Meditação · Exit modal saiu');
    setShowExitModal(false);
    navigate('/login');
  };

  // Marcar sessão como concluída automaticamente ao voltar do player
  useEffect(() => {
    if (!location.state?.returnFromMeditation) return;
    const lastId = sessionStorage.getItem('eco.intro.lastPlayedId');
    if (!lastId) return;
    sessionStorage.removeItem('eco.intro.lastPlayedId');

    if (localStorage.getItem(`eco.meditation.completed80pct.${lastId}`) !== 'true') return;

    setMeditations(prev => {
      if (prev.find(m => m.id === lastId)?.completed) return prev;
      const next = prev.map(m => m.id === lastId ? { ...m, completed: true } : m);
      const newPct = Math.round(next.filter(m => m.completed).length / next.length * 100);
      setSessionJustCompleted(newPct);
      setTimeout(() => setSessionJustCompleted(null), 3000);
      localStorage.setItem(
        `eco.program.lastActive.intro.${user?.id || 'guest'}`,
        new Date().toISOString()
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  const sessoes: ReinoSessao[] = meditations.map((m, index) => {
    const bloqueada = !!m.isPremium && !isVipUser && !checkAccess(true).hasAccess;
    const estado: ReinoSessao['estado'] = m.completed
      ? 'feita'
      : index === nextIndex
      ? 'proxima'
      : bloqueada
      ? 'trancada'
      : 'livre';
    const meta =
      estado === 'feita' ? 'feita' : estado === 'proxima' ? `próxima · ${m.duration}` : estado === 'trancada' ? `assinantes · ${m.duration}` : m.duration;
    return { id: m.id, titulo: m.title, descricao: m.description, meta, estado };
  });

  return (
    <div className="reino-corpo" style={{ minHeight: '100dvh' }}>
      {user && <HomeHeader />}

      {isLoading ? (
        <ReinoCarregando inline />
      ) : (
        <main className="page-with-nav">
          <ReinoChegada
            mood="amanhecer"
            imagem="/images/reino/capa-primeiros-passos.webp"
            foco="center 70%"
            lugar="TRI.04 · As Trilhas · Programa de 5 sessões"
            titulo="Primeiros passos"
            sobre="Nunca meditou antes? Perfeito. Esta trilha começa exatamente de onde você está agora."
            voltar={{ rotulo: user ? 'Voltar para Hoje' : 'Voltar', onClick: handleBackClick }}
            extra={
              !user ? (
                <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/register')}>
                  Criar conta grátis
                </button>
              ) : undefined
            }
            progresso={{ valor: pct / 100, legenda: urgencyLabel }}
          >
            {completedCount < totalCount && (
              <button
                type="button"
                className="reino-placa"
                onClick={() => handleMeditationClick(nextMeditation ?? meditations[0])}
              >
                {heroCTALabel} <span aria-hidden="true">→</span>
              </button>
            )}
            {completedCount === totalCount && <ProximoCaminho atual="intro" />}
          </ReinoChegada>

          <div className="reino-pagina">
            {sessionJustCompleted !== null && (
              <div className="reino-nota" role="status">
                <p>Você avançou para {sessionJustCompleted}% da trilha.</p>
              </div>
            )}

            <p className="reino-rotulo">As cinco sessões</p>
            <ReinoSessoes
              sessoes={sessoes}
              onEscolher={(id) => {
                const m = meditations.find((x) => x.id === id);
                if (m) handleMeditationClick(m);
              }}
              depoisDe={
                !isVipUser
                  ? {
                      indice: 0,
                      conteudo: (
                        <div className="reino-convite">
                          <h2 className="reino-corpo__titulo" style={{ fontSize: 24 }}>
                            Você deu o primeiro passo.
                          </h2>
                          <p className="reino-corpo__sobre">Continue com as 4 práticas seguintes e forme o hábito.</p>
                          <button type="button" className="reino-placa" onClick={() => requestUpgrade('introducao_list_cta')}>
                            Desbloquear sessões <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      ),
                    }
                  : undefined
              }
            />
          </div>
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