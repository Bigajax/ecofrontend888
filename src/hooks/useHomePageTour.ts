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

export const HOMEPAGE_TOUR_STEPS: TourStep[] = [
  {
    id: 'eco-ai',
    category: 'ECO IA',
    title: 'Uma conversa que muda como você pensa',
    description: 'A Eco ouve, lembra e cresce com você. Ela não responde por script — ela te conhece e evolui a cada conversa.',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'meditations',
    category: 'MEDITAÇÃO',
    title: 'Recondicione seu corpo em 7 minutos',
    description: 'Meditações guiadas do Dr. Joe Dispenza que ensinam seu sistema nervoso a sentir um estado novo — antes que ele aconteça.',
    image: '/images/capa-dr-joe-dispenza.png',
    imagePosition: 'center top',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'stoicism',
    category: 'DIÁRIO ESTOICO',
    title: 'A sabedoria de Marco Aurélio no seu dia',
    description: 'Uma reflexão estoica toda manhã. Para pensar com clareza, decidir com propósito e agir com intenção real.',
    image: '/images/diario-estoico.webp',
    imagePosition: 'center',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'discipline',
    category: 'PROGRAMA',
    title: '5 Anéis da Disciplina',
    description: 'Rituais simples e consistentes que, repetidos, se tornam quem você é. Não apenas o que você faz.',
    image: '/images/five-rings-visual.webp',
    imagePosition: 'center',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'sleep',
    category: 'SONS & SONO',
    title: 'Adormeça sem carregar o dia',
    description: 'Sons ambiente e meditações guiadas para noites mais tranquilas. Seu corpo já sabe o que precisa — o ECO te guia até lá.',
    image: '/images/meditacao-sono-new.webp',
    imagePosition: 'center',
    position: 'center',
    showOverlay: true,
  },
  {
    id: 'cta',
    category: '',
    title: 'Tudo isso está esperando por você.',
    description: 'Sem conta. Sem cartão. Explore o ECO completo agora e sinta a diferença antes de qualquer decisão.',
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
