// src/layouts/MainLayout.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
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
        onLogout={handleLogout}   // <<<<<< essencial para o botão aparecer
      />

      {/* Espaçamento controlado pelas CSS vars definidas no Header */}
      <main
        className="
          min-h-[100svh] md:min-h-[100dvh]
          pt-[var(--eco-topbar-h,56px)] md:pt-0
          pl-0 md:pl-[var(--eco-sidebar-w,256px)]
          transition-[padding] duration-200 ease-out
          bg-white
        "
      >
        {children}
      </main>
    </>
  );
}
