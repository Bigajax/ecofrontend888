// src/components/HomePageTour.tsx
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import { useHomePageTour } from '@/hooks/useHomePageTour';
import EcoBubbleOneEye from './EcoBubbleOneEye';

interface HomePageTourProps {
  onComplete?: () => void;
  onStartChat?: () => void;
}

export default function HomePageTour({ onComplete, onStartChat }: HomePageTourProps) {
  const {
    isActive,
    step,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
  } = useHomePageTour();

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !step.targetId) {
      setTargetElement(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    setTargetElement(element);

    if (element) {
      // Scroll element into view smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let top = rect.top + scrollTop;
      let left = rect.left + scrollLeft;

      // Adjust position based on step.position
      switch (step.position) {
        case 'bottom':
          top = rect.bottom + scrollTop + 20;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'top':
          top = rect.top + scrollTop - 20;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.left + scrollLeft - 20;
          break;
        case 'right':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.right + scrollLeft + 20;
          break;
      }

      setTooltipPosition({ top, left });
    }
  }, [isActive, step]);

  const handleComplete = useCallback(() => {
    completeTour();
    onComplete?.();
  }, [completeTour, onComplete]);

  const handleStartChat = useCallback(() => {
    completeTour();
    onStartChat?.();
  }, [completeTour, onStartChat]);

  if (!isActive) return null;

  // Center modal for intro and complete steps
  if (step.position === 'center') {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={skipTour}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
          >
            {/* Close button */}
            <button
              onClick={skipTour}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E3F5FF] shadow-lg">
                <EcoBubbleOneEye variant="icon" size={48} />
              </div>
            </div>

            {/* Title */}
            <h2 className="font-display text-3xl font-bold text-gray-800 mb-4">
              {step.title}
            </h2>

            {/* Description */}
            {isFirstStep ? (
              <div className="text-left mb-8 space-y-3">
                <p className="text-gray-600 text-center mb-6">
                  Sua jornada de bem-estar emocional começa aqui
                </p>
                <p className="text-gray-700 font-medium mb-3">Vamos te mostrar:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[#6EC8FF]" />
                    <span className="text-gray-700">Meditações guiadas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[#6EC8FF]" />
                    <span className="text-gray-700">Conversas com IA emocional</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[#6EC8FF]" />
                    <span className="text-gray-700">Acompanhamento de progresso</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[#6EC8FF]" />
                    <span className="text-gray-700">Conteúdos personalizados</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-8">
                {step.description}
              </p>
            )}

            {/* Actions */}
            {isLastStep ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleStartChat}
                  className="w-full bg-[#6EC8FF] text-white font-medium py-3 px-6 rounded-xl hover:bg-[#5AB8E5] transition-colors shadow-md"
                >
                  Começar conversa com ECO
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Explorar livremente
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={skipTour}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 bg-[#6EC8FF] text-white font-medium py-3 px-6 rounded-xl hover:bg-[#5AB8E5] transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {isFirstStep ? 'Começar Tour' : 'Próximo'}
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* Progress bar */}
            {!isLastStep && (
              <div className="mt-6">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#6EC8FF]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Passo {step.id === 'intro' ? 1 : Math.min(progress / (100 / 6), 6)} de 6
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Tooltip for specific elements
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Overlay with spotlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={skipTour}
        >
          {/* Spotlight cutout (simulated with shadow) */}
          {targetElement && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: targetElement.getBoundingClientRect().top - 8,
                left: targetElement.getBoundingClientRect().left - 8,
                width: targetElement.getBoundingClientRect().width + 16,
                height: targetElement.getBoundingClientRect().height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                borderRadius: '1rem',
              }}
            />
          )}
        </motion.div>

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="absolute pointer-events-auto"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: step.position === 'bottom' || step.position === 'top' ? 'translateX(-50%)' : 'none',
            maxWidth: '90vw',
            width: '400px',
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            {/* Close button */}
            <button
              onClick={skipTour}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={16} className="text-gray-600" />
            </button>

            {/* Content */}
            <h3 className="font-display text-xl font-bold text-gray-800 mb-2 pr-6">
              {step.title}
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              {!isFirstStep && (
                <button
                  onClick={previousStep}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
              )}

              <div className="flex-1 flex gap-2">
                <button
                  onClick={skipTour}
                  className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 bg-[#6EC8FF] text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-[#5AB8E5] transition-colors flex items-center justify-center gap-1"
                >
                  Próximo
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= (progress / (100 / 6)) ? 'bg-[#6EC8FF]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
