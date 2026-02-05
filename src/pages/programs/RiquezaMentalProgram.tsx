import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { useProgram } from '@/contexts/ProgramContext';
import { useAuth } from '@/contexts/AuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import RiquezaMentalProgressBar from '@/components/programs/RiquezaMentalProgressBar';
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
  const lastReportedProgressRef = useRef<{ progress: number; lesson: string } | null>(null);

  const TOTAL_STEPS = 6;

  // Load progress from backend on mount (if authenticated)
  useEffect(() => {
    async function loadProgressFromBackend() {
      if (!user || !ongoingProgram?.enrollmentId) return;

      try {
        const data = await programsApi.getEnrollment(ongoingProgram.enrollmentId);

        // Restore progress
        setCurrentStep(data.currentStep);

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
    if (ongoingProgram?.id !== 'rec_2') return;

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
  }, [currentStep, ongoingProgram?.id, updateProgress]);

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
      await updateProgress(100, 'Sessão concluída! 🎉');

      // Complete program (clears local state and marks as complete in backend)
      await completeProgram();

      // Show success message
      toast.success('Programa concluído com sucesso! 🎉');

      // Navigate back after a brief delay
      setTimeout(() => {
        navigate('/app');
      }, 1500);
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

  return (
    <div className="min-h-screen bg-eco-bg font-primary">
      {/* Header - apenas se usuário logado */}
      {user && <HomeHeader />}

      {/* Navegação */}
      <div className="w-full px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          {/* Left side: Botão Voltar + Save Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center w-10 h-10 text-eco-text
                         glass-shell rounded-full hover:bg-eco-accent/10
                         transition-all duration-300 shadow-minimal hover:shadow-eco"
              aria-label="Voltar"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Save Status Indicator (only for authenticated users) */}
            {user && ongoingProgram?.enrollmentId && (
              <div className="flex items-center gap-2 text-xs text-eco-muted">
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check size={14} className="text-eco-accent" />
                    <span className="text-eco-accent">Salvo</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CTA para guest */}
          {!user && (
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold
                         text-white bg-eco-baby rounded-full hover:bg-eco-baby/90
                         hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Criar conta grátis
            </button>
          )}
        </div>
      </div>

      {/* Título e Subtítulo */}
      <div className="w-full px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-eco-text mb-2">
            QUEM PENSA ENRIQUECE
          </h1>
          <p className="font-primary text-sm md:text-base lg:text-lg font-medium tracking-wider text-eco-muted">
            TRANSFORME SEU MINDSET FINANCEIRO
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full px-4 pt-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="glass-shell rounded-2xl p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('program')}
              className={`px-6 py-2.5 rounded-xl font-primary font-medium text-sm transition-all duration-200 ${
                activeTab === 'program'
                  ? 'bg-eco-baby text-white shadow-minimal'
                  : 'text-eco-muted hover:text-eco-text hover:bg-eco-accent/5'
              }`}
            >
              Programa
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl font-primary font-medium text-sm transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-eco-baby text-white shadow-minimal'
                  : 'text-eco-muted hover:text-eco-text hover:bg-eco-accent/5'
              }`}
            >
              Minhas Sessões
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Saída */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-shell rounded-3xl p-8 max-w-md w-full shadow-eco">
            <h3 className="font-display text-2xl text-eco-text mb-4 font-medium">
              Deseja sair da sessão?
            </h3>
            <p className="font-primary text-eco-muted mb-6 leading-relaxed">
              {user && ongoingProgram?.enrollmentId
                ? 'Suas respostas foram salvas automaticamente. Você pode retomar de onde parou a qualquer momento.'
                : 'Seu progresso não será salvo. Você precisará recomeçar do início na próxima vez.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 px-4 py-3 glass-shell text-eco-text rounded-xl font-primary font-medium
                         hover:bg-eco-accent/5 transition-all duration-200"
              >
                Continuar sessão
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 px-4 py-3 bg-eco-baby text-white rounded-xl font-primary font-medium
                         hover:bg-eco-baby/90 transition-all duration-200 active:scale-95"
              >
                {user && ongoingProgram?.enrollmentId ? 'Sair' : 'Sair mesmo assim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-4 md:px-8 md:py-8">
        {activeTab === 'program' ? (
          <>
            {/* Progress Bar */}
            <div className="mb-8">
              <RiquezaMentalProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>

            {/* Step Content */}
            <div className="mb-8">
              {renderStep()}
            </div>

            {/* Navigation Button */}
            <div className="flex justify-center">
              <button
                onClick={currentStep === TOTAL_STEPS - 1 ? handleComplete : handleNext}
                disabled={isCompleting}
                className="rounded-2xl bg-eco-baby px-8 py-3 font-primary font-semibold text-white
                         transition-all duration-200 hover:bg-eco-baby/90 hover:shadow-eco
                         active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-minimal"
              >
                {isCompleting ? 'Concluindo...' : currentStep === TOTAL_STEPS - 1 ? 'Concluir sessão' : 'Próximo →'}
              </button>
            </div>
          </>
        ) : (
          /* History Tab */
          <RiquezaMentalHistory currentEnrollmentId={ongoingProgram?.enrollmentId} />
        )}
      </main>
    </div>
  );
}
