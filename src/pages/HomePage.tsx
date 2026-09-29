import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';
import HomeHeader from '@/components/home/HomeHeader';
import DailyRecommendationsSection from '@/components/home/DailyRecommendationsSection';
import ContinueProgramSection from '@/components/home/ContinueProgramSection';
import EnergyBlessingsSection from '@/components/home/EnergyBlessingsSection';
import EcoAIGuidanceCard from '@/components/home/EcoAIGuidanceCard';
import EcoDreamGuidanceCard from '@/components/home/EcoDreamGuidanceCard';
import LearnExploreSection from '@/components/home/LearnExploreSection';
import HomeReinoHero from '@/components/home/HomeReinoHero';
import SelfAssessmentSection from '@/components/home/SelfAssessmentSection';
import PromoSection from '@/components/home/PromoSection';
import ContentSkeletonLoader from '@/components/ContentSkeletonLoader';
import EcoAIModal from '@/components/EcoAIModal';
import HomePageTour from '@/components/HomePageTour';
import TrialOnboarding from '@/components/trial/TrialOnboarding';
import { useHomePageTour } from '@/hooks/useHomePageTour';
import { useProgramProgress, type ProgramProgressData } from '@/hooks/useProgramProgress';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { trackDiarioEnteredFromExplore } from '@/lib/mixpanelDiarioEvents';

export default function HomePage() {
  const { userName, isGuestMode, user } = useAuth();
  const { startProgram } = useProgram();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showEcoAIModal, setShowEcoAIModal] = useState(false);

  // Program progress
  const programProgressList = useProgramProgress();
  const programProgressMap = Object.fromEntries(
    programProgressList.map(p => [
      p.programId === 'riqueza'
        ? 'prog_riqueza'
        : p.programId === 'intro'
        ? 'prog_intro'
        : p.programId === 'drjoe'
        ? 'prog_drjoe'
        : 'prog_caleidoscopio',
      { progress: p.progress, isInactive: p.isInactive, isNearComplete: p.isNearComplete },
    ])
  );

  // Tour hook
  const { hasSeenTour } = useHomePageTour();
  const [isTourActive, setIsTourActive] = useState(false);

  // Show tour only for guest users who haven't seen it
  useEffect(() => {
    if (isGuestMode && !hasSeenTour) {
      setIsTourActive(true);
    }
  }, [isGuestMode, hasSeenTour]);

  // Set loading to false immediately (no artificial delay)
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Restore scroll position when returning from meditation player
  useEffect(() => {
    if (!isLoading && location.state?.returnFromMeditation) {
      const savedScrollPosition = sessionStorage.getItem('homePageScrollPosition');
      if (savedScrollPosition) {
        // Restore scroll immediately after content is loaded
        requestAnimationFrame(() => {
          window.scrollTo({
            top: parseInt(savedScrollPosition),
            behavior: 'auto'
          });
          sessionStorage.removeItem('homePageScrollPosition');
        });
      }
    }
  }, [isLoading, location]);

  // Capitalize first letter of each word
  const capitalizeNames = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Prévia dos humores só em dev: /app?humor=amanhecer|entardecer|noite
  const humorParam = import.meta.env.DEV ? new URLSearchParams(location.search).get('humor') : null;
  const previewMood =
    humorParam === 'amanhecer' || humorParam === 'entardecer' || humorParam === 'noite' ? humorParam : undefined;

  // Sem nome (convidado) fica vazio: a home nunca mostra "Convidado(a)".
  const displayName = capitalizeNames(userName || '');

  const handleLogout = async () => {
    navigate('/');
  };

  // Recomendações Diárias
  const dailyRecommendations = useMemo(
    () => [
      {
        id: 'rec_1',
        title: 'Rotina matinal',
        description: 'Comece bem o seu dia',
        duration: '8 min',
        image: 'url("/images/introducao-meditacao-hero.webp")',
        imagePosition: 'center center',
        isPremium: false,
        categoryType: 'programa' as const,
        progress: programProgressList.find(p => p.programId === 'intro')?.progress ?? 0,
      },
      {
        id: 'rec_2',
        title: 'Solte a ansiedade',
        description: 'Meditação do dia',
        duration: '7 min',
        image: 'url("/images/acolhendo-respiracao.webp")',
        imagePosition: 'center center',
        isPremium: false,
        categoryType: 'meditacao' as const,
      },
      {
        id: 'rec_3',
        title: 'Ritual Boa Noite',
        description: 'Desacelere o corpo antes de dormir',
        duration: '10 min',
        image: 'url("/images/sono-noite-01.webp")',
        imagePosition: 'center center',
        isPremium: false,
        categoryType: 'programa' as const,
      },
    ],
    [programProgressList],
  );

  // Meditações - Dr. Joe unificado + outras categorias
  const energyBlessings = useMemo(
    () => [
      // Dr. Joe Dispenza — card unificado (navega para página dedicada)
      {
        id: 'drjoe_collection',
        title: 'Desperte seu potencial interior',
        description: '5 meditações · aprox. 40 min',
        duration: '5 meditações',
        image: 'url("/images/reino/capa-desperte.webp")',
        imagePosition: '22% center', // mantém no quadro a pessoa com a lanterna
        isPremium: false,
        category: 'Dr. Joe Dispenza',
        progress: programProgressList.find(p => p.programId === 'drjoe')?.progress ?? 0,
        stackCount: 3,
      },
      // Caleidoscópio e Mind Movie — produto separado (premium)
      {
        id: 'blessing_4',
        title: 'Visualize quem você quer ser',
        description: '22 min de reprogramação visual profunda.',
        duration: '22 min',
        image: 'url("/images/caleidoscopio-mind-movie.webp")',
        imagePosition: 'center 15%',
        isPremium: true,
        category: 'Dr. Joe Dispenza',
        progress: programProgressList.find(p => p.programId === 'caleidoscopio')?.progress ?? 0,
      },
      // Sono
      {
        id: 'blessing_8',
        title: 'Adormeça sem carregar o dia',
        description: '9 min. O dia fica do lado de fora.',
        duration: '9 min',
        audioUrl: '/audio/meditacao-sono.mp4',
        image: 'url("/images/meditacoes-sono-hero.webp")',
        imagePosition: 'center 12%',
        isPremium: false,
        category: 'Sono',
      },
      // Sono — ansiedade + sono
      {
        id: 'blessing_12',
        title: 'Mente quieta. Noite tranquila.',
        description: '15 min para silenciar o barulho interno.',
        duration: '15 min',
        audioUrl: '/audio/meditacao-ansiedade-sono.mp3',
        image: 'url("/images/meditacao-ansiedade-sono.webp")',
        imagePosition: 'center 20%',
        isPremium: false,
        category: 'Sono',
      },
      // Código da Abundância — protocolo de 7 dias
      {
        id: 'abundancia_protocol',
        title: 'Código da Abundância',
        description: '7 dias · 12 min por dia',
        duration: '7 dias',
        image: 'url("/images/abundancia-card.webp")',
        imagePosition: 'center 30%',
        isPremium: false,
        category: 'Abundância',
      },
      // Respiração
      {
        id: 'blessing_10',
        title: 'Pause. Respire. Recomece.',
        description: '7 min para voltar para dentro de você.',
        duration: '7 min',
        audioUrl: '/audio/acolhendo-respiracao.mp3',
        image: 'url("/images/acolhendo-respiracao.webp")',
        imagePosition: 'center 25%',
        isPremium: false,
        category: 'Respiração',
      },
      // Estresse
      {
        id: 'blessing_11',
        title: 'Solte o que o dia deixou',
        description: '5 min. Mais leve agora.',
        duration: '5 min',
        audioUrl: '/audio/liberando-estresse.mp3',
        image: 'url("/images/liberando-estresse.webp")',
        imagePosition: 'center 25%',
        isPremium: false,
        category: 'Relaxamento',
      },
    ],
    [programProgressList],
  );

  // Conteúdos para "Aprenda e Explore"
  const contentItems = useMemo(
    () => [
      {
        id: 'content_wellbeing',
        title: 'O que é bem-estar mental de verdade?',
        description: 'Você dorme 8h e ainda acorda cansado? Isso pode explicar.',
        category: 'wellbeing',
        image: 'url("/images/wellbeing-mental.webp")', // 🚀 OPT#7: JPG→WebP (-22.72 KB)
        icon: '',
        isPremium: false,
      },
      {
        id: 'content_sleep_tips',
        title: 'O ritual de sono que mudou a vida de 1 em cada 3 usuários',
        description: '5 práticas simples. Comece hoje à noite.',
        category: 'wellbeing',
        image: 'url("/images/good-night-sleep.webp")', // 🚀 OPT#7: JPG→WebP (-20.48 KB)
        icon: '',
        isPremium: false,
      },
    ],
    [],
  );

  const categories = useMemo(
    () => [
      { id: 'all', label: 'Nossas Escolhas' },
      { id: 'wellbeing', label: 'Bem-estar Mental' },
    ],
    [],
  );

  const filteredContent = useMemo(() => {
    if (selectedCategory === 'all') {
      return contentItems;
    }
    return contentItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory, contentItems]);

  const handleStartChat = () => {
    setShowEcoAIModal(true);
  };

  const handleEnterChat = () => {
    setShowEcoAIModal(false);
    navigate('/app/chat');
  };

  const handleModalSentimentos = () => {
    setShowEcoAIModal(false);
    navigate('/app/chat', { state: { autoSendMessage: 'Vamos falar sobre meus sentimentos' } });
  };

  const handleModalSugerir = () => {
    setShowEcoAIModal(false);
    navigate('/app/chat', { state: { autoSendMessage: 'Sugerir conteúdo' } });
  };

  const handleModalSuggestion = (text: string) => {
    setShowEcoAIModal(false);
    navigate('/app/chat', { state: { autoSendMessage: text } });
  };

  const handleMemoriaEmocional = () => {
    setShowEcoAIModal(false);
    navigate('/app/memoria-emocional');
  };

  const handlePerfilEmocional = () => {
    setShowEcoAIModal(false);
    navigate('/app/perfil-emocional');
  };

  const handleRelatorio = () => {
    setShowEcoAIModal(false);
    navigate('/app/relatorio');
  };

  const handleContentClick = (contentId: string) => {
    if (contentId === 'content_wellbeing') {
      navigate('/app/articles/sleep');
    } else if (contentId === 'content_sleep_tips') {
      navigate('/app/articles/good-night-sleep');
    } else if (contentId === 'content_diario_estoico') {
      // Encontrar posição do card na lista filtrada
      const filteredItems = selectedCategory === 'all'
        ? contentItems
        : contentItems.filter((item) => item.category === selectedCategory);
      const position = filteredItems.findIndex((item) => item.id === contentId);

      trackDiarioEnteredFromExplore({
        explore_position: position >= 0 ? position : 0,
        is_guest: !user,
        user_id: user?.id,
      });

      sessionStorage.setItem('diario_entry_source', 'explore_section');
      navigate('/app/diario-estoico');
    } else {
      console.log('Clicou em:', contentId);
    }
  };

  const handleDailyRecommendationClick = (recId: string) => {
    // Salvar posição do scroll antes de navegar
    sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());

    if (recId === 'rec_1') {
      // Introdução à Meditação - navegar para sua própria página
      navigate('/app/introducao-meditacao');
    } else if (recId === 'rec_2') {
      // Acolhendo sua respiração - abrir no meditation player
      navigate('/app/meditation-player', {
        state: {
          meditation: {
            title: 'Acolhendo sua respiração',
            duration: '7 min',
            audioUrl: '/audio/acolhendo-respiracao.mp3',
            imageUrl: '/images/acolhendo-respiracao.webp',
            backgroundMusic: 'Cristais',
            gradient: 'linear-gradient(to bottom, #7BBFB5 0%, #5FA89E 20%, #459188 40%, #2E7A70 60%, #1A6358 80%, #084D42 100%)',
          },
        },
      });
    } else if (recId === 'rec_3') {
      // Meditações de Sono - navegar para página dedicada
      navigate('/app/meditacoes-sono');
    } else {
      console.log('Recomendação clicada:', recId);
    }
  };

  const handleContinueProgram = (programId: ProgramProgressData['programId']) => {
    sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());
    switch (programId) {
      case 'intro':
        navigate('/app/introducao-meditacao');
        break;
      case 'caleidoscopio':
        navigate('/app/programas/caleidoscopio-mind-movie');
        break;
      case 'riqueza':
        navigate('/app/riqueza-mental');
        break;
      case 'sono_protocol':
        navigate('/app/meditacoes-sono');
        break;
      case 'drjoe':
        navigate('/app/dr-joe-dispenza');
        break;
    }
  };

  const handleEnergyBlessingClick = (blessingId: string) => {
    // Salvar posição do scroll antes de navegar
    sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());

    // 5 Anéis da Disciplina - navega para sua própria página
    if (blessingId === 'blessing_1') {
      startProgram({
        id: 'blessing_1',
        title: '5 Anéis da Disciplina',
        description: 'Construa sua estrutura pessoal',
        currentLesson: 'Aula 1: Introdução aos 5 Anéis',
        progress: 0,
        duration: '12 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/rings');
      return;
    }

    // Quem Pensa Enriquece - navega para sua própria página (GRATUITO)
    if (blessingId === 'blessing_9') {
      startProgram({
        id: 'rec_2', // ✅ ID CORRETO para sync com backend
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        currentLesson: 'Passo 1: Onde você está',
        progress: 0,
        duration: '25 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/riqueza-mental');
      return;
    }

    // Código da Abundância — navega para página dedicada
    if (blessingId === 'abundancia_protocol') {
      navigate('/app/codigo-da-abundancia');
      return;
    }

    // Dr. Joe Dispenza — card unificado
    // Guests entram pelo funil; usuários autenticados vão direto
    if (blessingId === 'drjoe_collection') {
      if (!user) {
        navigate('/app/guest/intro-potencial');
      } else {
        navigate('/app/dr-joe-dispenza');
      }
      return;
    }

    // Caleidoscópio e Mind Movie — produto premium separado
    if (blessingId === 'blessing_4') {
      const { hasAccess } = checkAccess(true);
      if (!hasAccess) {
        requestUpgrade('home_caleidoscopio');
        return;
      }
      navigate('/app/programas/caleidoscopio-mind-movie');
      return;
    }

    // Encontrar a meditação clicada
    const blessing = energyBlessings.find(b => b.id === blessingId);

    if (blessing) {
      navigate('/app/meditation-player', {
        state: {
          meditation: {
            title: blessing.title,
            duration: blessing.duration,
            audioUrl: (blessing as { audioUrl?: string }).audioUrl || '/audio/bencao-centros-energia.mp3',
            imageUrl: blessing.image.replace('url("', '').replace('")', ''),
            backgroundMusic: 'Cristais',
            gradient: (blessing as { gradient?: string }).gradient,
          },
        },
      });
    }
  };

  return (
    <div className="min-h-screen font-primary" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
      {/* Header - Always render first */}
      <HomeHeader onLogout={handleLogout} />

      {/* Main Content - Show skeleton or real content */}
      {isLoading ? (
        <ContentSkeletonLoader />
      ) : (
        <main className="md:pt-0 page-with-nav" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Trial Onboarding - Show for trial users */}
        <div className="mx-auto max-w-6xl md:px-8">
          <TrialOnboarding />
        </div>

        {/* Topo do reino: paisagem, pergunta e sumário mudam com a hora */}
        <HomeReinoHero
          mood={previewMood}
          userName={userName}
          onStartChat={handleStartChat}
          onDailyRecommendation={handleDailyRecommendationClick}
          onBlessing={handleEnergyBlessingClick}
        />

        {/* Continue o seu programa — só aparece se houver programa em andamento */}
        {programProgressList.some((p) => p.status === 'in_progress') && (
          <section id="continue-program-section">
            <ContinueProgramSection
              programs={programProgressList}
              onContinue={handleContinueProgram}
            />
          </section>
        )}

        {/* Daily Recommendations Section */}
        <section id="daily-recommendations-section">
          <DailyRecommendationsSection
            recommendations={dailyRecommendations}
            onRecommendationClick={handleDailyRecommendationClick}
          />
        </section>

        {/* Energy Blessings Section */}
        <section id="energy-blessings-section">
          <EnergyBlessingsSection
            blessings={energyBlessings}
            onBlessingClick={handleEnergyBlessingClick}
          />
        </section>

        {/* Programas Section */}
        <section id="self-assessment-section">
          <SelfAssessmentSection
            programProgress={programProgressMap}
            onProgramClick={(id) => {
              sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());
              if (id === 'prog_rings') {
                startProgram({
                  id: 'blessing_1',
                  title: '5 Anéis da Disciplina',
                  description: 'Construa sua estrutura pessoal',
                  currentLesson: 'Aula 1: Introdução aos 5 Anéis',
                  progress: 0,
                  duration: '12 min',
                  startedAt: new Date().toISOString(),
                  lastAccessedAt: new Date().toISOString(),
                });
                navigate('/app/rings');
              } else if (id === 'prog_riqueza') {
                startProgram({
                  id: 'rec_2',
                  title: 'Quem Pensa Enriquece',
                  description: 'Transforme seu mindset financeiro',
                  currentLesson: 'Passo 1: Onde você está',
                  progress: 0,
                  duration: '25 min',
                  startedAt: new Date().toISOString(),
                  lastAccessedAt: new Date().toISOString(),
                });
                navigate('/app/riqueza-mental');
              } else if (id === 'prog_diario') {
                navigate('/app/diario-estoico');
              }
            }}
          />
        </section>

        {/* ECO AI Guidance Card Section */}
        <section id="eco-ai-guidance">
          <EcoAIGuidanceCard
            userName={displayName}
            totalSessions={programProgressList.reduce((acc, p) => acc + p.completedSessions, 0)}
            onStartChat={handleStartChat}
          />
        </section>

        {/* Eco Dream Guidance Card Section */}
        <section id="eco-dream-guidance">
          <EcoDreamGuidanceCard />
        </section>

        {/* Learn & Explore Section */}
        <section id="learn-explore-section">
          <LearnExploreSection
            categories={categories}
            contentItems={filteredContent}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onContentClick={handleContentClick}
          />
        </section>

        {/* Promo 50% OFF */}
        <section id="promo-section">
          <PromoSection onUpgradeClick={() => requestUpgrade('home_promo_50off')} />
        </section>


        {/* Footer spacing */}
        <div className="h-20" />
        </main>
      )}

      {/* ECO AI Modal */}
      <EcoAIModal
        isOpen={showEcoAIModal}
        onClose={() => setShowEcoAIModal(false)}
        onEnter={handleEnterChat}
        userName={capitalizeNames(userName || 'Usuário')}
        onStartSentimentos={handleModalSentimentos}
        onSugerirConteudo={handleModalSugerir}
        onSuggestionClick={handleModalSuggestion}
        onMemoriaEmocional={handleMemoriaEmocional}
        onPerfilEmocional={handlePerfilEmocional}
        onRelatorio={handleRelatorio}
      />

      {/* HomePage Tour - Only for guest users */}
      {isTourActive && isGuestMode && !hasSeenTour && (
        <HomePageTour
          onClose={() => setIsTourActive(false)}
          onComplete={() => {
            console.log('Tour completed!');
            setIsTourActive(false);
          }}
          onStartChat={handleStartChat}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="home"
      />
    </div>
  );
}
