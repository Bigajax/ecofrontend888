import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, Circle, ArrowLeft } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';

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
}

const INITIAL_MEDITATIONS: Meditation[] = [
  {
    id: 'blessing_1',
    title: 'Meditação Bênção dos centros de energia',
    description: 'Equilibre e ative seus centros energéticos',
    duration: '7 min',
    audioUrl: '/audio/energy-blessings-meditation.mp3',
    image: 'url("/images/meditacao-bencao-energia.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    completed: false,
  },
  {
    id: 'blessing_2',
    title: 'Meditação para sintonizar novos potenciais',
    description: 'Alinhe-se com novas possibilidades',
    duration: '7 min',
    audioUrl: '/audio/sintonizar-novos-potenciais.mp3',
    image: 'url("/images/meditacao-novos-potenciais.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
    completed: false,
  },
  {
    id: 'blessing_3',
    title: 'Meditação para recondicionar o corpo a uma nova mente',
    description: 'Transforme padrões mentais e físicos',
    duration: '7 min',
    audioUrl: '/audio/recondicionar-corpo-nova-mente.mp3',
    image: 'url("/images/meditacao-recondicionar.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #9B79C9 0%, #8766B5 20%, #7454A0 40%, #61438C 60%, #4E3377 80%, #3B2463 100%)',
    completed: false,
  },
  {
    id: 'blessing_5',
    title: 'Meditação caminhando',
    description: 'Pratique presença em movimento',
    duration: '5 min',
    audioUrl: '/audio/meditacao-caminhando.mp3',
    image: 'url("/images/meditacao-caminhando.webp")',
    imagePosition: 'center 15%',
    gradient: 'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)',
    completed: false,
  },
  {
    id: 'blessing_6',
    title: 'Meditação espaço-tempo, tempo-espaço',
    description: 'Transcenda as limitações dimensionais',
    duration: '5 min',
    audioUrl: '/audio/meditacao-espaco-tempo.mp3',
    image: 'url("/images/meditacao-espaco-tempo.webp")',
    imagePosition: 'center 32%',
    gradient: 'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
    completed: false,
  },
];

export default function DrJoeDispenzaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load meditations from localStorage
  const [meditations, setMeditations] = useState<Meditation[]>(() => {
    const storageKey = `eco.drJoe.meditations.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
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
    sessionStorage.setItem('drJoePageScrollPosition', window.scrollY.toString());

    navigate('/app/meditation-player', {
      state: {
        meditation: {
          title: meditation.title,
          duration: meditation.duration,
          audioUrl: meditation.audioUrl,
          imageUrl: meditation.image.replace('url("', '').replace('")', ''),
          backgroundMusic: 'Cristais',
          gradient: meditation.gradient,
        },
        returnTo: '/app/dr-joe-dispenza',
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

  const handleLogout = () => {
    navigate('/');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-primary">
      <HomeHeader onLogout={handleLogout} />

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
              backgroundImage: 'url("/images/caduceu-dourado.png")',
              backgroundPosition: 'center 30%',
              transform: 'scale(1.1)',
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
              Fundamentos
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/95 drop-shadow-md sm:mt-4 sm:text-base md:text-lg lg:text-xl" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
              Meditação começa com atenção e consciência. Nesta série, começaremos a praticar atenção plena através do foco na respiração e no corpo.
            </p>

            <button
              onClick={() => handleMeditationClick(meditations[0])}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#89CFF0] px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-[#6FB8E0] active:scale-95 sm:mt-8 sm:px-8 sm:py-3 sm:text-base"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
              Tocar
            </button>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <h2 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">Episódios</h2>
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
                >
                  {meditation.completed ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#89CFF0] sm:h-8 sm:w-8">
                      <Check className="h-4 w-4 text-white sm:h-5 sm:w-5" strokeWidth={3} />
                    </div>
                  ) : (
                    <Circle className="h-7 w-7 text-[var(--eco-line)] sm:h-8 sm:w-8" strokeWidth={2} />
                  )}
                </button>

                <button
                  onClick={() => handleMeditationClick(meditation)}
                  className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                      {meditation.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:mt-1 sm:text-sm">
                      {meditation.description}
                    </p>
                  </div>

                  <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                    <span className="text-xs text-[var(--eco-muted)] sm:text-sm">
                      {meditation.duration}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#89CFF0]/10 sm:h-10 sm:w-10">
                      <Play className="h-4 w-4 text-[#89CFF0] sm:h-5 sm:w-5" fill="currentColor" />
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
