// src/components/HomePageTour.tsx
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles, Check, Lock, Zap, Heart } from 'lucide-react';
import { useHomePageTour } from '@/hooks/useHomePageTour';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import mixpanel from '@/lib/mixpanel';

interface HomePageTourProps {
  onClose: () => void;
  reason?: string | null;
  nextPath?: string;
  onBeforeNavigate?: () => void;
  forceStart?: boolean; // Force tour to start even if already seen
}

export default function HomePageTour({ onClose, reason, nextPath, onBeforeNavigate, forceStart }: HomePageTourProps) {
  const navigate = useNavigate();
  const {
    isActive,
    step,
    isFirstStep,
    isLastStep,
    progress,
    nextStep,
    previousStep,
    skipTour: skipTourInternal,
    completeTour: completeTourInternal,
    startTour,
    resetTour,
    currentStep,
  } = useHomePageTour();

  // Track tour opened and start (only once on mount)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Front-end: Tour Aberto', {
        entry: window.location.href,
        reason,
      });
    }
    // If forceStart, reset the tour first to clear "seen" flag
    if (forceStart) {
      resetTour();
    }
    // Start tour only on mount, not on every render
    startTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  // Track step changes
  useEffect(() => {
    if (isActive) {
      mixpanel.track('Front-end: Tour Slide', {
        index: currentStep,
        id: step?.id,
        title: step?.title,
      });
    }
  }, [currentStep, step?.id, step?.title, isActive]);

  const skipTour = useCallback(() => {
    mixpanel.track('Front-end: Tour Fechado', { step: step?.id });
    skipTourInternal();
    onClose();
  }, [skipTourInternal, onClose, step?.id]);

  const handleComplete = useCallback(() => {
    mixpanel.track('Front-end: Tour Concluído');
    completeTourInternal();

    try {
      onBeforeNavigate?.();
    } catch (error) {
      console.error('[HomePageTour] Error in onBeforeNavigate:', error);
    }

    // Always default to /app for guest flow, even if nextPath is /
    const targetPath = (nextPath && nextPath !== '/') ? nextPath : '/app';

    if (typeof navigate === 'function') {
      navigate(targetPath, { replace: true });
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.assign(targetPath);
    }
  }, [completeTourInternal, navigate, nextPath, onBeforeNavigate]);

  const handleStartChat = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  // Handle Escape key
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skipTour();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skipTour]);

  if (!isActive) return null;

  // All steps are centered modals in this tour
  const modalContent = (
    <div
      className="fixed inset-0 z-50"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e3f5ff 100%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Tour inicial"
    >
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Overlay - mais suave */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-[#6EC8FF]/10 to-[#5AB8E5]/5 backdrop-blur-[2px]"
            onClick={skipTour}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{
              type: 'spring',
              duration: 0.6,
              bounce: 0.3
            }}
            className="relative max-w-md w-full bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.12)] p-10 text-center border border-white/50"
          >
            {/* Close button - mais discreto */}
            <button
              onClick={skipTour}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100/80 transition-colors opacity-40 hover:opacity-100"
            >
              <X size={18} className="text-gray-600" />
            </button>

            {/* Avatar - maior e mais presente */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#E3F5FF] to-[#D0EDFF] shadow-xl ring-4 ring-white/50">
                <EcoBubbleOneEye variant="icon" size={56} />
              </div>
            </motion.div>

            {/* Title - mais espaçado e elegante */}
            <motion.h2
              className="font-display text-3xl font-bold text-gray-900 mb-5 leading-tight px-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.title}
            </motion.h2>

            {/* Description - Minimalista e direto */}
            <motion.p
              className="text-gray-600 text-lg leading-relaxed mb-10 max-w-sm mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {step.description}
            </motion.p>

            {/* Actions */}
            {isLastStep ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-500 mb-2 text-center">
                  👇 Comece agora
                </p>
                <button
                  onClick={handleComplete}
                  className="w-full bg-gradient-to-r from-[#6EC8FF] to-[#5AB8E5] text-white font-semibold py-4 px-8 rounded-2xl hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Criar minha nova realidade
                </button>
                <button
                  onClick={skipTour}
                  className="w-full text-gray-500 font-normal py-2 hover:text-gray-700 transition-colors text-sm"
                >
                  Talvez depois
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={skipTour}
                  className="flex-1 bg-white border border-gray-200 text-gray-600 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Pular
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-[#6EC8FF] to-[#5AB8E5] text-white font-medium py-3 px-6 rounded-xl hover:shadow-md transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {isFirstStep ? 'Descobrir' : 'Continuar'}
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* Progress bar - mais elegante */}
            {!isLastStep && (
              <div className="mt-8">
                <div className="flex gap-1.5 justify-center mb-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i <= currentStep
                          ? 'w-8 bg-gradient-to-r from-[#6EC8FF] to-[#5AB8E5]'
                          : 'w-1.5 bg-gray-200'
                      }`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-light">
                  {currentStep + 1} de 6
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
