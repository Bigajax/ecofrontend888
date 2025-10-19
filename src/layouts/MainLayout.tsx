// src/layouts/MainLayout.tsx
import React from 'react';
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
    location.pathname.startsWith('/memory') ? 'Memórias' :
    location.pathname.startsWith('/voice')  ? 'ECO — Voz' :
    'ECO';

  const handleLogout = async () => {
    try {
      await signOut();
      clearMessages(); // opcional: limpa as mensagens do chat
    } finally {
      navigate('/login');
    }
  };

  return (
    <>
      {/* AUTO = TopBar no mobile / Sidebar no desktop */}
      <Header
        title={pageTitle}
        variant="auto"
        onLogout={user ? handleLogout : undefined}
      />

      {/* Espaçamento controlado pelas CSS vars definidas no Header. */}
      {/* Variantes com sidebar devem definir explicitamente --eco-sidebar-w quando existirem. */}
      <main
        className="
          min-h-[100svh] md:min-h-[100dvh]
          pt-[var(--eco-topbar-h,56px)] md:pt-0
          pl-0 md:pl-[var(--eco-sidebar-w,0px)]
          transition-[padding] duration-200 ease-out
          bg-transparent text-[color:var(--color-text-primary)]
        "
      >
        <div className="mx-auto w-full max-w-[1140px] px-4 sm:px-6 md:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
