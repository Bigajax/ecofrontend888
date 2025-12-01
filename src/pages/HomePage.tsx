import { useState, useMemo, useEffect } from 'react';
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
import DrJoeMeditationCard from '@/components/home/DrJoeMeditationCard';
import AnimatedSection from '@/components/AnimatedSection';
import ContentSkeletonLoader from '@/components/ContentSkeletonLoader';
import EcoAIModal from '@/components/EcoAIModal';
import HomePageTour from '@/components/HomePageTour';
import { useHomePageTour } from '@/hooks/useHomePageTour';

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
  const { userName } = useAuth();
  const { startProgram } = useProgram();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDiarioModal, setShowDiarioModal] = useState(false);
  const [diarioSelectedIndex, setDiarioSelectedIndex] = useState(0);
  const [diarioExpanded, setDiarioExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEcoAIModal, setShowEcoAIModal] = useState(false);

  // Tour hook
  const { hasSeenTour, startTour } = useHomePageTour();

  // Simulate initial loading (skip if returning from meditation)
  useEffect(() => {
    if (location.state?.returnFromMeditation) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Start tour automatically for new users after loading
  useEffect(() => {
    if (!isLoading && !hasSeenTour) {
      const tourTimer = setTimeout(() => {
        startTour();
      }, 800);
      return () => clearTimeout(tourTimer);
    }
  }, [isLoading, hasSeenTour, startTour]);

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
        title: 'Meditação do Sono',
        description: 'Relaxe profundamente e durma melhor',
        duration: '9 min',
        audioUrl: '/audio/meditacao-sono.mp4',
        image: 'url("/images/meditacao-sono.webp")',
        imagePosition: 'center 32%',
        gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #3E4277 20%, #333665 40%, #282B52 60%, #1E2140 80%, #14172E 100%)',
        isPremium: false,
      },
      {
        id: 'rec_2',
        title: '5 Anéis da Disciplina',
        description: 'Construa sua estrutura pessoal',
        duration: '12 min',
        image: 'url("/images/five-rings-visual.webp")',
        isPremium: false,
      },
      {
        id: 'rec_3',
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        duration: '15 min',
        image: 'url("/images/quem-pensa-enriquece.webp")',
        isPremium: true,
      },
    ],
    [],
  );

  // Meditações - Outras meditações (as do Dr. Joe estão na página dedicada)
  const energyBlessings = useMemo(
    () => [
      {
        id: 'blessing_4',
        title: 'Meditação do caleidoscópio e Mind Movie',
        description: 'Visualize e crie sua nova realidade',
        duration: '22 min',
        image: 'url("/images/meditacao-caleidoscopio.webp")',
        imagePosition: 'center 32%',
        gradient: 'linear-gradient(to bottom, #B494D4 0%, #A07DC4 20%, #8D67B5 40%, #7A52A6 60%, #673E97 80%, #542B88 100%)',
        isPremium: true,
        category: 'Dr. Joe Dispenza',
      },
      {
        id: 'blessing_7',
        title: 'Introdução à Meditação',
        description: 'Seus primeiros passos na prática meditativa',
        duration: '8 min',
        audioUrl: '/audio/introducao-meditacao.mp3',
        image: 'url("/images/meditacao-introducao.webp")',
        imagePosition: 'center 32%',
        gradient: 'linear-gradient(to bottom, #6EC1E4 0%, #5AB3D9 20%, #4AA5CE 40%, #3B96C3 60%, #2D88B8 80%, #1F7BAD 100%)',
        isPremium: true,
        category: 'Introdução',
      },
      {
        id: 'blessing_8',
        title: 'Meditação do Sono',
        description: 'Relaxe profundamente e tenha uma noite tranquila',
        duration: '9 min',
        audioUrl: '/audio/meditacao-sono.mp4',
        image: 'url("/images/meditacao-sono.webp")',
        imagePosition: 'center 32%',
        gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #3E4277 20%, #333665 40%, #282B52 60%, #1E2140 80%, #14172E 100%)',
        isPremium: false,
        category: 'Sono',
      },
    ],
    [],
  );

  // Conteúdos para "Aprenda e Explore"
  const contentItems = useMemo(
    () => [
      {
        id: 'content_wellbeing',
        title: 'Sobre Bem-estar Mental',
        description: 'Por que o sono é tão importante',
        category: 'wellbeing',
        image: 'url("/images/wellbeing-mental.jpg")',
        icon: '',
        isPremium: false,
      },
      {
        id: 'content_sleep_tips',
        title: 'Como ter uma boa noite de sono',
        description: 'Se estiver tendo problemas para dormir, estas dicas podem ajudar.',
        category: 'wellbeing',
        image: 'url("/images/good-night-sleep.jpg")',
        icon: '',
        isPremium: false,
      },
      {
        id: 'content_diario_estoico',
        title: 'Diário Estoico',
        description: 'Cultive a sabedoria diária através de reflexões estoicas. Uma prática que transforma seu mindset e fortalece sua resiliência emocional.',
        category: 'stoicism',
        image: 'url("/images/diario-estoico.webp")',
        icon: '',
        isPremium: false,
        date: '19 novembro',
        maxim: 'MÁXIMAS DE TRÊS HOMENS SÁBIOS',
        fullText: 'Para qualquer desafio, deveríamos ter três pensamentos ao nosso dispor: "Conduzam Deus e Destino, Para aquela Meta fixada para mim há muito. Seguirei e não tropeçarei; mesmo que minha vontade seja fraca, eu me manterei firme."',
        author: 'CLEANTES',
      },
    ],
    [],
  );

  const categories = useMemo(
    () => [
      { id: 'all', label: 'Nossas Escolhas' },
      { id: 'wellbeing', label: 'Bem-estar Mental' },
      { id: 'stoicism', label: 'Estoicismo' },
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
      navigate('/app/diario-estoico');
    } else {
      console.log('Clicou em:', contentId);
    }
  };

  const handleDailyRecommendationClick = (recId: string) => {
    if (recId === 'rec_1') {
      // Meditação do Sono - navegar para o player
      const sonoMeditation = dailyRecommendations.find(r => r.id === 'rec_1');
      if (sonoMeditation) {
        navigate('/app/meditation-player', {
          state: {
            meditation: {
              title: sonoMeditation.title,
              duration: sonoMeditation.duration,
              audioUrl: sonoMeditation.audioUrl,
              imageUrl: sonoMeditation.image.replace('url("', '').replace('")', ''),
              backgroundMusic: 'Sono',
              gradient: sonoMeditation.gradient,
            },
            returnTo: '/app',
          },
        });
      }
    } else if (recId === 'rec_2') {
      // Salvar programa dos 5 Anéis
      startProgram({
        id: 'rec_2',
        title: '5 Anéis da Disciplina',
        description: 'Construa sua estrutura pessoal',
        currentLesson: 'Aula 1: Introdução aos 5 Anéis',
        progress: 0,
        duration: '12 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/rings');
    } else if (recId === 'rec_3') {
      // Salvar programa Quem Pensa Enriquece
      startProgram({
        id: 'rec_3',
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        currentLesson: 'Passo 1: Onde você está',
        progress: 0,
        duration: '25 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/riqueza-mental');
    } else {
      console.log('Recomendação clicada:', recId);
    }
  };

  const handleEnergyBlessingClick = (blessingId: string) => {
    // Salvar posição do scroll antes de navegar
    sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());

    // Encontrar a meditação clicada
    const blessing = energyBlessings.find(b => b.id === blessingId);

    if (blessing) {
      // Navegar para o player passando os dados da meditação
      navigate('/app/meditation-player', {
        state: {
          meditation: {
            title: blessing.title,
            duration: blessing.duration,
            audioUrl: blessing.audioUrl || '/audio/energy-blessings-meditation.mp3',
            imageUrl: blessing.image.replace('url("', '').replace('")', ''),
            backgroundMusic: 'Cristais',
            gradient: blessing.gradient
          }
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-white font-primary">
      {/* Header - Always render first */}
      <HomeHeader onLogout={handleLogout} />

      {/* Main Content - Show skeleton or real content */}
      {isLoading ? (
        <ContentSkeletonLoader />
      ) : (
        <main className="md:pt-0">
        {/* Hero Section */}
        <div className="mx-auto max-w-6xl md:px-8 md:py-12">
          {/* Desktop: Grid 2 colunas com mesma altura */}
          <div className="hidden gap-6 md:grid md:grid-cols-2 md:h-96">
            {/* Left Card - Greeting */}
            <div className="flex flex-col justify-center rounded-3xl border border-[var(--eco-line)] bg-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              <h1 className="font-display text-6xl font-bold text-[var(--eco-text)]">
                {greeting},
                <br />
                {displayName}
              </h1>
              <p className="mt-4 text-[14px] text-[var(--eco-muted)]">
                Fique em registro rápido do seu humor
              </p>
              <button
                onClick={handleStartChat}
                className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--eco-user)] transition-all duration-300 hover:gap-3"
              >
                Comece uma conversa <span>→</span>
              </button>
            </div>

            {/* Right Card - Hero Carousel */}
            <HeroCarousel />
          </div>

          {/* Mobile: Diário Estoico Card */}
          <div className="block md:hidden">
            <HeroCarousel
              variant="mobile"
              userName={displayName}
              onStartChat={handleStartChat}
            />
          </div>
        </div>

        {/* Daily Recommendations Section */}
        <AnimatedSection animation="slide-up-fade" id="daily-recommendations-section">
          <DailyRecommendationsSection
            recommendations={dailyRecommendations}
            onRecommendationClick={handleDailyRecommendationClick}
          />
        </AnimatedSection>

        {/* Dr. Joe Dispenza Meditation Card */}
        <AnimatedSection animation="slide-up-fade" id="drjoe-meditation-section">
          <DrJoeMeditationCard
            onClick={() => {
              // Navegar para a página dedicada do Dr. Joe Dispenza
              navigate('/app/dr-joe-dispenza');
              // Scroll para o topo após navegação
              window.scrollTo(0, 0);
            }}
          />
        </AnimatedSection>

        {/* Energy Blessings Section */}
        <AnimatedSection animation="slide-up-fade" id="energy-blessings-section">
          <EnergyBlessingsSection
            blessings={energyBlessings}
            onBlessingClick={handleEnergyBlessingClick}
          />
        </AnimatedSection>

        {/* ECO AI Guidance Card Section */}
        <AnimatedSection animation="slide-up-fade" id="eco-ai-guidance">
          <EcoAIGuidanceCard
            userName={displayName}
            greeting={greeting}
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
        userName={capitalizeNames(userName || 'Usuário')}
        onStartSentimentos={handleModalSentimentos}
        onSugerirConteudo={handleModalSugerir}
        onSuggestionClick={handleModalSuggestion}
        onMemoriaEmocional={handleMemoriaEmocional}
        onPerfilEmocional={handlePerfilEmocional}
        onRelatorio={handleRelatorio}
      />

      {/* HomePage Tour */}
      <HomePageTour
        onComplete={() => console.log('Tour completed!')}
        onStartChat={handleStartChat}
      />
    </div>
  );
}
