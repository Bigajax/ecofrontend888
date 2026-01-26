import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DiarioExitModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
  onLeaveAnyway: () => void;
}

const DiarioExitModal: React.FC<DiarioExitModalProps> = ({
  open,
  onClose,
  onSignup,
  onLeaveAnyway
}) => {
  // Handle ESC key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      <div className="rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-8 max-w-md w-full text-center transition-all duration-300">
        {/* Logo Image */}
        <div className="flex justify-center mb-6">
          <img
            src="/ECO conexão.webp"
            alt="ECO"
            className="h-24 w-24 object-contain"
          />
        </div>

        <h2
          id="exit-modal-title"
          className="text-3xl font-display font-normal text-[var(--eco-text)] mb-4"
        >
          Gostou do Diário Estoico?
        </h2>

        <p className="text-base font-primary text-[var(--eco-text)] leading-relaxed mb-6">
          Crie sua conta gratuita para receber reflexões diárias, salvar suas favoritas e acompanhar seu progresso na jornada estoica.
        </p>

        {/* Benefícios */}
        <div className="space-y-2 mb-6 text-left">
          <div className="flex items-start gap-2">
            <span className="text-eco-500 font-bold mt-0.5">✓</span>
            <p className="text-sm font-primary text-[var(--eco-text)]">
              Reflexões diárias personalizadas
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-eco-500 font-bold mt-0.5">✓</span>
            <p className="text-sm font-primary text-[var(--eco-text)]">
              Histórico de leituras
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-eco-500 font-bold mt-0.5">✓</span>
            <p className="text-sm font-primary text-[var(--eco-text)]">
              Acesso a todos os recursos da ECO
            </p>
          </div>
        </div>

        {/* Botões (3 opções) */}
        <div className="flex flex-col gap-3">
          {/* Botão primário: Criar conta */}
          <button
            onClick={onSignup}
            className="bg-gradient-to-r from-[var(--eco-user)] to-[var(--eco-accent)] text-white px-6 py-3 rounded-lg font-primary font-medium text-base
                       hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]
                       active:translate-y-0 transition-all duration-300 ease-out"
          >
            Criar conta grátis
          </button>

          {/* Botão secundário: Continuar lendo */}
          <button
            onClick={onClose}
            className="border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm
                       text-[var(--eco-text)] px-6 py-3 rounded-lg font-primary font-medium text-base
                       hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]
                       active:translate-y-0 transition-all duration-300 ease-out"
          >
            Continuar lendo
          </button>

          {/* Botão terciário: Sair */}
          <button
            onClick={onLeaveAnyway}
            className="text-[var(--eco-muted)] px-6 py-2 font-primary font-medium text-sm
                       hover:text-[var(--eco-text)] transition-colors duration-200"
          >
            Sair
          </button>
        </div>

        {/* Fine print */}
        <p className="text-xs font-primary text-[var(--eco-muted)] mt-6">
          100% gratuito. Cancele quando quiser.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default DiarioExitModal;
