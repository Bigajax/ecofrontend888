import ProximoCaminho from '@/components/reino/ProximoCaminho';
import { registrarPratica } from '@/utils/caminhoReino';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgram } from '@/contexts/ProgramContext';
import { useAuth } from '@/contexts/AuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import ReinoChegada from '@/components/reino/ReinoChegada';
import RiquezaMentalStep1 from '@/components/programs/steps/RiquezaMentalStep1';
import RiquezaMentalStep2 from '@/components/programs/steps/RiquezaMentalStep2';
import RiquezaMentalStep3 from '@/components/programs/steps/RiquezaMentalStep3';
import RiquezaMentalStep4 from '@/components/programs/steps/RiquezaMentalStep4';
import RiquezaMentalStep5 from '@/components/programs/steps/RiquezaMentalStep5';
import RiquezaMentalStep6 from '@/components/programs/steps/RiquezaMentalStep6';
import RiquezaMentalHistory from '@/components/programs/RiquezaMentalHistory';
import toast from 'react-hot-toast';
import * as programsApi from '@/api/programsApi';

interface StepAnswers {
  [key: string]: string | string[];
}

const TOTAL_STEPS = 6;

// Inverso do percentual que o próprio programa grava (passo k => (k+1)/6).
// O currentStep do backend é arredondado para baixo e não serve para voltar ao passo certo.
function stepFromProgress(progress: number): number {
  const step = Math.round((progress / 100) * TOTAL_STEPS) - 1;
  return Math.min(TOTAL_STEPS - 1, Math.max(0, step));
}

export default function RiquezaMentalProgram() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ongoingProgram, updateProgress, completeProgram } = useProgram();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<StepAnswers>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'program' | 'history'>('program');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const lastReportedProgressRef = useRef<{ progress: number; lesson: string } | null>(null);
  // Enquanto o passo salvo não volta, nada de relatar progresso: o passo 0 do mount
  // sobrescrevia o progresso guardado (e o backend) antes da retomada.
  const [stepRestored, setStepRestored] = useState(false);
  const [concluiuAgora, setConcluiuAgora] = useState(false);

  // Retomada local (vale para visitante também): o passo sai do progresso já salvo.
  useEffect(() => {
    if (stepRestored || ongoingProgram?.id !== 'rec_2') return;
    setCurrentStep(stepFromProgress(ongoingProgram.progress));
    setStepRestored(true);
  }, [stepRestored, ongoingProgram?.id, ongoingProgram?.progress]);

  // Load progress from backend on mount (if authenticated)
  useEffect(() => {
    async function loadProgressFromBackend() {
      if (!user || !ongoingProgram?.enrollmentId) return;

      try {
        const data = await programsApi.getEnrollment(ongoingProgram.enrollmentId);

        // Restore progress (pelo percentual; o currentStep do backend perde o passo)
        setCurrentStep(
          typeof data.progress === 'number' ? stepFromProgress(data.progress) : data.currentStep
        );

        // Restore answers (convert from object with numeric keys to StepAnswers)
        if (data.answers && Object.keys(data.answers).length > 0) {
          const restoredAnswers: StepAnswers = {};
          Object.entries(data.answers).forEach(([stepNum, stepAnswers]) => {
            Object.assign(restoredAnswers, stepAnswers);
          });
          setAnswers(restoredAnswers);
        }
      } catch (error) {
        console.error('Erro ao carregar progresso do backend:', error);
        // Continue with local state
      }
    }

    loadProgressFromBackend();
  }, [user, ongoingProgram?.enrollmentId]);

  // Auto-save answers to backend (debounced)
  useEffect(() => {
    if (!user || !ongoingProgram?.enrollmentId) return;
    if (Object.keys(answers).length === 0) return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');

      try {
        await programsApi.saveAnswers(ongoingProgram.enrollmentId!, {
          stepNumber: currentStep + 1,
          answers: answers,
        });

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Erro ao salvar respostas:', error);
        setSaveStatus('idle');
      }
    }, 2000); // Save 2s after last edit

    return () => clearTimeout(timer);
  }, [answers, currentStep, user, ongoingProgram?.enrollmentId]);

  // Confirmação antes de sair
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStep > 0 && currentStep < TOTAL_STEPS - 1) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep]);

  useEffect(() => {
    if (ongoingProgram?.id !== 'rec_2' || !stepRestored) return;

    const progressPercentage = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);
    const stepName = [
      'Onde você está',
      'O que você quer',
      'O que te puxa',
      'Frase nova',
      'Próximos 7 dias',
      'Conclusão'
    ][currentStep];

    const lessonLabel = `${stepName} — ${currentStep + 1}/${TOTAL_STEPS}`;
    const last = lastReportedProgressRef.current;

    if (last?.progress === progressPercentage && last.lesson === lessonLabel) {
      return;
    }

    lastReportedProgressRef.current = { progress: progressPercentage, lesson: lessonLabel };
    updateProgress(progressPercentage, lessonLabel);
  }, [currentStep, ongoingProgram?.id, stepRestored, updateProgress]);

  const handleAnswerChange = (key: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!answers.step1?.trim()) {
          toast.error('Por favor, escreva sua resposta antes de continuar.');
          return false;
        }
        if (answers.step1.trim().length < 10) {
          toast.error('Tente desenvolver um pouco mais sua resposta.');
          return false;
        }
        return true;

      case 1:
        if (!answers.step2?.trim()) {
          toast.error('Por favor, descreva como seria sua vida financeira ideal.');
          return false;
        }
        if (answers.step2.trim().length < 15) {
          toast.error('Tente ser mais específico sobre o que você deseja.');
          return false;
        }
        return true;

      case 2:
        if (!answers.step3_fear?.trim() && !answers.step3_belief?.trim()) {
          toast.error('Por favor, preencha pelo menos um dos campos.');
          return false;
        }
        return true;

      case 3:
        if (!answers.step4?.trim()) {
          toast.error('Por favor, crie sua afirmação consciente.');
          return false;
        }
        if (answers.step4.trim().length < 20) {
          toast.error('Tente criar uma afirmação mais completa, ligando emoção, escolha e ação.');
          return false;
        }
        return true;

      case 4:
        if (!answers.step5_commitment?.trim()) {
          toast.error('Por favor, escreva seu compromisso concreto para os próximos 7 dias.');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < TOTAL_STEPS - 1) {
      registrarPratica(user?.id, 'riqueza');
      setCurrentStep(currentStep + 1);
      // Scroll removido - mantém posição da tela
    }
  };

  const handleBack = () => {
    if (currentStep > 0 && currentStep < TOTAL_STEPS - 1) {
      setShowExitModal(true);
    } else {
      navigate('/app');
    }
  };

  const handleConfirmExit = () => {
    navigate('/app');
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Update to 100% completion
      await updateProgress(100, 'Sessão concluída');

      // Complete program (clears local state and marks as complete in backend)
      await completeProgram();

      // Show success message
      toast.success('Sessão concluída. Ela fica guardada em Minhas sessões.', { duration: 4000 });
      registrarPratica(user?.id, 'riqueza');
      setConcluiuAgora(true);

      // Switch to history tab to show the completed session
      setActiveTab('history');

      // Force refresh of history to show newly completed session
      setHistoryRefreshTrigger(prev => prev + 1);

      // Reset to step 0 for next session
      setCurrentStep(0);
      setAnswers({});
      setIsCompleting(false);
    } catch (error) {
      console.error('Erro ao concluir:', error);
      toast.error('Erro ao concluir programa');
      setIsCompleting(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      answers,
      onAnswerChange: handleAnswerChange,
    };

    switch (currentStep) {
      case 0:
        return <RiquezaMentalStep1 {...stepProps} />;
      case 1:
        return <RiquezaMentalStep2 {...stepProps} />;
      case 2:
        return <RiquezaMentalStep3 {...stepProps} />;
      case 3:
        return <RiquezaMentalStep4 {...stepProps} />;
      case 4:
        return <RiquezaMentalStep5 {...stepProps} />;
      case 5:
        return <RiquezaMentalStep6 {...stepProps} />;
      default:
        return null;
    }
  };

  const salvo =
    user && ongoingProgram?.enrollmentId ? (
      <span className="reino-sono__contagem" role="status">
        {saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'saved' ? 'Salvo' : ''}
      </span>
    ) : !user ? (
      <button type="button" className="reino-chegada__voltar" onClick={() => navigate('/register')}>
        Criar conta grátis
      </button>
    ) : undefined;

  return (
    <div className="reino-corpo page-with-nav" style={{ minHeight: '100dvh' }}>
      {user && <HomeHeader />}

      <ReinoChegada
        mood="entardecer"
        imagem="/images/reino/capa-quem-pensa.webp"
        foco="center 65%"
        lugar="TRI.04 · As Trilhas · 6 passos"
        titulo="Quem Pensa Enriquece"
        sobre="Transforme seu mindset financeiro, um passo de cada vez, com calma e por escrito."
        voltar={{ rotulo: 'Voltar', onClick: handleBack }}
        extra={salvo}
        progresso={
          activeTab === 'program'
            ? { valor: (currentStep + 1) / TOTAL_STEPS, legenda: `Passo ${currentStep + 1} de ${TOTAL_STEPS}` }
            : undefined
        }
      />

      {showExitModal && (
        <div className="reino-drjoe__ciclo" role="dialog" aria-modal="true" aria-labelledby="riqueza-sair">
          <div className="reino-drjoe__ciclo-caixa">
            <h2 id="riqueza-sair" className="reino-corpo__titulo" style={{ color: '#1c2350', fontSize: 26 }}>
              Deseja sair da sessão?
            </h2>
            <p className="reino-corpo__sobre" style={{ color: '#4b5070' }}>
              {user && ongoingProgram?.enrollmentId
                ? 'Suas respostas foram salvas. Você pode retomar de onde parou a qualquer momento.'
                : 'Seu progresso não será salvo. Na próxima vez, você recomeça do início.'}
            </p>
            <div className="reino-player-aviso__acoes" style={{ padding: 0, background: 'transparent' }}>
              <button type="button" className="reino-placa" onClick={() => setShowExitModal(false)}>
                Continuar a sessão
              </button>
              <button type="button" className="reino-chegada__voltar" onClick={handleConfirmExit}>
                {user && ongoingProgram?.enrollmentId ? 'Sair' : 'Sair mesmo assim'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="reino-pagina">
        <div className="reino-filtros" role="tablist" aria-label="Quem Pensa Enriquece">
          <button
            type="button"
            role="tab"
            className="reino-filtro"
            aria-pressed={activeTab === 'program'}
            aria-selected={activeTab === 'program'}
            onClick={() => setActiveTab('program')}
          >
            Programa
          </button>
          <button
            type="button"
            role="tab"
            className="reino-filtro"
            aria-pressed={activeTab === 'history'}
            aria-selected={activeTab === 'history'}
            onClick={() => {
              setActiveTab('history');
              setHistoryRefreshTrigger((prev) => prev + 1);
            }}
          >
            Minhas sessões
          </button>
        </div>

        {activeTab === 'program' ? (
          <>
            <div style={{ margin: '24px 0 32px' }}>{renderStep()}</div>
            <button
              type="button"
              className="reino-placa"
              onClick={currentStep === TOTAL_STEPS - 1 ? handleComplete : handleNext}
              disabled={isCompleting}
            >
              {isCompleting ? 'Concluindo…' : currentStep === TOTAL_STEPS - 1 ? 'Concluir a sessão' : 'Próximo passo'}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : (
          <div style={{ marginTop: 24 }}>
            {/* Logo depois de concluir: o próximo caminho antes do histórico */}
            {concluiuAgora && <ProximoCaminho atual="riqueza" />}
            <RiquezaMentalHistory currentEnrollmentId={ongoingProgram?.enrollmentId} refreshTrigger={historyRefreshTrigger} />
          </div>
        )}
      </main>
    </div>
  );
}
