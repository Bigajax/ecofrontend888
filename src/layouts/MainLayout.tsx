import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pageTitle =
    location.pathname === '/chat'
      ? 'ECO'
      : location.pathname === '/voice'
      ? 'ECO — Voz'
      : location.pathname === '/memory'
      ? 'Memórias'
      : 'ECO';

  return (
    <>
      {/* AUTO = TopBar no mobile / Sidebar no desktop */}
      <Header title={pageTitle} variant="auto" />

      {/* No mobile: sem padding esquerdo. No desktop: usa a largura da sidebar */}
      <main
        className="
          min-h-screen
          transition-[padding] duration-200 ease-out
          pl-0
          md:pl-[var(--eco-sidebar-w,240px)]
        "
      >
        {children}
      </main>
    </>
  );
}
