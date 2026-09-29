// src/hooks/useHomePageTour.ts
import { useState, useCallback, useEffect } from 'react';

const TOUR_SEEN_KEY = 'eco.homepage.tour.seen.v1';
const TOUR_STEP_KEY = 'eco.homepage.tour.step';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  category?: string;
  image?: string;         // path to background image
  imagePosition?: string; // CSS object-position (default: 'center')
  isCta?: boolean;        // marks the final CTA slide (no image, enter guest mode)
  targetId?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  showOverlay?: boolean;
}

// Um lugar do reino por passo, com a pintura dele (set/2026).
export const HOMEPAGE_TOUR_STEPS: TourStep[] = [
  {
    id: 'eco-ai',
    category: 'Casa da Eco',
    title: 'Uma conversa para organizar a cabeça',
    description: 'Fale ou escreva. A Eco escuta sem julgar e lembra do que vocês já conversaram.',
    image: '/images/reino/casa.webp',
    imagePosition: '15% 50%',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'meditations',
    category: 'As Trilhas',
    title: 'Meditações curtas e guiadas',
    description: 'De 4 a 15 minutos, em português. Dá para começar do zero.',
    image: '/images/reino/trilhas.webp',
    imagePosition: '70% 50%',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'stoicism',
    category: 'O Pórtico',
    title: 'Uma reflexão por manhã',
    description: 'Uma página do Diário Estoico por dia, de Marco Aurélio, Sêneca e Epicteto.',
    image: '/images/reino/portico.webp',
    imagePosition: '85% 50%',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'discipline',
    category: 'As Trilhas',
    title: '5 Anéis da Disciplina',
    description: 'Cinco perguntas por dia. A Eco mostra os padrões ao longo das semanas.',
    image: '/images/reino/capa-cinco-aneis.webp',
    imagePosition: 'center',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'sleep',
    category: 'Vale do Sono',
    title: 'Para a mente desligar à noite',
    description: 'Sete noites guiadas, meditações e sons para dormir.',
    image: '/images/reino/vale.webp',
    imagePosition: '45% 50%',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'cta',
    category: '',
    title: 'Entre e dê uma volta.',
    description: 'Sem conta e sem cartão. Você conhece um pouco de cada lugar antes de decidir.',
    isCta: true,
    position: 'center',
    showOverlay: true,
  },
];

export function useHomePageTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    const savedStep = localStorage.getItem(TOUR_STEP_KEY);

    setHasSeenTour(!!seen);

    if (!seen && savedStep) {
      const step = parseInt(savedStep, 10);
      if (step > 0 && step < HOMEPAGE_TOUR_STEPS.length) {
        setCurrentStep(step);
      }
    }
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    localStorage.removeItem(TOUR_STEP_KEY);
    setHasSeenTour(true);
  }, []);

  const startTour = useCallback(() => {
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
      completeTour();
    }
  }, [currentStep, completeTour]);

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
