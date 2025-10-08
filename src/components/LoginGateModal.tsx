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

  void count;
  void limit;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-slate-900">Crie sua conta para continuar</h2>
        <p className="mt-2 text-sm text-slate-600">
          Você atingiu o limite de interação sem conta. Entre ou cadastre-se para continuar a conversa e salvar seu progresso.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onSignup}
            className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Criar conta / Entrar
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            Agora não
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Sem spam. Você pode sair quando quiser.
        </p>
      </div>
    </div>
  );
};

export default LoginGateModal;
