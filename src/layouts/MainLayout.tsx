// src/layouts/MainLayout.tsx
import React, { type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { clearMessages } = useChat();

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

  return (
    <div
      className="app-shell"
      style={{
        // 72px desktop / 60px mobile — ref para grid-base no ChatPage
        '--eco-topbar-h': '72px',
      } as CSSProperties}
    >
      {/* AUTO = TopBar no mobile / Sidebar no desktop */}
      <Header
        title={pageTitle}
        variant="auto"
        onLogout={user ? handleLogout : undefined}
      />

      {/* Área de conteúdo assume a segunda linha do grid */}
      <main className="app-shell__main">
        <div className="app-shell__viewport mx-auto w-full max-w-[1140px] px-4 sm:px-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
