import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Check } from 'lucide-react';

export default function ManifestacaoSaudePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(2);

  // TELA 2 - Setup
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);

  // Players de áudio
  const [isPlayingCaleidoscopio, setIsPlayingCaleidoscopio] = useState(false);
  const [isPlayingMindMovie, setIsPlayingMindMovie] = useState(false);
  const [isPlayingAfirmacoes, setIsPlayingAfirmacoes] = useState(false);

  const caleidoscopioAudioRef = useRef<HTMLAudioElement>(null);
  const mindMovieAudioRef = useRef<HTMLAudioElement>(null);
  const afirmacoesAudioRef = useRef<HTMLAudioElement>(null);

  // Controle de conclusão de cada etapa
  const [caleidoscopioCompleted, setCaleidoscopioCompleted] = useState(false);
  const [mindMovieCompleted, setMindMovieCompleted] = useState(false);

  const emotions = [
    'Vitalidade',
    'Leveza',
    'Paz',
    'Bem-estar',
    'Energia',
    'Autocuidado',
    'Alegria',
    'Força',
  ];

  const focusOptions = [
    'Energia física',
    'Regeneração',
    'Autocura',
    'Bem-estar emocional',
    'Sono e descanso',
    'Imunidade',
    'Alívio de tensão',
  ];

  const afirmacoes = [
    {
      titulo: 'Saúde e Vitalidade',
      frases: [
        'Meu corpo é um sistema inteligente de cura.',
        'Cada célula minha vibra em perfeita saúde.',
        'Eu honro meu corpo e ele me retribui com energia.',
      ],
    },
    {
      titulo: 'Regeneração e Equilíbrio',
      frases: [
        'Meu corpo se regenera a cada momento.',
        'Eu confio na sabedoria do meu organismo.',
        'Estou em equilíbrio perfeito com a vida.',
      ],
    },
    {
      titulo: 'Energia e Leveza',
      frases: [
        'Energia vital flui livremente por todo o meu corpo.',
        'Sinto leveza e bem-estar em cada respiração.',
        'Meu corpo é leve, forte e saudável.',
      ],
    },
    {
      titulo: 'Cura e Bem-estar',
      frases: [
        'Permito que a cura aconteça naturalmente.',
        'Confio no processo de autocura do meu corpo.',
        'Estou em paz com minha saúde e meu corpo.',
      ],
    },
  ];

  const handleStartJourney = () => {
    console.log('Emoção selecionada:', selectedEmotion);
    console.log('Foco selecionado:', selectedFocus);
    setStep(3);
  };

  const toggleCaleidoscopio = () => {
    if (caleidoscopioAudioRef.current) {
      if (isPlayingCaleidoscopio) {
        caleidoscopioAudioRef.current.pause();
      } else {
        caleidoscopioAudioRef.current.play();
      }
      setIsPlayingCaleidoscopio(!isPlayingCaleidoscopio);
    }
  };

  const toggleMindMovie = () => {
    if (mindMovieAudioRef.current) {
      if (isPlayingMindMovie) {
        mindMovieAudioRef.current.pause();
      } else {
        mindMovieAudioRef.current.play();
      }
      setIsPlayingMindMovie(!isPlayingMindMovie);
    }
  };

  const toggleAfirmacoes = () => {
    if (afirmacoesAudioRef.current) {
      if (isPlayingAfirmacoes) {
        afirmacoesAudioRef.current.pause();
      } else {
        afirmacoesAudioRef.current.play();
      }
      setIsPlayingAfirmacoes(!isPlayingAfirmacoes);
    }
  };

  // Marcar como completo quando o áudio terminar
  useEffect(() => {
    const caleidoscopioAudio = caleidoscopioAudioRef.current;
    if (caleidoscopioAudio) {
      const handleEnded = () => {
        setIsPlayingCaleidoscopio(false);
        setCaleidoscopioCompleted(true);
      };
      caleidoscopioAudio.addEventListener('ended', handleEnded);
      return () => caleidoscopioAudio.removeEventListener('ended', handleEnded);
    }
  }, []);

  useEffect(() => {
    const mindMovieAudio = mindMovieAudioRef.current;
    if (mindMovieAudio) {
      const handleEnded = () => {
        setIsPlayingMindMovie(false);
        setMindMovieCompleted(true);
      };
      mindMovieAudio.addEventListener('ended', handleEnded);
      return () => mindMovieAudio.removeEventListener('ended', handleEnded);
    }
  }, []);

  useEffect(() => {
    const afirmacoesAudio = afirmacoesAudioRef.current;
    if (afirmacoesAudio) {
      const handleEnded = () => {
        setIsPlayingAfirmacoes(false);
      };
      afirmacoesAudio.addEventListener('ended', handleEnded);
      return () => afirmacoesAudio.removeEventListener('ended', handleEnded);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white font-primary">
      {/* Header com botão voltar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <button
            onClick={() => navigate('/app/programas/caleidoscopio-mind-movie')}
            className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao programa
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-20 sm:px-6 md:px-8">
        {/* TELA 2 - Setup da Jornada */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Como você quer se sentir em relação à sua saúde?
            </h1>

            {/* Emoções */}
            <div className="mt-8">
              <p className="mb-4 text-sm font-medium text-[var(--eco-text)]">
                Escolha uma emoção (obrigatório):
              </p>
              <div className="flex flex-wrap gap-2">
                {emotions.map((emotion) => (
                  <button
                    key={emotion}
                    onClick={() => setSelectedEmotion(emotion)}
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      selectedEmotion === emotion
                        ? 'bg-[#7A52A6] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {emotion}
                  </button>
                ))}
              </div>
            </div>

            {/* Foco (opcional) */}
            <div className="mt-10">
              <p className="mb-4 text-sm font-medium text-[var(--eco-text)]">
                Qual é o foco da sua jornada hoje? (opcional):
              </p>
              <div className="flex flex-wrap gap-2">
                {focusOptions.map((focus) => (
                  <button
                    key={focus}
                    onClick={() =>
                      setSelectedFocus(selectedFocus === focus ? null : focus)
                    }
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      selectedFocus === focus
                        ? 'bg-[#7A52A6] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            {/* Botão Iniciar Jornada */}
            <button
              onClick={handleStartJourney}
              disabled={!selectedEmotion}
              className="mt-12 w-full rounded-full bg-[#7A52A6] px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              Iniciar Jornada
            </button>
          </div>
        )}

        {/* TELA 3 - Caleidoscópio */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Caleidoscópio — Acalmando o Corpo e a Mente
            </h1>

            <p className="mt-4 text-base text-[var(--eco-muted)] sm:text-lg">
              Duração: 3–5 min
            </p>

            {/* Placeholder para animação do caleidoscópio */}
            <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-400 via-pink-300 to-purple-500 p-1">
              <div className="flex h-64 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm sm:h-80 md:h-96">
                <p className="text-center text-lg font-medium text-white drop-shadow-lg">
                  Animação do caleidoscópio aqui
                </p>
              </div>
            </div>

            {/* Player de áudio */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleCaleidoscopio}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#7A52A6] text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95"
                >
                  {isPlayingCaleidoscopio ? (
                    <Pause className="h-6 w-6" fill="currentColor" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    Áudio Caleidoscópio
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-0 rounded-full bg-[#7A52A6] transition-all" />
                  </div>
                </div>
              </div>
              <audio
                ref={caleidoscopioAudioRef}
                src="/audio/caleidoscopio-mock.mp3"
              />
            </div>

            {/* Instruções */}
            <div className="mt-6 space-y-2 text-center">
              <p className="text-base text-[var(--eco-muted)]">
                Observe os movimentos.
              </p>
              <p className="text-base text-[var(--eco-muted)]">
                Deixe seu corpo relaxar.
              </p>
            </div>

            {/* Mensagem de conclusão */}
            {caleidoscopioCompleted && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                <p className="text-center text-base font-medium text-green-800">
                  Agora seu corpo está pronto para visualizar sua saúde ideal.
                </p>
              </div>
            )}

            {/* Botão Continuar - sempre disponível para teste */}
            <button
              onClick={() => setStep(4)}
              className="mt-8 w-full rounded-full bg-[#7A52A6] px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95"
            >
              Ir para Mind Movie
            </button>
          </div>
        )}

        {/* TELA 4 - Mind Movie da Saúde */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Mind Movie — Criando sua Realidade de Saúde
            </h1>

            <p className="mt-4 text-base text-[var(--eco-muted)] sm:text-lg">
              Duração: ~5 min
            </p>

            {/* Player de áudio */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMindMovie}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#7A52A6] text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95"
                >
                  {isPlayingMindMovie ? (
                    <Pause className="h-6 w-6" fill="currentColor" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    Áudio Mind Movie da Saúde
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-0 rounded-full bg-[#7A52A6] transition-all" />
                  </div>
                </div>
              </div>
              <audio
                ref={mindMovieAudioRef}
                src="/audio/mind-movie-saude-mock.mp3"
              />
            </div>

            {/* Instruções */}
            <div className="mt-6 text-center">
              <p className="text-base text-[var(--eco-muted)]">
                Feche os olhos e permita que a imagem apareça sozinha.
              </p>
            </div>

            {/* Mensagem de conclusão */}
            {mindMovieCompleted && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                <p className="text-center text-base font-medium text-green-800">
                  Agora vamos instalar a frequência da saúde em cada célula.
                </p>
              </div>
            )}

            {/* Botão Continuar - sempre disponível para teste */}
            <button
              onClick={() => setStep(5)}
              className="mt-8 w-full rounded-full bg-[#7A52A6] px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95"
            >
              Ir para Afirmações
            </button>
          </div>
        )}

        {/* TELA 5 - Afirmações da Saúde */}
        {step === 5 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Afirmações de Saúde e Cura
            </h1>

            <p className="mt-4 text-base text-[var(--eco-muted)] sm:text-lg">
              Duração: 4–7 min
            </p>

            {/* Player de áudio */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAfirmacoes}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#7A52A6] text-white shadow-lg transition-all duration-300 hover:bg-[#673E97] hover:shadow-xl active:scale-95"
                >
                  {isPlayingAfirmacoes ? (
                    <Pause className="h-6 w-6" fill="currentColor" />
                  ) : (
                    <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    Áudio das Afirmações
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-0 rounded-full bg-[#7A52A6] transition-all" />
                  </div>
                </div>
              </div>
              <audio
                ref={afirmacoesAudioRef}
                src="/audio/afirmacoes-saude-mock.mp3"
              />
            </div>

            {/* Lista de Afirmações */}
            <div className="mt-8 space-y-6">
              {afirmacoes.map((bloco, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <h3 className="mb-3 font-display text-lg font-semibold text-[var(--eco-text)]">
                    {bloco.titulo}
                  </h3>
                  <ul className="space-y-2">
                    {bloco.frases.map((frase, fIndex) => (
                      <li
                        key={fIndex}
                        className="flex items-start gap-3 text-base text-[var(--eco-muted)]"
                      >
                        <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#7A52A6]/10">
                          <Check className="h-3 w-3 text-[#7A52A6]" />
                        </div>
                        <span>{frase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Botão Finalizar */}
            <button
              onClick={() => navigate('/app/programas/caleidoscopio-mind-movie')}
              className="mt-12 w-full rounded-full bg-green-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:bg-green-700 hover:shadow-xl active:scale-95"
            >
              Concluir Jornada
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
