// Header.tsx — Soft Minimal ECO Design
import React from 'react';
import EcoBubbleOneEye from '../EcoBubbleOneEye';

interface HeaderProps {
  onFeedback?: () => void;
  onSignOut?: () => void;
}

const FEEDBACK_URL = 'https://feedback777.vercel.app/';

const Header: React.FC<HeaderProps> = ({ onFeedback, onSignOut }) => {
  const handleFeedbackClick = () => {
    if (onFeedback) {
      onFeedback();
    } else {
      window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-eco-line/50 shadow-[0_4px_30px_rgba(0,0,0,0.04)]"
    >
      <div className="h-14 max-w-screen-lg mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2 h-full">
          {/* Logo/Bolha à esquerda */}
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-eco-babySoft flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-eco-baby" />
            </div>
          </div>

          {/* Título central */}
          <div className="flex items-center justify-center">
            <h1 className="text-base font-medium text-eco-text tracking-tight select-none">
              ECO
            </h1>
          </div>

          {/* Ações à direita */}
          <nav aria-label="Navegação principal" className="flex items-center gap-2">
            <button
              onClick={handleFeedbackClick}
              aria-label="Enviar feedback"
              className="h-9 px-4 rounded-full bg-eco-baby text-white text-sm font-medium transition-all hover:brightness-105 active:brightness-95 focus:outline-none focus:ring-2 focus:ring-eco-baby/60"
            >
              Feedback
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                aria-label="Sair da conta"
                className="h-9 px-4 rounded-full border border-eco-line/70 bg-white/80 text-eco-text text-sm font-medium transition-all hover:bg-eco-babySoft focus:outline-none focus:ring-2 focus:ring-eco-baby/50"
              >
                Sair
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
