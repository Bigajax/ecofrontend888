// src/components/TourInicial.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassBubble from './GlassBubble';
import Sequence from './Sequence';
import { X, ArrowRight } from 'lucide-react';
import mixpanel from '../lib/mixpanel';

interface TourInicialProps {
  onClose: () => void;
}

const TourInicial: React.FC<TourInicialProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [showSequence, setShowSequence] = useState(false);

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
      style={{ background: '#ffffff' }} // 🔒 fundo branco puro
      onClick={handleClose}             // fechar clicando no backdrop
      role="dialog"
      aria-modal="true"
      aria-label="Tour inicial"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        // ⬇️ largura e altura estáveis + um pouco maiores para não cortar a bolha
        className="glass-card relative w-[min(92vw,420px)] h-[560px] sm:h-[580px] rounded-3xl overflow-hidden shadow-[0_24px_90px_rgba(2,6,23,.10)]"
        onClick={(e) => e.stopPropagation()} // não fecha ao clicar dentro
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

            <h2 className="text-[26px] leading-none font-semibold text-slate-900 mb-2">
              Bem-vindo ao <span className="eco-wordmark">ECO</span>!
            </h2>
            <p className="text-slate-600 mb-6">Explore uma breve introdução.</p>

            {/* Bolha translúcida branca */}
            <div className="mb-5">
              <GlassBubble color="#ffffff" size="15rem" />
            </div>

            <button
              onClick={handleIniciarSequence}
              className="btn-apple btn-apple-primary inline-flex h-12 items-center gap-2 rounded-2xl px-6"
            >
              Próximo
              <ArrowRight size={16} />
            </button>
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
