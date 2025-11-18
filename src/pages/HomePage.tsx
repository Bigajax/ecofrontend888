import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProgram } from '@/contexts/ProgramContext';
import HomeHeader from '@/components/home/HomeHeader';
import DailyRecommendationsSection from '@/components/home/DailyRecommendationsSection';
import ActionButtons from '@/components/home/ActionButtons';
import ContinueProgram from '@/components/home/ContinueProgram';
import EcoAIGuidanceCard from '@/components/home/EcoAIGuidanceCard';
import LearnExploreSection from '@/components/home/LearnExploreSection';

export default function HomePage() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { ongoingProgram, startProgram } = useProgram();

  const displayName = userName || 'there';

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
        image: 'url("/images/rings/five-rings-visual.png")',
        isPremium: false,
      },
      {
        id: 'rec_2',
        title: 'Quem Pensa Enriquece',
        description: 'Transforme seu mindset financeiro',
        duration: '15 min',
        image: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1000&h=600&fit=crop")',
        isPremium: false,
      },
      {
        id: 'rec_3',
        title: 'Orientação ECO AI',
        description: 'Conversa personalizada do dia',
        duration: '8 min',
        image: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1720249139972-368744d9d44c?w=1000&h=600&fit=crop")',
        isPremium: false,
      },
    ],
    [],
  );

  // Conteúdos para "Aprenda e Explore"
  const contentItems = useMemo(
    () => [
      {
        id: 'content_1',
        title: 'Conversas Diárias',
        description: 'Diálogos significativos',
        category: 'conversations',
        image: 'bg-gradient-to-br from-pink-200 to-rose-200',
        icon: '💬',
        isPremium: false,
      },
      {
        id: 'content_2',
        title: 'Programas',
        description: 'Jornadas estruturadas',
        category: 'programs',
        image: 'bg-gradient-to-br from-indigo-200 to-purple-200',
        icon: '📚',
        isPremium: true,
      },
      {
        id: 'content_3',
        title: 'Sono Restaurador',
        description: 'Durma melhor',
        category: 'sleep',
        image: 'bg-gradient-to-br from-slate-300 to-gray-300',
        icon: '😴',
        isPremium: false,
      },
      {
        id: 'content_4',
        title: 'Sons Ambientes',
        description: 'Ambientes sonoros',
        category: 'sounds',
        image: 'bg-gradient-to-br from-orange-200 to-amber-200',
        icon: '🎵',
        isPremium: false,
      },
    ],
    [],
  );

  const categories = useMemo(
    () => [
      { id: 'all', label: 'Nossas Escolhas' },
      { id: 'conversations', label: 'Conversas Diárias' },
      { id: 'programs', label: 'Programas' },
      { id: 'sleep', label: 'Sono' },
      { id: 'sounds', label: 'Sons' },
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
    console.log('Clicou em:', contentId);
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
        currentLesson: 'Aula 1: Os Princípios Fundamentais',
        progress: 0,
        duration: '15 min',
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
      });
      console.log('Recomendação clicada:', recId);
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

            {/* Right Card - Ocean Image */}
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1000&h=600&fit=crop")',
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

              {/* Content */}
              <div className="relative flex h-full flex-col justify-between p-8">
                {/* Top: Date badge */}
                <div className="flex justify-end">
                  <div className="rounded-full bg-white/80 px-4 py-2 text-[12px] font-medium text-[var(--eco-text)] backdrop-blur-sm">
                    17 de novembro
                  </div>
                </div>

                {/* Bottom: Quote */}
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-normal text-white drop-shadow-lg">
                    Não julgue, para que não seja julgado
                  </h3>
                  <p className="text-[14px] leading-relaxed text-white/90 drop-shadow-md">
                    "Quando a filosofia é exercida com arrogância e de maneira inflexível,
                    ela é a causa para a ruína de muitos. Deixa a filosofia remover teus
                    defeitos, em vez de uma maneira de protestar contra os defeitos dos
                    outros!"
                  </p>
                  <p className="text-[13px] font-medium text-white/80 drop-shadow-md">
                    — Sêneca, Cartas Morais, 103.4B-5A
                  </p>
                </div>
              </div>
            </div>
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

            {/* Right Card - Ocean Image (Mobile) */}
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1000&h=600&fit=crop")',
                }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

              {/* Content */}
              <div className="relative flex min-h-80 flex-col justify-between p-6">
                {/* Top: Date badge */}
                <div className="flex justify-end">
                  <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[var(--eco-text)] backdrop-blur-sm">
                    17 de nov
                  </div>
                </div>

                {/* Bottom: Quote */}
                <div className="space-y-3">
                  <h3 className="font-display text-lg font-normal text-white drop-shadow-lg">
                    Não julgue
                  </h3>
                  <p className="text-[13px] leading-relaxed text-white/90 drop-shadow-md">
                    "Quando a filosofia é exercida com arrogância, ela é a causa para a
                    ruína. Deixa a filosofia remover teus defeitos."
                  </p>
                  <p className="text-[12px] font-medium text-white/80 drop-shadow-md">
                    — Sêneca
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Recommendations Section */}
        <DailyRecommendationsSection
          recommendations={dailyRecommendations}
          onRecommendationClick={handleDailyRecommendationClick}
        />

        {/* Action Buttons */}
        <ActionButtons
          onContinue={() => {
            if (ongoingProgram) {
              // Navegar para a página correta baseado no ID do programa
              if (ongoingProgram.id === 'rec_1') {
                navigate('/app/rings');
              } else {
                navigate(`/app/program/${ongoingProgram.id}`);
              }
            }
          }}
          onStart={() => navigate('/app/programs')}
          onExplore={() => setSelectedCategory('programs')}
        />

        {/* Continue Program Section - Appears only when user has ongoing program */}
        {ongoingProgram && (
          <ContinueProgram
            program={ongoingProgram}
            onContinue={() => {
              // Navegar para a página correta baseado no ID do programa
              if (ongoingProgram.id === 'rec_1') {
                navigate('/app/rings');
              } else {
                navigate(`/app/program/${ongoingProgram.id}`);
              }
            }}
          />
        )}

        {/* ECO AI Guidance Card Section */}
        <EcoAIGuidanceCard
          userName={displayName}
          onStartChat={handleStartChat}
        />

        {/* Learn & Explore Section */}
        <LearnExploreSection
          categories={categories}
          contentItems={filteredContent}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onContentClick={handleContentClick}
        />

        {/* Footer spacing */}
        <div className="h-20" />
      </main>
    </div>
  );
}
