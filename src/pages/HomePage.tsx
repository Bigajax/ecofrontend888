import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';
import HomeHeader from '@/components/home/HomeHeader';
import DailyRecommendationsSection from '@/components/home/DailyRecommendationsSection';
import EcoAIGuidanceCard from '@/components/home/EcoAIGuidanceCard';
import ContinueProgram from '@/components/home/ContinueProgram';
import LearnExploreSection from '@/components/home/LearnExploreSection';
import HeroCarousel from '@/components/home/HeroCarousel';
import AnimatedSection from '@/components/AnimatedSection';

export default function HomePage() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { ongoingProgram, startProgram, completeProgram } = useProgram();

  const displayName = userName || 'there';

  // Remove completed program from home page
  useEffect(() => {
    if (ongoingProgram && ongoingProgram.progress === 100) {
      // Program is complete, mark it as finished and remove from display
      completeProgram();
    }
  }, [ongoingProgram?.progress, completeProgram]);

  const handleLogout = async () => {
    navigate('/');
  };

  // Recomendações Diárias
  const dailyRecommendations = useMemo(
    () => [
      {
        id: 'rec_1',
        title: '5 Anéis da Disciplina',
        description: 'Construa sua estrutura pessoal',
        duration: '12 min',
        image: 'url("/images/five-rings-visual.png")',
        isPremium: false,
      },
      {
        id: 'rec_2',
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        duration: '15 min',
        image: 'url("/images/quem-pensa-enriquece.png")',
        isPremium: false,
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
    navigate('/app/chat');
  };

  const handleContentClick = (contentId: string) => {
    if (contentId === 'content_wellbeing') {
      navigate('/app/articles/sleep');
    } else if (contentId === 'content_sleep_tips') {
      navigate('/app/articles/good-night-sleep');
    } else {
      console.log('Clicou em:', contentId);
    }
  };

  const handleDailyRecommendationClick = (recId: string) => {
    if (recId === 'rec_1') {
      // Salvar programa dos 5 Anéis
      startProgram({
        id: 'rec_1',
        title: '5 Anéis da Disciplina',
        description: 'Construa sua estrutura pessoal',
        currentLesson: 'Aula 1: Introdução aos 5 Anéis',
        progress: 0,
        duration: '12 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      navigate('/app/rings');
    } else if (recId === 'rec_2') {
      // Salvar programa Quem Pensa Enriquece
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
    } else {
      console.log('Recomendação clicada:', recId);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      {/* Header */}
      <HomeHeader onLogout={handleLogout} />

      {/* Main Content */}
      <main className="md:pt-0">
        {/* Hero Section - 2 Cards Layout */}
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
          {/* Desktop: Grid 2 colunas com mesma altura */}
          <div className="hidden gap-6 md:grid md:grid-cols-2 md:h-96">
            {/* Left Card - Greeting */}
            <div className="flex flex-col justify-center rounded-3xl border border-[var(--eco-line)] bg-gradient-to-br from-amber-50 via-stone-50 to-white p-8 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              <h1 className="font-display text-4xl font-normal text-[var(--eco-text)]">
                Bom dia,
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

          {/* Mobile: Stacked cards */}
          <div className="block space-y-6 md:hidden">
            {/* Left Card - Greeting */}
            <div className="rounded-2xl border border-[var(--eco-line)] bg-gradient-to-br from-amber-50 via-stone-50 to-white p-6 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              <h1 className="font-display text-3xl font-normal text-[var(--eco-text)]">
                Bom dia,
                <br />
                {displayName}
              </h1>
              <button
                onClick={handleStartChat}
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--eco-user)] transition-all duration-300 hover:gap-3"
              >
                Comece uma conversa <span>→</span>
              </button>
            </div>

            {/* Right Card - Hero Carousel (Mobile) */}
            <HeroCarousel />
          </div>
        </div>

        {/* Recently Played Section - Appears only when user has ongoing program */}
        {ongoingProgram && (
          <AnimatedSection animation="slide-up-fade">
            <ContinueProgram
              program={ongoingProgram}
              onContinue={() => {
                // Navegar para a página correta baseado no ID do programa
                if (ongoingProgram.id === 'rec_1') {
                  navigate('/app/rings');
                } else if (ongoingProgram.id === 'rec_2') {
                  navigate('/app/riqueza-mental');
                } else {
                  navigate(`/app/program/${ongoingProgram.id}`);
                }
              }}
            />
          </AnimatedSection>
        )}

        {/* Daily Recommendations Section */}
        <AnimatedSection animation="slide-up-fade">
          <DailyRecommendationsSection
            recommendations={dailyRecommendations}
            onRecommendationClick={handleDailyRecommendationClick}
          />
        </AnimatedSection>

        {/* ECO AI Guidance Card Section */}
        <AnimatedSection animation="slide-up-fade">
          <EcoAIGuidanceCard
            userName={displayName}
            onStartChat={handleStartChat}
          />
        </AnimatedSection>

        {/* Learn & Explore Section */}
        <AnimatedSection animation="slide-up-fade">
          <LearnExploreSection
            categories={categories}
            contentItems={filteredContent}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onContentClick={handleContentClick}
          />
        </AnimatedSection>

        {/* Footer spacing */}
        <div className="h-20" />
      </main>
    </div>
  );
}
