import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const pageTitle =
    pathname === '/chat'
      ? 'ECO'
      : pathname === '/voice'
      ? 'ECO — Voz'
      : pathname === '/memory'
      ? 'Memórias'
      : 'ECO';

  // valor padrão caso a var ainda não tenha sido definida
  const contentStyle: React.CSSProperties = { paddingLeft: 'var(--eco-sidebar-w, 240px)' };

  return (
    <>
      <Header title={pageTitle} variant="left" />
      <main className="min-h-screen bg-white text-gray-900" style={contentStyle}>
        {children}
      </main>
    </>
  );
}
