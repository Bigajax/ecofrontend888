import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import DailyRecommendationsSection from '@/components/home/DailyRecommendationsSection';
import EnergyBlessingsSection from '@/components/home/EnergyBlessingsSection';
import EcoAIGuidanceCard from '@/components/home/EcoAIGuidanceCard';
import LearnExploreSection from '@/components/home/LearnExploreSection';
import HeroCarousel from '@/components/home/HeroCarousel';
import LiveReflectionSection from '@/components/home/LiveReflectionSection';
import SelfAssessmentSection from '@/components/home/SelfAssessmentSection';
import PromoSection from '@/components/home/PromoSection';
import PromoStickyBanner from '@/components/home/PromoStickyBanner';
import EcoAIRecommendationCard from '@/components/home/EcoAIRecommendationCard';
import AnimatedSection from '@/components/AnimatedSection';
import ContentSkeletonLoader from '@/components/ContentSkeletonLoader';
import EcoAIModal from '@/components/EcoAIModal';
import HomePageTour from '@/components/HomePageTour';
import TrialOnboarding from '@/components/trial/TrialOnboarding';
import { useHomePageTour } from '@/hooks/useHomePageTour';
import { useProgramProgress } from '@/hooks/useProgramProgress';
import { usePremiumContent } from '@/hooks/usePremiumContent';
import UpgradeModal from '@/components/subscription/UpgradeModal';
import { trackDiarioEnteredFromExplore } from '@/lib/mixpanelDiarioEvents';

interface DailyMaxim {
  date: string;
  dayNumber: number;
  title: string;
  text: string;
  author: string;
  background?: string;
}

const ALL_DAILY_MAXIMS: DailyMaxim[] = [
  {
    date: 'Novembro 19',
    dayNumber: 19,
    title: 'MÁXIMAS DE TRÊS HOMENS SÁBIOS',
    text: 'Para qualquer desafio, deveríamos ter três pensamentos ao nosso dispor: "Conduzam Deus e Destino, Para aquela Meta fixada para mim há muito. Seguirei e não tropeçarei; mesmo que minha vontade seja fraca, eu me manterei firme."',
    author: 'CLEANTES',
    background: 'url("/images/meditacao-19-nov.webp")',
  },
  {
    date: 'Novembro 20',
    dayNumber: 20,
    title: 'A VIRTUDE É O ÚNICO BEM',
    text: 'A virtude é a única coisa que permanece com você em todas as circunstâncias da vida.',
    author: 'EPICTETO',
    background: 'url("https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=1000&h=600&fit=crop")',
  },
  {
    date: 'Novembro 21',
    dayNumber: 21,
    title: 'SOBRE A MORTE',
    text: 'A morte não é um mal, pois os males são coisas que prejudicam.',
    author: 'MARCOS AURÉLIO',
    background: 'url("https://images.unsplash.com/photo-1470252649378-9c29740ff023?w=1000&h=600&fit=crop")',
  },
];

const getAvailableMaxims = (): DailyMaxim[] => {
  const today = new Date().getDate();
  return ALL_DAILY_MAXIMS.filter(maxim => maxim.dayNumber <= today);
};

export default function HomePage() {
  const { userName, isGuestMode, user } = useAuth();
  const { startProgram } = useProgram();
  const { checkAccess, requestUpgrade, showUpgradeModal, setShowUpgradeModal } = usePremiumContent();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDiarioModal, setShowDiarioModal] = useState(false);
  const [diarioSelectedIndex, setDiarioSelectedIndex] = useState(0);
  const [diarioExpanded, setDiarioExpanded] = useState(false);
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

  // Redireciona authenticated users de / para /app imediatamente
  useEffect(() => {
    if (user && !isGuestMode) {
      navigate('/app', { replace: true });
    }
  }, [user, isGuestMode, navigate]);

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

  // Obter saudação baseada no horário de Brasília
  const getGreeting = () => {
    const now = new Date();
    // Converter para horário de Brasília (UTC-3)
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hour = brasiliaTime.getHours();

    if (hour >= 5 && hour < 12) {
      return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      return 'Boa tarde';
    } else {
      return 'Boa noite';
    }
  };

  const greeting = getGreeting();
  const displayName = capitalizeNames(userName || 'Convidado(a)');

  const handleLogout = async () => {
    navigate('/');
  };

  // Recomendações Diárias
  const dailyRecommendations = useMemo(
    () => [
      {
        id: 'rec_1',
        title: 'Plante o hábito que muda tudo',
        description: 'Crie sua rotina matinal em 8 minutos',
        duration: '8 min',
        image: 'url("/images/introducao-meditacao-hero.webp")',
        imagePosition: 'center center',
        isPremium: false,
        categoryType: 'programa' as const,
        progress: programProgressList.find(p => p.programId === 'intro')?.progress ?? 0,
      },
      {
        id: 'rec_2',
        title: 'Solte o peso antes do dia começar',
        description: '7 min · Deixe a ansiedade ir embora',
        duration: '7 min',
        image: 'url("/images/acolhendo-respiracao.webp")',
        imagePosition: 'center center',
        isPremium: false,
        categoryType: 'meditacao' as const,
      },
      {
        id: 'rec_3',
        title: 'Seu corpo pediu isso',
        description: '15 min · Relaxamento corporal profundo',
        duration: '15 min',
        image: 'url("/images/meditacao-sono-new.webp")',
        imagePosition: 'center 32%',
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
        image: 'url("/images/capa-dr-joe-dispenza.png")',
        imagePosition: 'center 20%',
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
        image: 'url("/images/meditacao-sono-new.webp")',
        imagePosition: 'center 25%',
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
        image: 'url("/images/liberando-estresse.png")',
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
    <div className="min-h-screen font-primary pb-16 md:pb-0" style={{ background: 'linear-gradient(175deg, #C8E8FF 0%, #D8EFFF 6%, #E6F4FF 14%, #EEF8FF 26%, #F5FAFF 44%, #FAFCFF 62%, #FFFFFF 80%)' }}>
      {/* Header - Always render first */}
      <HomeHeader onLogout={handleLogout} />

      {/* Main Content - Show skeleton or real content */}
      {isLoading ? (
        <ContentSkeletonLoader />
      ) : (
        <main className="md:pt-0">
        {/* Trial Onboarding - Show for trial users */}
        <div className="mx-auto max-w-6xl md:px-8 pt-4 md:pt-0">
          <TrialOnboarding />
        </div>

        {/* Hero Section */}
        <div className="mx-auto max-w-6xl md:px-8 md:py-8">
          {/* Desktop: Grid 2 colunas com mesma altura */}
          <div className="hidden gap-6 md:grid md:grid-cols-2">
            {/* Left Card - Greeting */}
            <motion.div
              className="flex flex-col justify-center rounded-3xl p-9 md:h-[320px] relative overflow-hidden"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.15 }}
              style={{
                background: 'linear-gradient(150deg, #FFFFFF 0%, #EAF6FF 60%, #D8EFFF 100%)',
                border: '1px solid rgba(110,200,255,0.26)',
                boxShadow: '0 8px 48px rgba(110,200,255,0.18), 0 2px 8px rgba(110,200,255,0.10)',
              }}
            >
              {/* Large decorative orb top-right */}
              <div style={{
                position: 'absolute', top: -70, right: -70,
                width: 240, height: 240, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(110,200,255,0.22) 0%, transparent 65%)',
                pointerEvents: 'none',
              }} />
              {/* Small orb bottom-left */}
              <div style={{
                position: 'absolute', bottom: -40, left: -20,
                width: 140, height: 140, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(75,174,232,0.14) 0%, transparent 65%)',
                pointerEvents: 'none',
              }} />
              {/* Subtle greeting label */}
              <p className="text-[11px] font-bold text-[#4BAEE8]/70 relative tracking-[0.18em] uppercase mb-1">
                {greeting}
              </p>
              <h1 className="font-display text-[38px] font-bold leading-tight relative" style={{ color: '#0D3461' }}>
                {displayName}
              </h1>
              <div className="mt-4 h-[1px] w-12 relative" style={{ background: 'linear-gradient(90deg, #6EC8FF, transparent)' }} />
              <p className="mt-4 text-[17px] font-semibold relative leading-snug" style={{ color: '#1A3A5C' }}>
                O que está pesando no seu coração hoje?
              </p>
              <p className="mt-2 text-[14px] relative" style={{ color: '#5A8AAD' }}>
                A Eco está aqui para ouvir, sem julgar.
              </p>
              <button
                onClick={handleStartChat}
                className="mt-7 inline-flex items-center gap-2.5 justify-center self-start rounded-full px-7 py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 relative min-h-[48px]"
                style={{
                  background: 'linear-gradient(135deg, #5BC4F0 0%, #3A9ED4 100%)',
                  boxShadow: '0 6px 24px rgba(58,158,212,0.40), 0 2px 8px rgba(58,158,212,0.20)',
                }}
              >
                Conversar com a Eco
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>

            {/* Right Card - Hero Carousel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.28 }}
            >
              <HeroCarousel />
            </motion.div>
          </div>

          {/* Mobile: Diário Estoico Card */}
          <motion.div
            className="block md:hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 20, delay: 0.1 }}
          >
            <HeroCarousel
              variant="mobile"
              userName={displayName}
              onStartChat={handleStartChat}
            />
          </motion.div>
        </div>

        {/* ECO AI Recommendation Card */}
        <AnimatedSection animation="slide-up-fade">
          <EcoAIRecommendationCard onStartChat={handleStartChat} />
        </AnimatedSection>

        {/* Daily Recommendations Section */}
        <AnimatedSection animation="slide-up-fade" id="daily-recommendations-section">
          <DailyRecommendationsSection
            recommendations={dailyRecommendations}
            onRecommendationClick={handleDailyRecommendationClick}
          />
        </AnimatedSection>

        {/* Energy Blessings Section */}
        <AnimatedSection animation="slide-up-fade" id="energy-blessings-section">
          <EnergyBlessingsSection
            blessings={energyBlessings}
            onBlessingClick={handleEnergyBlessingClick}
          />
        </AnimatedSection>

        {/* Programas Section */}
        <AnimatedSection animation="slide-up-fade" id="self-assessment-section">
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
        </AnimatedSection>

        {/* ECO AI Guidance Card Section */}
        <AnimatedSection animation="slide-up-fade" id="eco-ai-guidance">
          <EcoAIGuidanceCard
            userName={displayName}
            totalSessions={programProgressList.reduce((acc, p) => acc + p.completedSessions, 0)}
            onStartChat={handleStartChat}
          />
        </AnimatedSection>

        {/* Learn & Explore Section */}
        <AnimatedSection animation="slide-up-fade" id="learn-explore-section">
          <LearnExploreSection
            categories={categories}
            contentItems={filteredContent}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onContentClick={handleContentClick}
          />
        </AnimatedSection>

        {/* Promo 50% OFF */}
        <AnimatedSection animation="slide-up-fade" id="promo-section">
          <PromoSection onUpgradeClick={() => requestUpgrade('home_promo_50off')} />
        </AnimatedSection>

        {/* Live Reflection Section */}
        <AnimatedSection animation="slide-up-fade" id="live-reflection-section">
          <LiveReflectionSection />
        </AnimatedSection>

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

      {/* Sticky promo banner — mobile only */}
      <PromoStickyBanner onUpgradeClick={() => requestUpgrade('home_sticky_banner_50off')} />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        source="home"
      />
    </div>
  );
}
