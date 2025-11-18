import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgram } from '@/contexts/ProgramContext';
import RiquezaMentalHeader from '@/components/programs/RiquezaMentalHeader';
import RiquezaMentalProgressBar from '@/components/programs/RiquezaMentalProgressBar';
import RiquezaMentalStep1 from '@/components/programs/steps/RiquezaMentalStep1';
import RiquezaMentalStep2 from '@/components/programs/steps/RiquezaMentalStep2';
import RiquezaMentalStep3 from '@/components/programs/steps/RiquezaMentalStep3';
import RiquezaMentalStep4 from '@/components/programs/steps/RiquezaMentalStep4';
import RiquezaMentalStep5 from '@/components/programs/steps/RiquezaMentalStep5';
import RiquezaMentalStep6 from '@/components/programs/steps/RiquezaMentalStep6';

interface StepAnswers {
  [key: string]: string | string[];
}

export default function RiquezaMentalProgram() {
  const navigate = useNavigate();
  const { ongoingProgram, updateProgress } = useProgram();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<StepAnswers>({});
  const [isCompleting, setIsCompleting] = useState(false);

  const TOTAL_STEPS = 6;

  useEffect(() => {
    // Update progress in real-time
    if (ongoingProgram?.id === 'rec_2') {
      const progressPercentage = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);
      const stepName = [
        'Onde você está',
        'O que você quer',
        'O que te puxa',
        'Frase nova',
        'Próximos 7 dias',
        'Conclusão'
      ][currentStep];
      updateProgress(progressPercentage, `${stepName} — ${currentStep + 1}/${TOTAL_STEPS}`);
    }
  }, [currentStep, ongoingProgram?.id, updateProgress]);

  const handleAnswerChange = (key: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Update to 100% completion
      updateProgress(100, 'Sessão concluída! 🎉');
      // Navigate back after a brief delay
      setTimeout(() => {
        navigate('/app');
      }, 1500);
    } catch (error) {
      console.error('Erro ao concluir:', error);
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
    <div className="min-h-screen bg-[#F8F6F3] font-primary">
      {/* Header */}
      <RiquezaMentalHeader
        onBack={() => navigate('/app')}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
        {/* Progress Bar */}
        <div className="mb-12">
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
            className="rounded-2xl bg-black px-8 py-3 font-medium text-white transition-all duration-300 hover:bg-gray-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompleting ? 'Concluindo...' : currentStep === TOTAL_STEPS - 1 ? 'Concluir sessão' : 'Próximo →'}
          </button>
        </div>
      </main>
    </div>
  );
}
