/**
 * RitualGuestGate Component
 *
 * Gate que aparece no Anel 3 (Fogo) do Five Rings para guests,
 * incentivando conversão para continuar o programa de 30 dias.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import RingIcon from './RingIcon';
import mixpanel from 'mixpanel-browser';

interface RitualGuestGateProps {
  open: boolean;
  currentDay: number; // Dia atual do ritual (1-30)
  completedRings: number; // Quantos anéis já completou hoje (0-2 para guests)
  onBack?: () => void;
}

export default function RitualGuestGate({
  open,
  currentDay,
  completedRings,
  onBack,
}: RitualGuestGateProps) {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    // Track click
    mixpanel.track('Guest Rings Gate: Continue Clicked', {
      current_day: currentDay,
      completed_rings: completedRings,
      blocked_at: 'fire_ring',
    });

    // Navigate to signup
    navigate('/register?returnTo=/app/rings');
  };

  const handleBack = () => {
    // Track dismiss
    mixpanel.track('Guest Rings Gate: Back Clicked', {
      current_day: currentDay,
      completed_rings: completedRings,
    });

    if (onBack) {
      onBack();
    } else {
      navigate('/app/rings');
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
          aria-labelledby="ritual-gate-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-white/95 to-white/90
                       backdrop-blur-xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            {/* Ring Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                              flex items-center justify-center shadow-lg">
                  <RingIcon ringId="fire" size={48} />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white
                              flex items-center justify-center shadow-md">
                  <Lock size={16} className="text-red-500" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2
              id="ritual-gate-title"
              className="text-2xl sm:text-3xl font-display font-normal text-eco-text leading-tight mb-4"
            >
              O Anel do Fogo aguarda você
            </h2>

            {/* Message */}
            <p className="text-base font-primary text-eco-text/80 leading-relaxed mb-6">
              Você completou os primeiros dois anéis. Crie sua conta para atravessar os próximos 28 dias de transformação.
            </p>

            {/* Ring Progress */}
            <div className="bg-eco-surface/50 rounded-xl p-5 mb-6 border border-eco-line">
              <p className="text-sm font-primary text-eco-muted mb-4">Progresso do Dia {currentDay}</p>

              <div className="flex items-center justify-center gap-3">
                {/* Earth - Completed */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600
                                flex items-center justify-center shadow-md">
                    <RingIcon ringId="earth" size={24} />
                  </div>
                  <span className="text-xs font-primary text-green-600 font-semibold">✓</span>
                </div>

                {/* Water - Completed */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600
                                flex items-center justify-center shadow-md">
                    <RingIcon ringId="water" size={24} />
                  </div>
                  <span className="text-xs font-primary text-green-600 font-semibold">✓</span>
                </div>

                {/* Fire - Locked */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200
                                flex items-center justify-center shadow-md relative">
                    <RingIcon ringId="fire" size={24} />
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-full
                                  flex items-center justify-center">
                      <Lock size={16} className="text-gray-600" />
                    </div>
                  </div>
                  <span className="text-xs font-primary text-gray-400">🔒</span>
                </div>

                {/* Wind - Locked */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200
                                flex items-center justify-center shadow-md relative">
                    <RingIcon ringId="wind" size={24} />
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-full
                                  flex items-center justify-center">
                      <Lock size={16} className="text-gray-600" />
                    </div>
                  </div>
                  <span className="text-xs font-primary text-gray-400">🔒</span>
                </div>

                {/* Void - Locked */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-200
                                flex items-center justify-center shadow-md relative">
                    <RingIcon ringId="void" size={24} />
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-full
                                  flex items-center justify-center">
                      <Lock size={16} className="text-gray-600" />
                    </div>
                  </div>
                  <span className="text-xs font-primary text-gray-400">🔒</span>
                </div>
              </div>

              <p className="text-xs font-primary text-eco-muted mt-4">
                {completedRings} de 5 anéis completados hoje
              </p>
            </div>

            {/* Preserved Data Badges */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                            bg-eco-surface border border-eco-line text-sm font-primary text-eco-text/70">
                <span>⭕</span>
                <span>30 dias completos</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                            bg-eco-surface border border-eco-line text-sm font-primary text-eco-text/70">
                <span>📈</span>
                <span>Progresso salvo</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              {/* Primary CTA */}
              <button
                onClick={handleCreateAccount}
                className="w-full bg-gradient-to-r from-eco-user to-eco-accent text-white px-6 py-4
                           rounded-xl font-primary font-semibold text-base
                           hover:shadow-xl hover:-translate-y-0.5
                           active:translate-y-0 transition-all duration-300"
              >
                Atravessar os anéis
              </button>

              {/* Secondary CTA */}
              <button
                onClick={handleBack}
                className="w-full border border-eco-line bg-white/60 backdrop-blur-sm
                           text-eco-text px-6 py-3 rounded-xl font-primary font-medium text-base
                           hover:bg-white/80 hover:-translate-y-0.5
                           active:translate-y-0 transition-all duration-300"
              >
                Voltar
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
