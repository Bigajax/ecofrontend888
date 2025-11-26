// src/hooks/useHomePageTour.ts
import { useState, useCallback, useEffect } from 'react';

const TOUR_SEEN_KEY = 'eco.homepage.tour.seen.v1';
const TOUR_STEP_KEY = 'eco.homepage.tour.step';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetId?: string; // ID do elemento para destacar
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  showOverlay?: boolean;
}

export const HOMEPAGE_TOUR_STEPS: TourStep[] = [
  {
    id: 'promise',
    title: '❇️ Criamos sua nova realidade interior',
    description: 'Bem-vindo à Ecotopia. Um espaço para você transformar sua energia, mente e presença.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'why',
    title: 'Você não precisa viver no automático',
    description: 'A Ecotopia te ajuda a criar consciência, calma e direção — todos os dias.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'meditations',
    title: '🧘🏻‍♂️ Meditações que transformam energia',
    description: 'Inspiradas no Dr. Joe Dispenza para reprogramar padrões e elevar seu estado interior.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'stoicism',
    title: '📘 Reflexões Estoicas',
    description: 'Reflexões diárias para você pensar melhor, decidir melhor e viver com mais propósito.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'discipline',
    title: '🌀 Disciplina com Significado',
    description: 'Os 5 Anéis da Disciplina. Hábitos pequenos, consistentes e espirituais para criar ordem interna e força de ação.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'eco-ai',
    title: '🤖 Eco IA — seu guia interior',
    description: 'Uma inteligência emocional que te ajuda a refletir, entender e criar uma nova realidade.',
    position: 'center',
    showOverlay: true,
  },
];

export function useHomePageTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  // Check if user has seen the tour
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    const savedStep = localStorage.getItem(TOUR_STEP_KEY);

    setHasSeenTour(!!seen);

    // Resume tour if it was in progress
    if (!seen && savedStep) {
      const step = parseInt(savedStep, 10);
      if (step > 0 && step < HOMEPAGE_TOUR_STEPS.length) {
        setCurrentStep(step);
      }
    }
  }, []);

  const startTour = useCallback(() => {
    // Don't start if already seen
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (seen) {
      setIsActive(false);
      return;
    }
    setIsActive(true);
    setCurrentStep(0);
    localStorage.removeItem(TOUR_STEP_KEY);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < HOMEPAGE_TOUR_STEPS.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      localStorage.setItem(TOUR_STEP_KEY, nextStepIndex.toString());
    } else {
      // Tour complete
      completeTour();
    }
  }, [currentStep]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      localStorage.setItem(TOUR_STEP_KEY, prevStepIndex.toString());
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    localStorage.removeItem(TOUR_STEP_KEY);
    setHasSeenTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    localStorage.removeItem(TOUR_STEP_KEY);
    setHasSeenTour(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_SEEN_KEY);
    localStorage.removeItem(TOUR_STEP_KEY);
    setHasSeenTour(false);
    setCurrentStep(0);
  }, []);

  const step = HOMEPAGE_TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === HOMEPAGE_TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / HOMEPAGE_TOUR_STEPS.length) * 100;

  return {
    isActive,
    currentStep,
    step,
    isFirstStep,
    isLastStep,
    progress,
    hasSeenTour,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    resetTour,
  };
}
