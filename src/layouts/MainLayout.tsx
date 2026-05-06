// src/layouts/MainLayout.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import GuestModeBanner from '../components/GuestModeBanner';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useGuestGate } from '../hooks/useGuestGate';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isGuestMode } = useAuth();
  const { clearMessages } = useChat();

  // Guest gate para controlar limite de mensagens
  const isGuest = !user;
  const guestGate = useGuestGate(isGuest);

  const pageTitle =
    location.pathname.startsWith('/app/memory') ? 'Memórias' :
    location.pathname.startsWith('/app/voice') ? 'Ecotopia — Voz' :
    'Ecotopia';

  const handleLogout = async () => {
    try {
      // Limpa mensagens do chat ANTES de fazer logout
      clearMessages();
      await signOut();
    } finally {
      navigate('/');
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  // Mostrar header antigo apenas em páginas específicas (NÃO na HomePage, ChatPage, Rings, Memórias, etc.)
  const isHomePage = location.pathname === '/app' || location.pathname === '/app/' || location.pathname === '/app/home';
  const isChatPage = location.pathname.startsWith('/app/chat'); // Nova sidebar/topbar já implementada
  const isMemoryPage = location.pathname.startsWith('/app/memory'); // Memórias, Perfil Emocional, Relatórios
  const isVoicePage = location.pathname.startsWith('/app/voice'); // Página de voz
  const isRingsPage = location.pathname.startsWith('/app/rings');
  const isRiquezaMentalPage = location.pathname.startsWith('/app/riqueza-mental');
  const isArticlesPage = location.pathname.startsWith('/app/articles');
  const isDiarioEstoicoPage = location.pathname.startsWith('/app/diario-estoico');
  const isProgramasPage = location.pathname.startsWith('/app/programas');
  const isSonoPage =
    location.pathname.startsWith('/app/meditacoes-sono') ||
    location.pathname.startsWith('/app/meditacoes/sono');
  const isSonsPage = location.pathname.startsWith('/app/sons');
  const isEnergyBlessingsPage = location.pathname.startsWith('/app/energy-blessings');
  const isMeditationPlayerPage = location.pathname.startsWith('/app/meditation-player');
  const isConfiguracoesPage = location.pathname.startsWith('/app/configuracoes');
  const showOldHeader = !isHomePage && !isChatPage && !isMemoryPage && !isVoicePage && !isRingsPage && !isRiquezaMentalPage && !isArticlesPage && !isDiarioEstoicoPage && !isProgramasPage && !isSonoPage && !isSonsPage && !isEnergyBlessingsPage && !isMeditationPlayerPage && !isConfiguracoesPage;

  // Mostrar BottomNav na HomePage e em páginas específicas (NÃO no Chat, Memórias, Voz que têm sidebar própria)
  const showBottomNav = location.pathname.startsWith('/app') && !isChatPage && !isMemoryPage && !isVoicePage;

  return (
    <>
      {/* Banner de modo convidado — visível apenas para guests */}
      {isGuestMode && <GuestModeBanner />}

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
      {/* Páginas com nova sidebar/topbar têm layout completo próprio, não precisam de wrapper */}
      {isHomePage || isChatPage || isMemoryPage || isVoicePage ? (
        children
      ) : (
        <main
          className="scroll-touch"
          style={{
            minHeight: '100dvh',
            paddingTop: showOldHeader ? 'calc(56px + env(safe-area-inset-top))' : 'env(safe-area-inset-top)',
            paddingBottom: showBottomNav ? 'calc(72px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <div className={showOldHeader ? 'container-content' : 'w-full'}>
            {children}
          </div>
        </main>
      )}

      {/* Bottom Navigation - Apenas mobile */}
      {showBottomNav && <BottomNav />}
    </>
  );
}
