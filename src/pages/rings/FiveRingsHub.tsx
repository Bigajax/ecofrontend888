import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useRings } from '@/contexts/RingsContext';
import { useProgram } from '@/contexts/ProgramContext';
import { useAuth } from '@/contexts/AuthContext';
import { RINGS_ARRAY } from '@/constants/rings';
import OnboardingModal from '@/components/rings/OnboardingModal';
import HomeHeader from '@/components/home/HomeHeader';
import RingsHistory from '@/components/rings/RingsHistory';
import ReinoChegada, { ReinoSessoes, type ReinoSessao } from '@/components/reino/ReinoChegada';

export default function FiveRingsHub() {
  const navigate = useNavigate();
  const { showOnboarding, completeOnboarding, dismissOnboarding, currentRitual, progress } =
    useRings();
  const { ongoingProgram, updateProgress, resumeProgram } = useProgram();
  const { user, isGuestMode, isVipUser } = useAuth();

  const ritualCompleted = currentRitual?.status === 'completed';
  // VIP users bypass all guest gates
  const isGuest = isGuestMode && !user && !isVipUser;

  // Tab state
  const [activeTab, setActiveTab] = useState<'ritual' | 'history'>('ritual');

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resume program when page loads
  useEffect(() => {
    if (ongoingProgram?.id === 'rec_1') {
      resumeProgram();
    }
  }, [ongoingProgram?.id, resumeProgram]);

  // Update program progress continuously and handle completion
  useEffect(() => {
    if (ongoingProgram?.id === 'rec_1' && currentRitual) {
      // Calculate completion percentage based on current ritual responses
      const totalRings = RINGS_ARRAY.length;
      const ringResponses = currentRitual.responses?.length || 0;
      const completionPercentage = Math.round((ringResponses / totalRings) * 100);

      // Update progress with current state
      if (ritualCompleted) {
        // When ritual is 100% complete, mark as finished
        updateProgress(100, 'Ritual completo');
        // Note: completeProgram() will be called automatically when user returns to home
        // or on next mount detection
      } else if (ringResponses > 0) {
        // While in progress, update with current percentage
        const currentRing = RINGS_ARRAY[ringResponses - 1];
        updateProgress(completionPercentage, `${currentRing?.displayName || `Anel ${ringResponses}`} Completado`);
      }
    }
  }, [ongoingProgram?.id, currentRitual, ritualCompleted, updateProgress]);

  const aneis: ReinoSessao[] = RINGS_ARRAY.map((ring) => ({
    id: ring.id,
    titulo: ring.titlePt,
    descricao: ring.descriptionPt,
    meta: ring.subtitlePt,
    estado: 'livre',
    detalhe: (
      <>
        <p>
          <strong>A pergunta do dia.</strong> {ring.question}
        </p>
        {ring.impactPhrase && <p className="reino-sessao__nota">{ring.impactPhrase}</p>}
      </>
    ),
  }));

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      <HomeHeader />

      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} onDismiss={dismissOnboarding} />}

      <ReinoChegada
        mood="amanhecer"
        imagem="/images/reino/capa-cinco-aneis.webp"
        foco="center 60%"
        lugar="TRI.04 · As Trilhas · Miyamoto Musashi"
        titulo="Cinco Anéis da Disciplina"
        sobre="Um ritual diário de 2 a 3 minutos para organizar foco, emoção e disciplina: terra, água, fogo, vento e vazio."
        voltar={{ rotulo: 'Voltar para Hoje', onClick: () => navigate('/app') }}
      >
        {ritualCompleted ? (
          <div className="reino-nota" style={{ marginTop: 18, marginBottom: 0 }}>
            <p>
              Ritual de hoje feito.{' '}
              {isGuest ? 'Crie sua conta para continuar a jornada de 30 dias.' : 'Volte amanhã para manter a disciplina.'}
            </p>
          </div>
        ) : (
          <button type="button" className="reino-placa" onClick={() => navigate('/app/rings/ritual')}>
            Começar o ritual de hoje <span aria-hidden="true">→</span>
          </button>
        )}
        {ritualCompleted && isGuest && (
          <button type="button" className="reino-placa" onClick={() => navigate('/register?returnTo=/app/rings')}>
            Criar conta <span aria-hidden="true">→</span>
          </button>
        )}
      </ReinoChegada>

      <div className="reino-pagina">
        {isGuest && (
          <div className="reino-nota">
            <p>
              Como convidado, você experimenta os primeiros 2 dias com os 5 anéis. Os outros 28 dias ficam com a conta.
            </p>
          </div>
        )}

        <div className="reino-filtros" role="tablist" aria-label="Cinco Anéis">
          <button type="button" role="tab" className="reino-filtro" aria-pressed={activeTab === 'ritual'} aria-selected={activeTab === 'ritual'} onClick={() => setActiveTab('ritual')}>
            Ritual de hoje
          </button>
          <button type="button" role="tab" className="reino-filtro" aria-pressed={activeTab === 'history'} aria-selected={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            Minhas sessões
          </button>
        </div>

        {activeTab === 'ritual' ? (
          <>
            <p className="reino-rotulo" style={{ marginTop: 28 }}>
              Os cinco anéis
            </p>
            <ReinoSessoes sessoes={aneis} onEscolher={(id) => navigate(`/app/rings/detail/${id}`)} />

            <ul className="reino-biblioteca" style={{ marginTop: 32 }}>
              <li>
                <button type="button" className="reino-livro" onClick={() => navigate('/app/rings/timeline')}>
                  <span className="reino-livro__titulo">Linha do tempo</span>
                  <span className="reino-livro__sobre">Cada dia de ritual, em ordem.</span>
                  <span className="reino-livro__acao">Abrir →</span>
                </button>
              </li>
              <li>
                <button type="button" className="reino-livro" onClick={() => navigate('/app/rings/progress')}>
                  <span className="reino-livro__titulo">Progresso</span>
                  <span className="reino-livro__sobre">Como cada anel evoluiu com você.</span>
                  <span className="reino-livro__acao">Abrir →</span>
                </button>
              </li>
            </ul>

            {progress && (
              <div className="reino-nota" style={{ marginTop: 32 }}>
                <p>
                  {progress.currentStreak} {progress.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'} de disciplina.
                </p>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: 24 }}>
            <RingsHistory />
          </div>
        )}
      </div>
    </div>
  );
}
