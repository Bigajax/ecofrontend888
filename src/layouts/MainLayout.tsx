// src/layouts/MainLayout.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useGuestGate } from '../hooks/useGuestGate';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { clearMessages } = useChat();

  // Guest gate para controlar limite de mensagens
  const isGuest = !user;
  const guestGate = useGuestGate(isGuest);

  const pageTitle =
    location.pathname.startsWith('/app/memory') ? 'Memórias' :
    location.pathname.startsWith('/app/voice') ? 'ECO — Voz' :
    'ECO';

  const handleLogout = async () => {
    try {
      await signOut();
      clearMessages(); // opcional: limpa as mensagens do chat
    } finally {
      navigate('/');
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  // Mostrar header antigo apenas na ChatPage e outras páginas (não na HomePage, nem Rings, nem Riqueza Mental, nem Articles, nem Diário Estoico, nem páginas de Explorar, nem páginas de Meditação)
  const isHomePage = location.pathname === '/app' || location.pathname === '/app/';
  const isRingsPage = location.pathname.startsWith('/app/rings');
  const isRiquezaMentalPage = location.pathname.startsWith('/app/riqueza-mental');
  const isArticlesPage = location.pathname.startsWith('/app/articles');
  const isDiarioEstoicoPage = location.pathname.startsWith('/app/diario-estoico');
  const isProgramasPage = location.pathname.startsWith('/app/programas');
  const isSonoPage = location.pathname.startsWith('/app/sono');
  const isSonsPage = location.pathname.startsWith('/app/sons');
  const isEnergyBlessingsPage = location.pathname.startsWith('/app/energy-blessings');
  const isMeditationPlayerPage = location.pathname.startsWith('/app/meditation-player');
  const isConfiguracoesPage = location.pathname.startsWith('/app/configuracoes');
  const showOldHeader = !isHomePage && !isRingsPage && !isRiquezaMentalPage && !isArticlesPage && !isDiarioEstoicoPage && !isProgramasPage && !isSonoPage && !isSonsPage && !isEnergyBlessingsPage && !isMeditationPlayerPage && !isConfiguracoesPage;

  return (
    <>
      {/* AUTO = TopBar no mobile / Sidebar no desktop - Apenas para ChatPage e outras páginas */}
      {showOldHeader && (
        <Header
          title={pageTitle}
          variant="auto"
          onLogout={user ? handleLogout : undefined}
          isGuest={isGuest}
          guestLimitReached={guestGate.reachedLimit}
          onLoginClick={handleLoginClick}
        />
      )}

      {/* Espaçamento controlado pelas CSS vars definidas no Header. */}
      {/* Variantes com sidebar devem definir explicitamente --eco-sidebar-w quando existirem. */}
      <main
        className={`
          min-h-[100svh] md:min-h-[100dvh]
          ${showOldHeader ? 'pt-[var(--eco-topbar-h,56px)] md:pt-0' : ''}
          pl-0 ${showOldHeader ? 'md:pl-[var(--eco-sidebar-w,0px)]' : ''}
          transition-[padding] duration-200 ease-out
          bg-transparent text-[color:var(--color-text-primary)]
        `}
      >
        <div className={`${showOldHeader ? 'mx-auto w-full max-w-[1140px] px-4 sm:px-6 md:px-8' : 'w-full'}`}>
          {children}
        </div>
      </main>
    </>
  );
}
