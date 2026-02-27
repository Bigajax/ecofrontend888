import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, X } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/AuthContext';

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl?: string;
}

const INITIAL_EPISODES: Episode[] = [
  {
    id: 'manifestacao_saude',
    title: 'Manifestação da Saúde',
    description: 'Visualize seu corpo em equilíbrio, vitalidade e cura natural.',
    duration: '15 min',
    audioUrl: '/audio/manifestacao-saude.mp3',
  },
  {
    id: 'manifestacao_dinheiro',
    title: 'Manifestação do Dinheiro',
    description: 'Ative a frequência da abundância e reprograma sua relação com o dinheiro.',
    duration: '15 min',
    audioUrl: '/audio/manifestacao-dinheiro.mp3',
  },
];

export default function CaleidoscopioMindMovieProgramPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Modal de introdução - sempre abre ao entrar na página
  // TODO: No futuro, pode verificar localStorage para não mostrar novamente
  const [showIntroModal, setShowIntroModal] = useState(true);

  // Load progress from localStorage
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<string>>(() => {
    const storageKey = `eco.caleidoscopio.completed.v1.${user?.id || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Save to localStorage whenever progress changes
  useEffect(() => {
    const uid = user?.id || 'guest';
    const storageKey = `eco.caleidoscopio.completed.v1.${uid}`;
    localStorage.setItem(storageKey, JSON.stringify([...completedEpisodes]));
    if (completedEpisodes.size > 0) {
      localStorage.setItem(`eco.program.lastActive.caleidoscopio.${uid}`, new Date().toISOString());
    }
  }, [completedEpisodes, user?.id]);

  const [sessionJustCompleted, setSessionJustCompleted] = useState<number | null>(null);
  const prevSizeRef = useRef(completedEpisodes.size);

  useEffect(() => {
    if (completedEpisodes.size > prevSizeRef.current) {
      const newPct = Math.round((completedEpisodes.size / totalCount) * 100);
      setSessionJustCompleted(newPct);
      setTimeout(() => setSessionJustCompleted(null), 3000);
    }
    prevSizeRef.current = completedEpisodes.size;
  }, [completedEpisodes.size, totalCount]);

  const handleEpisodeClick = (episode: Episode) => {
    // Navegar para o episódio Manifestação da Saúde
    if (episode.id === 'manifestacao_saude') {
      navigate('/app/programas/caleidoscopio-mind-movie/manifestacao-saude');
      return;
    }

    // Navegar para o episódio Manifestação do Dinheiro
    if (episode.id === 'manifestacao_dinheiro') {
      navigate('/app/programas/caleidoscopio-mind-movie/manifestacao-dinheiro');
      return;
    }

    // Outros episódios (por enquanto apenas log)
    console.log(`Play ${episode.title}`);
    // TODO: Integrar com o player real
  };

  const handlePlayProgram = () => {
    // Toca o primeiro episódio
    handleEpisodeClick(INITIAL_EPISODES[0]);
  };

  const completedCount = completedEpisodes.size;
  const totalCount = INITIAL_EPISODES.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const remaining = totalCount - completedCount;
  const urgencyLabel =
    pct === 0
      ? 'Comece sua primeira sessão'
      : pct === 100
      ? 'Programa concluído 🎉'
      : pct >= 80
      ? 'Você está quase lá'
      : `Continue sua jornada · Faltam ${remaining} sessões`;

  const handleLogout = () => {
    navigate('/');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white font-primary">
      <HomeHeader onLogout={handleLogout} />

      {/* Modal de Introdução */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowIntroModal(false)}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8 md:p-10">
            {/* Close Button */}
            <button
              onClick={() => setShowIntroModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 sm:right-6 sm:top-6"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Título */}
            <h2 className="font-display text-2xl font-bold text-[var(--eco-text)] sm:text-3xl md:text-4xl">
              Antes de iniciar, prepare-se para a sua jornada interna
            </h2>

            {/* Texto introdutório */}
            <p className="mt-4 text-base text-[var(--eco-muted)] sm:mt-6 sm:text-lg">
              Esta é uma jornada de reprogramação profunda para o seu corpo, mente e energia.
              Aqui, você relaxa, visualiza seu estado ideal de saúde e instala novas mensagens de cura através do sentimento.
            </p>
            <p className="mt-3 text-base text-[var(--eco-muted)] sm:text-lg">
              Esta prática combina três camadas que trabalham juntas:
            </p>

            {/* Lista de 3 itens */}
            <ul className="mt-6 space-y-4 sm:mt-8">
              <li className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A52A6]/10 sm:h-7 sm:w-7">
                    <div className="h-2 w-2 rounded-full bg-[#7A52A6] sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">
                    Caleidoscópio
                  </h3>
                  <p className="mt-1 text-sm text-[var(--eco-muted)] sm:text-base">
                    Relaxa o corpo, desacelera a mente e abre espaço interno.
                  </p>
                </div>
              </li>

              <li className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A52A6]/10 sm:h-7 sm:w-7">
                    <div className="h-2 w-2 rounded-full bg-[#7A52A6] sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">
                    Mind Movie
                  </h3>
                  <p className="mt-1 text-sm text-[var(--eco-muted)] sm:text-base">
                    Cria a imagem da realidade saudável que você deseja viver.
                  </p>
                </div>
              </li>

              <li className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A52A6]/10 sm:h-7 sm:w-7">
                    <div className="h-2 w-2 rounded-full bg-[#7A52A6] sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--eco-text)] sm:text-lg">
                    Afirmações
                  </h3>
                  <p className="mt-1 text-sm text-[var(--eco-muted)] sm:text-base">
                    Instalam novas mensagens de cura e bem-estar no seu corpo emocional.
                  </p>
                </div>
              </li>
            </ul>

            {/* Parágrafo final */}
            <p className="mt-6 text-base text-[var(--eco-muted)] sm:mt-8 sm:text-lg">
              Quando estas três camadas se encontram, seu corpo entra em harmonia — e a cura acontece com mais naturalidade.
            </p>

            {/* Botão Continuar */}
            <button
              onClick={() => setShowIntroModal(false)}
              className="mt-8 w-full rounded-full bg-[#7A52A6] px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95 sm:mt-10 sm:py-4 sm:text-lg"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      <main className="pb-20">
        {/* Hero Section */}
        <section className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden py-12 sm:min-h-[500px] sm:py-16 md:min-h-[600px] md:py-20">
          {/* Back Button */}
          <button
            onClick={() => navigate('/app/programas')}
            className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[var(--eco-text)] shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg sm:left-6 sm:top-6 md:left-8 md:top-8"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Background Image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#9B7AC8',
              backgroundImage: 'url("/images/caleidoscopio-mind-movie.webp")',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Bottom Fade to White */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 60%, rgba(255,255,255,1) 100%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center px-4 text-center sm:px-6">
            <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg sm:text-4xl md:text-4xl lg:text-5xl xl:text-5xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              Programa de Meditação do Caleidoscópio e Mind Movie
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-white/95 drop-shadow-md sm:mt-4 sm:text-base md:text-base lg:text-lg" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
              Reprograme sua mente, acalme seu corpo e manifeste novas realidades internas através da combinação de caleidoscópio, Mind Movie e afirmações guiadas.
            </p>

            <button
              onClick={handlePlayProgram}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-medium text-[#7A52A6] shadow-lg transition-all duration-300 hover:bg-white/95 hover:shadow-xl active:scale-95 sm:mt-8 sm:px-10 sm:py-4 sm:text-lg"
            >
              <Play className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" />
              Tocar programa
            </button>
          </div>
        </section>

        {/* Episodes Section */}
        {/* Toast de celebração — aparece 3s após concluir episódio */}
        {sessionJustCompleted !== null && (
          <div className="mx-auto max-w-4xl px-4 sm:px-8 mb-4 animate-fade-in">
            <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-2.5 flex items-center gap-2">
              <span className="text-violet-600 text-sm font-semibold">
                Você avançou para {sessionJustCompleted}% da sua jornada
              </span>
            </div>
          </div>
        )}

        <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8 md:px-8">
          {/* Bloco de progresso */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-800">{urgencyLabel}</span>
              <span className="text-sm font-bold text-gray-800">{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background:
                    pct === 100
                      ? 'linear-gradient(to right, #34d399, #10b981)'
                      : 'linear-gradient(to right, #a78bfa, #7c3aed)',
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {completedCount} de {totalCount} episódios concluídos
              {pct >= 50 && pct < 100 ? ' · A maioria desiste antes da metade — você passou' : ''}
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {INITIAL_EPISODES.map((episode) => (
              <div
                key={episode.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--eco-line)] bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] sm:items-center sm:gap-4 sm:p-4"
              >
                <button
                  onClick={() => handleEpisodeClick(episode)}
                  className="flex flex-1 flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-0"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--eco-text)] sm:text-base">
                      {episode.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--eco-muted)] sm:mt-1 sm:text-sm">
                      {episode.description}
                    </p>
                  </div>

                  <div className="flex w-full items-center justify-between sm:ml-4 sm:w-auto sm:justify-end sm:gap-3">
                    <span className="text-xs text-[var(--eco-muted)] sm:text-sm">
                      {episode.duration}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7A52A6]/10 transition-all duration-300 hover:bg-[#7A52A6]/20 sm:h-10 sm:w-10">
                      <Play className="h-4 w-4 text-[#7A52A6] sm:h-5 sm:w-5" fill="currentColor" />
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
