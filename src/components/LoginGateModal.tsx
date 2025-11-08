import React from 'react';
import { createPortal } from 'react-dom';

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
  count: number;
  limit: number;
}

const LoginGateModal: React.FC<LoginGateModalProps> = ({ open, onClose, onSignup, count, limit }) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      <div className="rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-8 max-w-md w-full text-center transition-all duration-300">
        {/* Logo Image */}
        <div className="flex justify-center mb-6">
          <img
            src="/ECO conexão.png"
            alt="ECO"
            className="h-16 w-16 object-contain"
          />
        </div>

        <h2
          id="gate-title"
          className="text-2xl font-display font-normal text-[var(--eco-text)]"
        >
          Crie sua conta para continuar
        </h2>

        <p className="mt-4 text-sm font-primary text-[var(--eco-muted)] leading-relaxed">
          Crie sua conta gratuita para salvar seu histórico de conversas, sincronizar entre dispositivos e desbloquear recursos personalizados.
        </p>

        {/* Mostra contador */}
        <p className="mt-3 text-xs font-primary text-[var(--eco-muted)] opacity-80">
          {`Suas conversas: ${count} • Sempre 100% gratuito`}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onSignup}
            className="bg-[var(--eco-user)] text-white px-6 py-2.5 rounded-lg font-primary font-medium
                       hover:bg-gradient-to-r hover:from-[var(--eco-user)] hover:to-[var(--eco-accent)]
                       hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]
                       active:translate-y-0 transition-all duration-300 ease-out"
          >
            Criar conta / Entrar
          </button>
          <button
            onClick={onClose}
            className="border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm
                       text-[var(--eco-text)] px-6 py-2.5 rounded-lg font-primary font-medium
                       hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]
                       active:translate-y-0 transition-all duration-300 ease-out"
          >
            Agora não
          </button>
        </div>

        <p className="text-xs font-primary text-[var(--eco-muted)] mt-4 opacity-70">
          Sem spam. Você pode sair quando quiser.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default LoginGateModal;
