import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type ConversionContext,
  getConversionCopy,
  getPreservedDataBadges,
} from '../constants/conversionCopy';

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
  count: number;
  limit: number;
  context?: ConversionContext; // NOVO: Contexto dinâmico
  isSoftPrompt?: boolean;      // NOVO: Se é soft prompt (tem dismiss)
}

const LoginGateModal: React.FC<LoginGateModalProps> = ({
  open,
  onClose,
  onSignup,
  count,
  limit,
  context = 'generic',
  isSoftPrompt = false,
}) => {
  const navigate = useNavigate();

  // Obter copy baseada no contexto
  const copy = getConversionCopy(context);
  const preservedBadges = getPreservedDataBadges(context);

  const handleCreateAccount = () => {
    // Chamar callback antes de navegar
    onSignup();
    const currentPath = window.location.pathname;
    navigate(`/register?returnTo=${encodeURIComponent(currentPath)}`);
  };

  const handleDismiss = () => {
    if (isSoftPrompt) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            onClick={(e) => {
              // Permitir fechar clicando fora apenas se for soft prompt
              if (isSoftPrompt && e.target === e.currentTarget) {
                handleDismiss();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-8 max-w-md w-full text-center"
            >
              {/* Logo Image */}
              <div className="flex justify-center mb-6">
                <img src="/ECO conexão.webp" alt="ECO" className="h-24 w-24 object-contain" loading="lazy" />
              </div>

              {/* Title */}
              <h2
                id="gate-title"
                className="text-2xl sm:text-3xl font-display font-normal text-[var(--eco-text)] leading-tight"
              >
                {copy.title}
              </h2>

              {/* Message */}
              <p className="mt-4 text-base font-primary text-[var(--eco-text)]/80 leading-relaxed">
                {copy.message}
              </p>

              {/* Preserved Data Badges */}
              {preservedBadges.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {preservedBadges.map((badge, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--eco-surface)] border border-[var(--eco-line)] text-sm font-primary text-[var(--eco-text)]/70"
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Subtitle */}
              {copy.subtitle && (
                <p className="mt-4 text-sm font-primary text-[var(--eco-muted)] font-medium">
                  {copy.subtitle}
                </p>
              )}

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3">
                {/* Primary CTA */}
                <button
                  onClick={handleCreateAccount}
                  className="w-full bg-[var(--eco-user)] text-white px-6 py-3.5 rounded-xl font-primary font-semibold text-base
                             hover:bg-gradient-to-r hover:from-[var(--eco-user)] hover:to-[var(--eco-accent)]
                             hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]
                             active:translate-y-0 transition-all duration-300 ease-out"
                >
                  {copy.primaryCta}
                </button>

                {/* Secondary CTA (apenas se soft prompt ou se copy tem secondaryCta) */}
                {(isSoftPrompt || copy.secondaryCta) && (
                  <button
                    onClick={handleDismiss}
                    className="w-full border border-[var(--eco-line)] bg-white/60 backdrop-blur-sm
                               text-[var(--eco-text)] px-6 py-3 rounded-xl font-primary font-medium text-base
                               hover:bg-white/80 hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]
                               active:translate-y-0 transition-all duration-300 ease-out"
                  >
                    {copy.secondaryCta || 'Continuar explorando'}
                  </button>
                )}
              </div>

              {/* Legal Text */}
              {copy.legalText && (
                <p className="text-xs font-primary text-[var(--eco-muted)] mt-6">{copy.legalText}</p>
              )}

              {/* Counter (apenas para contextos de chat) */}
              {context.startsWith('chat_') && (
                <p className="mt-4 text-xs font-primary text-[var(--eco-muted)]">
                  {`Conversas: ${count} de ${limit}`}
                </p>
              )}
            </motion.div>
          </motion.div>,
          document.body
        )}
    </AnimatePresence>
  );
};

export default LoginGateModal;
