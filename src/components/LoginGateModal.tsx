import React from 'react';

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;
  count: number;
  limit: number;
}

const LoginGateModal: React.FC<LoginGateModalProps> = ({ open, onClose, onSignup, count, limit }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900">Crie sua conta para continuar</h2>
        <p className="mt-2 text-sm text-slate-600">
          Você alcançou {count}/{limit} interações gratuitas. Entre ou cadastre-se para continuar a conversa e salvar seu progresso.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onSignup}
            className="rounded-xl bg-black px-4 py-2 text-center text-white transition hover:opacity-90"
          >
            Criar conta / Entrar
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-center font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Agora não
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">Sem spam. Você pode sair quando quiser.</p>
      </div>
    </div>
  );
};

export default LoginGateModal;
