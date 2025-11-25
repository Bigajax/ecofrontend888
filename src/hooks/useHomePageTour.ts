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
    id: 'intro',
    title: 'Bem-vindo ao Ecotopia!',
    description: 'Sua jornada de bem-estar emocional começa aqui. Vamos te mostrar os principais recursos.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'daily-recommendations',
    title: 'Recomendações Diárias',
    description: 'Conteúdos personalizados para você hoje. Todos os dias novos conteúdos baseados no seu perfil.',
    targetId: 'daily-recommendations-section',
    position: 'bottom',
    showOverlay: true,
  },
  {
    id: 'meditations',
    title: 'Meditações Guiadas',
    description: 'Explore meditações para equilibrar sua energia. Filtre por categoria e escolha a meditação ideal.',
    targetId: 'energy-blessings-section',
    position: 'bottom',
    showOverlay: true,
  },
  {
    id: 'eco-ai',
    title: 'ECO AI - Orientação Individual',
    description: 'Converse a qualquer momento com a ECO. IA treinada para entender suas emoções.',
    targetId: 'eco-ai-guidance',
    position: 'top',
    showOverlay: true,
  },
  {
    id: 'learn-explore',
    title: 'Aprenda e Explore',
    description: 'Artigos e conteúdos sobre bem-estar mental. Conhecimento para transformar sua vida.',
    targetId: 'learn-explore-section',
    position: 'top',
    showOverlay: true,
  },
  {
    id: 'complete',
    title: 'Explore e aproveite sua jornada!',
    description: 'Você está pronto para começar! Que tal conversar com a ECO agora?',
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
