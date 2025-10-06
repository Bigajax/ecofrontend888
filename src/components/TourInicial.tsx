// src/components/TourInicial.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Sequence from './Sequence';
import EcoBubbleOneEye from './EcoBubbleOneEye';
import { X, ArrowRight } from 'lucide-react';
import mixpanel from '../lib/mixpanel';

interface TourInicialProps {
  onClose: () => void;
}

const TourInicial: React.FC<TourInicialProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [showSequence, setShowSequence] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mixpanel.track('Front-end: Tour Aberto', { entry: window.location.href });
    }
  }, []);

  const handleIniciarSequence = () => {
    mixpanel.track('Front-end: Tour Sequência Iniciada');
    setShowSequence(true);
  };

  const handleClose = useCallback(() => {
    mixpanel.track('Front-end: Tour Fechado', { step: showSequence ? 'sequence' : 'intro' });
    onClose();
  }, [onClose, showSequence]);

  const handleSequenceClosed = () => {
    mixpanel.track('Front-end: Tour Concluído');
    onClose();
    navigate('/chat');
  };

  // Fechar com Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#ffffff' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Tour inicial"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="glass-card relative w-[min(92vw,420px)] h-[560px] sm:h-[580px] rounded-3xl overflow-hidden shadow-[0_24px_90px_rgba(2,6,23,.10)] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {!showSequence ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center pb-6">
            {/* Fechar */}
            <button
              onClick={handleClose}
              aria-label="Fechar"
              className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 transition z-10"
            >
              <X size={18} />
            </button>

            {/* Copy ajustada */}
            <h2 className="text-[26px] leading-none font-semibold text-slate-900 mb-2">
              Seja bem-vindo à sua pausa com a <span className="eco-wordmark">Eco</span>.
            </h2>
            <p className="text-slate-600 mb-6">
              Um pequeno tour para sentir como ela funciona.
            </p>

            {/* Bolha com olho */}
            <motion.div
              className="mb-5"
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.04, 1] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <EcoBubbleOneEye variant="voice" state="thinking" size={240} />
            </motion.div>

            {/* CTA + microcopy */}
            <button
              onClick={handleIniciarSequence}
              className="btn-apple btn-apple-primary inline-flex h-12 items-center gap-2 rounded-2xl px-6"
            >
              Começar
              <ArrowRight size={16} />
            </button>
            <span className="mt-2 text-xs text-slate-400 select-none">
              Dura menos de 1 minuto.
            </span>
          </div>
        ) : (
          <>
            {/* Sequence usa 100% da altura do card */}
            <div className="absolute inset-0">
              <Sequence onClose={handleClose} onComplete={handleSequenceClosed} />
            </div>

            {/* botão de fechar também na sequência */}
            <button
              onClick={handleClose}
              aria-label="Fechar"
              className="absolute right-3.5 top-3.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/70 hover:text-slate-700 transition z-10"
            >
              <X size={18} />
            </button>
          </>
        )}
      </motion.div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default TourInicial;
