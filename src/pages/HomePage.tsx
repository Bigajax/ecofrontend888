import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import LearnExploreSection from '@/components/home/LearnExploreSection';

export default function HomePage() {
  const { userName } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const displayName = userName || 'there';

  const handleLogout = async () => {
    navigate('/');
  };

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

  return (
    <div className="min-h-screen bg-[var(--eco-bg)] font-primary">
      {/* Header */}
      <HomeHeader onLogout={handleLogout} />

      {/* Main Content */}
      <main className="md:pt-0">
        {/* Hero Section - 2 Cards Layout */}
        <div className="px-4 py-8 md:px-6 md:py-12">
          {/* Desktop: Grid com proporções customizadas */}
          <div className="hidden gap-6 md:grid md:grid-cols-3">
            {/* Left Card - Greeting (2 colunas, mais alto) */}
            <div className="col-span-1 flex flex-col justify-center rounded-3xl border border-[var(--eco-line)] bg-gradient-to-br from-purple-100 via-pink-50 to-white p-10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
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

            {/* Right Card - Image + Quote (1 coluna, compacto) */}
            <div className="col-span-2 grid grid-rows-2 gap-4">
              {/* Top Image Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1545235617-7465005b5955?w=800&h=300&fit=crop")',
                  }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

                {/* Content - Top Right */}
                <div className="relative flex h-full flex-col justify-between p-6">
                  <div className="flex justify-end">
                    <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[var(--eco-text)] backdrop-blur-sm">
                      17 de nov
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-normal text-white drop-shadow-lg">
                      Não julgue
                    </h3>
                  </div>
                </div>
              </div>

              {/* Bottom Image Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=300&fit=crop")',
                  }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

                {/* Content - Bottom Right */}
                <div className="relative flex h-full flex-col justify-end p-6">
                  <p className="text-[12px] leading-relaxed text-white/90 drop-shadow-md">
                    "Quando a filosofia é exercida com arrogância, ela é a causa para a ruína."
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-white/80 drop-shadow-md">
                    — Sêneca
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Stacked cards */}
          <div className="block space-y-6 md:hidden">
            {/* Left Card - Greeting */}
            <div className="rounded-2xl border border-[var(--eco-line)] bg-gradient-to-br from-purple-100 via-pink-50 to-white p-6 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
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

            {/* Right Card - Image + Quote */}
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--eco-line)] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop")',
                }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

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
