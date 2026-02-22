import React from 'react';
import { X, Check } from 'lucide-react';

interface GuestSignupModalProps {
  open: boolean;
  onClose: () => void;
  onSignup: () => void;

  // Contexto para personalizar copy
  trigger?: 'time' | 'interactions' | 'both';
  currentPage?: string;
  stats?: {
    timeSpentMinutes: number;
    interactionCount: number;
    pagesVisited: number;
  };
}

/**
 * GuestSignupModal - Modal gentil de conversão para guests
 *
 * Design:
 * - Fundo sólido com boa opacidade
 * - Copy focado em valor, não em bloqueio
 * - 2 botões: "Criar conta grátis" (azul bebê) e "Continuar lendo" (branco)
 * - Stats dinâmicos baseados na jornada do guest
 */
export default function GuestSignupModal({
  open,
  onClose,
  onSignup,
  trigger = 'time',
  stats = {
    timeSpentMinutes: 10,
    interactionCount: 15,
    pagesVisited: 5,
  },
}: GuestSignupModalProps) {
  if (!open) return null;

  // Personalizar título baseado no trigger
  const getTitle = (): string => {
    if (trigger === 'time') {
      return 'Gostou da experiência?';
    } else if (trigger === 'interactions') {
      return 'Você está explorando bastante!';
    } else {
      return 'Continue sua jornada com ECO';
    }
  };

  // Personalizar descrição com stats
  const getDescription = (): string => {
    const { timeSpentMinutes, interactionCount } = stats;

    if (timeSpentMinutes > 0 && interactionCount > 0) {
      return `Você já passou ${timeSpentMinutes} ${
        timeSpentMinutes === 1 ? 'minuto' : 'minutos'
      } explorando o ECO e realizou ${interactionCount} ${
        interactionCount === 1 ? 'interação' : 'interações'
      }. Crie sua conta gratuita para salvar seu progresso e desbloquear recursos ilimitados.`;
    }

    if (timeSpentMinutes > 0) {
      return `Você já passou ${timeSpentMinutes} ${
        timeSpentMinutes === 1 ? 'minuto' : 'minutos'
      } explorando o ECO. Crie sua conta gratuita para continuar sua jornada sem limites.`;
    }

    if (interactionCount > 0) {
      return `Você realizou ${interactionCount} ${
        interactionCount === 1 ? 'interação' : 'interações'
      } no ECO. Crie sua conta gratuita para desbloquear recursos ilimitados.`;
    }

    return 'Crie sua conta gratuita para salvar seu progresso e aproveitar todos os recursos do ECO.';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(to bottom right, #f8f9fa 0%, #e9ecef 100%)',
        }}
      >
        {/* Close button - maior e mais visível */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 transition-colors p-1 hover:bg-gray-200 rounded-full"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>

        {/* Título */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-3 pr-8">
          {getTitle()}
        </h2>

        {/* Descrição */}
        <p className="text-center text-gray-600 mb-6 leading-relaxed text-sm">
          {getDescription()}
        </p>

        {/* Benefícios com checkmarks verdes */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-gray-700 text-sm">
              Acesso ilimitado a chat, meditações e voice
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-gray-700 text-sm">
              Histórico completo de conversas e memórias
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-gray-700 text-sm">
              Perfil emocional personalizado e insights
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-gray-700 text-sm">
              Sincronização entre dispositivos
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-3">
          {/* Botão primário - Azul bebê */}
          <button
            onClick={onSignup}
            className="w-full text-white px-6 py-3.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: '#87CEEB',
            }}
          >
            Criar conta grátis
          </button>

          {/* Botão secundário - Branco */}
          <button
            onClick={onClose}
            className="w-full bg-white text-gray-700 px-6 py-3 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 border border-gray-300"
          >
            Continuar explorando
          </button>
        </div>

        {/* Disclaimer - agora mais visível */}
        <p className="text-xs text-center text-gray-600 mt-5 font-medium">
          100% gratuito • Sem cartão de crédito
        </p>
      </div>
    </div>
  );
}
