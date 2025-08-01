import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onOpenMemoryHistory?: () => void;
  mensagemDeSucesso?: string | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onOpenMemoryHistory,
  mensagemDeSucesso,
  onLogout
}) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 pt-[env(safe-area-inset-top)]">
      <div className="grid grid-cols-3 items-center px-3 md:px-6 py-2.5">
        {/* ESQUERDA */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenMemoryHistory}
            className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200"
            aria-label="Ver Memórias"
            title="Ver Memórias"
          >
            <BookOpen className="h-5 w-5 md:h-5.5 md:w-5.5 text-gray-700" strokeWidth={2} />
          </button>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200"
              aria-label="Voltar"
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5 md:h-5.5 md:w-5.5 text-gray-700" />
            </button>
          )}
        </div>

        {/* CENTRO */}
        <h1
          className="text-center font-normal tracking-tight text-lg md:text-xl text-gray-800 truncate"
          title={title}
        >
          {title || 'Eco'}
        </h1>

        {/* DIREITA */}
        <div className="flex items-center justify-end gap-2">
          <AnimatePresence>
            {mensagemDeSucesso && (
              <motion.span
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="text-xs md:text-sm text-green-600 font-medium truncate max-w-[40vw] text-right"
                title={mensagemDeSucesso}
              >
                {mensagemDeSucesso}
              </motion.span>
            )}
          </AnimatePresence>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-5 w-5 md:h-5.5 md:w-5.5 text-gray-700" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
