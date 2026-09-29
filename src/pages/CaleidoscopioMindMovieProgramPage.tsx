import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';
import { useAuth } from '@/contexts/AuthContext';
import { readCaleidoscopioCompleted } from '@/utils/caleidoscopioProgress';

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

  // Quem grava são os episódios (ao chegar na última tela); aqui só se lê.
  // Não escrever de volta: com a sessão chegando depois, o conjunto vazio do visitante
  // era gravado por cima do progresso do usuário.
  const uid = user?.id || 'guest';
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<string>>(() =>
    readCaleidoscopioCompleted(uid)
  );

  useEffect(() => {
    setCompletedEpisodes(readCaleidoscopioCompleted(uid));
  }, [uid]);

  const completedCount = completedEpisodes.size;
  const totalCount = INITIAL_EPISODES.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const remaining = totalCount - completedCount;
  const urgencyLabel =
    pct === 0
      ? 'Comece pela primeira sessão.'
      : pct === 100
      ? 'Programa concluído.'
      : pct >= 80
      ? 'Você está quase lá.'
      : `Faltam ${remaining} sessões.`;
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


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const episodios: ReinoSessao[] = INITIAL_EPISODES.map((ep) => ({
    id: ep.id,
    titulo: ep.title,
    descricao: ep.description,
    meta: completedEpisodes.has(ep.id) ? 'feito' : ep.duration,
    estado: completedEpisodes.has(ep.id) ? 'feita' : 'livre',
  }));

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      {showIntroModal && (
        <div className="reino-drjoe__ciclo" role="dialog" aria-modal="true" aria-labelledby="caleidoscopio-intro" onClick={() => setShowIntroModal(false)}>
          <div className="reino-drjoe__ciclo-caixa reino-aneis__boas-vindas" onClick={(e) => e.stopPropagation()}>
            <p className="reino-rotulo" style={{ color: '#5b6080' }}>
              Antes de começar
            </p>
            <h2 id="caleidoscopio-intro" className="reino-corpo__titulo" style={{ color: '#1c2350', fontSize: 26 }}>
              Prepare-se para a sua jornada interna
            </h2>
            <p className="reino-corpo__sobre" style={{ color: '#4b5070' }}>
              Uma reprogramação profunda para corpo, mente e energia. Você relaxa, visualiza seu estado ideal e instala
              novas mensagens pelo sentimento. São três camadas que trabalham juntas:
            </p>
            <ul className="reino-abundancia__lista" style={{ color: '#1c2350' }}>
              <li>
                <span>
                  <strong>Caleidoscópio.</strong> Relaxa o corpo, desacelera a mente e abre espaço interno.
                </span>
              </li>
              <li>
                <span>
                  <strong>Mind Movie.</strong> Cria a imagem da realidade que você deseja viver.
                </span>
              </li>
              <li>
                <span>
                  <strong>Afirmações.</strong> Instalam novas mensagens de cura e bem-estar no corpo emocional.
                </span>
              </li>
            </ul>
            <p className="reino-corpo__sobre" style={{ color: '#4b5070' }}>
              Quando as três se encontram, o corpo entra em harmonia, e a cura acontece com mais naturalidade.
            </p>
            <button type="button" className="reino-placa" onClick={() => setShowIntroModal(false)}>
              Continuar <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      <main>
        <ReinoChegada
          mood="amanhecer"
          imagem="/images/reino/capa-visualize.webp"
          foco="center 62%"
          lugar="TRI.04 · As Trilhas · Dr. Joe Dispenza"
          titulo="Visualize quem você quer ser"
          sobre="Caleidoscópio, Mind Movie e afirmações guiadas para reprogramar a mente, acalmar o corpo e ensaiar a nova realidade."
          voltar={{ rotulo: 'Voltar para a biblioteca', onClick: () => navigate('/app/programas') }}
          progresso={{ valor: pct / 100, legenda: `${urgencyLabel} ${completedCount} de ${totalCount} episódios.` }}
        >
          <button type="button" className="reino-placa" onClick={handlePlayProgram}>
            Tocar o programa <span aria-hidden="true">→</span>
          </button>
        </ReinoChegada>

        <div className="reino-pagina">
          {sessionJustCompleted !== null && (
            <div className="reino-nota" role="status">
              <p>Você avançou para {sessionJustCompleted}% da jornada.</p>
            </div>
          )}
          <p className="reino-rotulo">Os episódios</p>
          <ReinoSessoes
            sessoes={episodios}
            onEscolher={(id) => {
              const ep = INITIAL_EPISODES.find((x) => x.id === id);
              if (ep) handleEpisodeClick(ep);
            }}
          />
        </div>
      </main>
    </div>
  );
}