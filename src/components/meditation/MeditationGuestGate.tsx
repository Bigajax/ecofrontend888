/**
 * MeditationGuestGate Component
 *
 * Overlay que aparece após 2 minutos de meditação para guests,
 * incentivando conversão para continuar a prática completa.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import mixpanel from '@/lib/mixpanel';

interface MeditationGuestGateProps {
  open: boolean;
  meditationTitle: string;
  meditationId: string;
  currentTime: number; // Tempo atual em segundos
  totalDuration: number; // Duração total em segundos
  onClose?: () => void; // Para voltar à biblioteca
}

/**
 * Formata segundos para MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MeditationGuestGate({
  open,
  meditationTitle,
  meditationId,
  currentTime,
  totalDuration,
  onClose,
}: MeditationGuestGateProps) {
  const navigate = useNavigate();

  const handleContinueMeditating = () => {
    // Track click
    mixpanel.track('Guest Meditation Gate: Continue Clicked', {
      meditation_id: meditationId,
      meditation_title: meditationTitle,
      time_listened_seconds: currentTime,
      total_duration_seconds: totalDuration,
    });

    // Navigate to signup
    navigate('/register?returnTo=/app/energy-blessings');
  };

  const handleBack = () => {
    // Track dismiss
    mixpanel.track('Guest Meditation Gate: Back Clicked', {
      meditation_id: meditationId,
      time_listened_seconds: currentTime,
    });

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meditation-gate-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-white/95 to-white/90
                       backdrop-blur-xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-eco-user to-eco-accent
                            flex items-center justify-center shadow-lg">
                <span className="text-4xl">🧘</span>
              </div>
            </div>

            {/* Title */}
            <h2
              id="meditation-gate-title"
              className="text-2xl sm:text-3xl font-display font-normal text-eco-text leading-tight mb-4"
            >
              Sua prática está florescendo
            </h2>

            {/* Message */}
            <p className="text-base font-primary text-eco-text/80 leading-relaxed mb-6">
              Continue esta meditação completa criando sua conta. As práticas completas aguardam você.
            </p>

            {/* Progress Preview */}
            <div className="bg-eco-surface/50 rounded-xl p-4 mb-6 border border-eco-line">
              <p className="text-sm font-primary text-eco-muted mb-2">Progresso</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-primary text-eco-text">{formatTime(currentTime)} ouvidos</span>
                <span className="text-xs font-primary text-eco-text">de {formatTime(totalDuration)}</span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-2 bg-eco-line rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-eco-user to-eco-accent rounded-full"
                />
              </div>
            </div>

            {/* Preserved Data Badge */}
            <div className="flex justify-center gap-2 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                            bg-eco-surface border border-eco-line text-sm font-primary text-eco-text/70">
                <span>🧘</span>
                <span>Meditações completas</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                            bg-eco-surface border border-eco-line text-sm font-primary text-eco-text/70">
                <span>📊</span>
                <span>Progresso salvo</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              {/* Primary CTA */}
              <button
                onClick={handleContinueMeditating}
                className="w-full bg-gradient-to-r from-eco-user to-eco-accent text-white px-6 py-4
                           rounded-xl font-primary font-semibold text-base
                           hover:shadow-xl hover:-translate-y-0.5
                           active:translate-y-0 transition-all duration-300"
              >
                Continuar meditando
              </button>

              {/* Secondary CTA */}
              <button
                onClick={handleBack}
                className="w-full border border-eco-line bg-white/60 backdrop-blur-sm
                           text-eco-text px-6 py-3 rounded-xl font-primary font-medium text-base
                           hover:bg-white/80 hover:-translate-y-0.5
                           active:translate-y-0 transition-all duration-300"
              >
                Voltar à biblioteca
              </button>
            </div>

            {/* Subtitle */}
            <p className="text-xs font-primary text-eco-muted mt-4">
              Sempre gratuito, sempre privado
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
