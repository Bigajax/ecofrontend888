import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * GuestModeBanner
 *
 * Barra informativa persistente exibida para usuários em modo convidado.
 * Indica que o progresso não será salvo e oferece CTA para criar conta.
 */
export default function GuestModeBanner() {
  const navigate = useNavigate();

  return (
    <div className="w-full bg-eco-baby/10 border-b border-eco-baby/20 px-4 py-2 flex items-center justify-center gap-3 text-center">
      <p className="text-xs sm:text-sm font-primary text-eco-text/80">
        Você está explorando o ECO · Crie conta para salvar seu progresso
      </p>
      <button
        onClick={() => navigate('/register')}
        className="flex-shrink-0 text-xs font-semibold text-eco-baby hover:text-eco-baby/80 underline underline-offset-2 transition-colors duration-200 whitespace-nowrap"
      >
        Criar conta grátis →
      </button>
    </div>
  );
}
