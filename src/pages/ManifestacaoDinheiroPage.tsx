import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Check, Volume2, VolumeX, Maximize } from 'lucide-react';
import { VIDEO_CALEIDOSCOPIO_DINHEIRO } from '@/config/videos';

export default function ManifestacaoDinheiroPage() {
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
  const caleidoscopioVideoRef = useRef<HTMLVideoElement>(null);
  const mindMovieAudioRef = useRef<HTMLAudioElement>(null);
  const afirmacoesAudioRef = useRef<HTMLAudioElement>(null);

  // Controles do vídeo
  const [showControls, setShowControls] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Controle de conclusão de cada etapa
  const [caleidoscopioCompleted, setCaleidoscopioCompleted] = useState(false);
  const [mindMovieCompleted, setMindMovieCompleted] = useState(false);

  const emotions = [
    'Segurança',
    'Confiança',
    'Abundância',
    'Gratidão',
    'Leveza',
    'Poder pessoal',
    'Liberdade',
    'Clareza',
  ];

  const focusOptions = [
    'Aumentar renda',
    'Atrair oportunidades',
    'Criar segurança financeira',
    'Se livrar do medo/escassez',
    'Abrir novas fontes de dinheiro',
  ];

  const afirmacoes = [
    {
      titulo: 'Identidade de abundância',
      frases: [
        'Eu mereço abundância, felicidade e paz.',
        'Sinto-me rico(a).',
        'Sou rico(a).',
        'Tenho abundância em todas as áreas da minha vida.',
        'Irradio riqueza, abundância e sucesso.',
        'Sou financeiramente livre.',
      ],
    },
    {
      titulo: 'Dinheiro como energia & fluxo',
      frases: [
        'O dinheiro reflete minha saúde interior.',
        'Minha mente está aberta para receber riqueza ilimitada.',
        'O dinheiro flui livremente em minha vida; o dinheiro é energia.',
        'Eu atraio dinheiro com meus pensamentos de abundância.',
        'Estou em equilíbrio com a energia da abundância.',
        'Penso no dinheiro de forma positiva.',
        'O dinheiro é bom.',
      ],
    },
    {
      titulo: 'Renda, fontes e oportunidades',
      frases: [
        'Estou focado(a) em atrair dinheiro.',
        'Atraio oportunidades favoráveis para ganhar mais dinheiro.',
        'Minha renda está sempre crescendo.',
        'Ganho dinheiro de forma rápida e fácil.',
        'O dinheiro chega para mim de novas fontes todos os dias.',
        'Recebo dinheiro por tudo o que tenho a oferecer ao mundo.',
        'Recebo dinheiro agora.',
        'Atraio grandes quantias de dinheiro com facilidade.',
        'Minha renda aumenta enquanto durmo.',
        'Sou um ímã para dinheiro.',
        'Minha carteira e minha conta bancária estão cheias de dinheiro.',
        'O dinheiro chega para mim em grandes quantias.',
      ],
    },
    {
      titulo: 'Uso sábio & gratidão',
      frases: [
        'Atraio dinheiro e uso com sabedoria.',
        'Atraio dinheiro com alegria e amor.',
        'Sou feliz e grata(o).',
        'Sou grata(o) por todo dinheiro que recebo.',
      ],
    },
  ];

  const handleStartJourney = () => {
    console.log({ selectedEmotion, selectedFocus });
    setStep(3);
  };

  const toggleCaleidoscopio = () => {
    if (caleidoscopioAudioRef.current && caleidoscopioVideoRef.current) {
      if (isPlayingCaleidoscopio) {
        caleidoscopioAudioRef.current.pause();
        caleidoscopioVideoRef.current.pause();
      } else {
        caleidoscopioAudioRef.current.play();
        caleidoscopioVideoRef.current.play();
      }
      setIsPlayingCaleidoscopio(!isPlayingCaleidoscopio);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (caleidoscopioVideoRef.current) {
      const current = caleidoscopioVideoRef.current.currentTime;
      const duration = caleidoscopioVideoRef.current.duration;
      setVideoCurrentTime(current);
      setVideoProgress((current / duration) * 100);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (caleidoscopioVideoRef.current) {
      setVideoDuration(caleidoscopioVideoRef.current.duration);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (caleidoscopioVideoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * caleidoscopioVideoRef.current.duration;
      caleidoscopioVideoRef.current.currentTime = newTime;
      if (caleidoscopioAudioRef.current) {
        caleidoscopioAudioRef.current.currentTime = newTime;
      }
    }
  };

  const toggleMute = () => {
    if (caleidoscopioVideoRef.current) {
      caleidoscopioVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (caleidoscopioVideoRef.current) {
      caleidoscopioVideoRef.current.volume = newVolume;
    }
  };

  const toggleFullscreen = () => {
    if (videoContainerRef.current) {
      if (!document.fullscreenElement) {
        videoContainerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              Como você quer se sentir em relação ao dinheiro?
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
              Caleidoscópio — Abrindo a Mente para a Abundância
            </h1>

            <p className="mt-4 text-base text-[var(--eco-muted)] sm:text-lg">
              Duração: 7 min
            </p>

            {/* Vídeo do caleidoscópio com controles estilo YouTube */}
            <div
              ref={videoContainerRef}
              className="relative mt-8 overflow-hidden rounded-2xl bg-black group"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              <video
                ref={caleidoscopioVideoRef}
                className="w-full h-auto"
                loop
                playsInline
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
              >
                <source src={VIDEO_CALEIDOSCOPIO_DINHEIRO} type="video/mp4" />
                Seu navegador não suporta a reprodução de vídeo.
              </video>

              {/* Botão Play/Pause Central */}
              {!isPlayingCaleidoscopio && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
                  <button
                    onClick={toggleCaleidoscopio}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-[#7A52A6] shadow-2xl transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95"
                  >
                    <Play className="h-10 w-10 ml-1" fill="currentColor" />
                  </button>
                </div>
              )}

              {/* Controles inferiores estilo YouTube */}
              <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-4 py-3 transition-opacity duration-300 ${
                  showControls || !isPlayingCaleidoscopio ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Barra de progresso */}
                <div
                  className="mb-3 h-1 w-full cursor-pointer rounded-full bg-white/30 hover:h-1.5 transition-all"
                  onClick={handleProgressBarClick}
                >
                  <div
                    className="h-full rounded-full bg-[#7A52A6] transition-all"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>

                {/* Controles */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Play/Pause */}
                    <button
                      onClick={toggleCaleidoscopio}
                      className="text-white transition-transform hover:scale-110 active:scale-95"
                    >
                      {isPlayingCaleidoscopio ? (
                        <Pause className="h-6 w-6" fill="currentColor" />
                      ) : (
                        <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                      )}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="text-white transition-transform hover:scale-110 active:scale-95"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/30 rounded-full outline-none cursor-pointer"
                      />
                    </div>

                    {/* Tempo */}
                    <span className="text-xs text-white font-medium">
                      {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                    </span>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white transition-transform hover:scale-110 active:scale-95"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Áudio sincronizado (oculto) */}
              <audio
                ref={caleidoscopioAudioRef}
                src="/audio/caleidoscopio-dinheiro-mock.mp3"
              />
            </div>

            {/* Instruções */}
            <div className="mt-6 space-y-2 text-center">
              <p className="text-base text-[var(--eco-muted)]">
                Observe os movimentos.
              </p>
              <p className="text-base text-[var(--eco-muted)]">
                Relaxe e deixe a mente desacelerar.
              </p>
            </div>

            {/* Mensagem de conclusão */}
            {caleidoscopioCompleted && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                <p className="text-center text-base font-medium text-green-800">
                  Agora sua mente está pronta para visualizar sua realidade financeira desejada.
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

        {/* TELA 4 - Mind Movie do Dinheiro */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Mind Movie — Criando sua Realidade Financeira
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
                    Áudio Mind Movie do Dinheiro
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 w-0 rounded-full bg-[#7A52A6] transition-all" />
                  </div>
                </div>
              </div>
              <audio
                ref={mindMovieAudioRef}
                src="/audio/mind-movie-dinheiro-mock.mp3"
              />
            </div>

            {/* Instruções */}
            <div className="mt-6 text-center">
              <p className="text-base text-[var(--eco-muted)]">
                Feche os olhos e deixe as cenas aparecerem sozinhas.
              </p>
            </div>

            {/* Mensagem de conclusão */}
            {mindMovieCompleted && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                <p className="text-center text-base font-medium text-green-800">
                  Agora vamos instalar a frequência da abundância em você.
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

        {/* TELA 5 - Afirmações de Prosperidade */}
        {step === 5 && (
          <div className="animate-fade-in">
            <h1 className="font-display text-3xl font-bold text-[var(--eco-text)] sm:text-4xl md:text-5xl">
              Afirmações de Prosperidade e Abundância
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
                src="/audio/afirmacoes-dinheiro-mock.mp3"
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

            {/* Mensagem Final */}
            <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
              <p className="text-base font-medium text-blue-800">
                Sua jornada de manifestação do dinheiro foi concluída.
              </p>
            </div>

            {/* Botões Finais */}
            <div className="mt-8 space-y-3">
              <button
                onClick={() => navigate('/app/programas/caleidoscopio-mind-movie')}
                className="w-full rounded-full bg-green-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:bg-green-700 hover:shadow-xl active:scale-95"
              >
                Concluir
              </button>

              <button
                onClick={() => setStep(2)}
                className="w-full rounded-full border-2 border-[#7A52A6] bg-white px-8 py-4 text-lg font-medium text-[#7A52A6] shadow-md transition-all duration-300 hover:bg-[#7A52A6] hover:text-white active:scale-95"
              >
                Repetir jornada
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
