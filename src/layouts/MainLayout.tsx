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
    <>
      {/* Sidebar fixo no desktop + TopBar mobile */}
      <Header
        title={pageTitle}
        onLogout={user ? handleLogout : undefined}
      />

      {/* Main com padding para sidebar no desktop */}
      <main
        className="
          min-h-[100svh] md:min-h-[100dvh]
          pt-[72px] md:pt-0
          pl-0 md:pl-[260px]
          transition-[padding] duration-300 ease-out
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
