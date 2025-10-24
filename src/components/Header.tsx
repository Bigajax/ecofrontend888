// Header.tsx — AppBar “pill” + Drawer lateral (ChatGPT-like, apple-ish)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, BarChart3, MessageCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrolled } from '@/hooks/useScrolled';
import EcoBubbleOneEye from './EcoBubbleOneEye';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onLogout?: () => void;
}

const VERSION = '222';
const iconCls = 'h-[22px] w-[22px]';
const labelCls =
  'text-[15px] leading-[1.35] font-medium tracking-[-0.01em] text-inherit antialiased';

const navItem = (active: boolean) =>
  [
    'group flex items-center gap-3 px-4 py-3 h-12 min-h-[48px] rounded-2xl border border-black/10',
    'transition duration-200 ease-out',
    active
      ? 'bg-black text-white'
      : 'bg-white text-[#0b0b0f] hover:bg-black/[0.04] hover:text-[#050505]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  ].join(' ');

const drawerIconButtonClass = [
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#0b0b0f]',
  'transition-transform duration-200 hover:-translate-y-[1px]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white',
].join(' ');

const Header: React.FC<HeaderProps> = ({ title: _title, showBackButton, onLogout }) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const shouldShowBack = showBackButton ?? true;
  const scrolled = useScrolled(8);
  const buttonBaseClass =
    'inline-flex h-10 items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-white px-4 text-sm font-medium text-[#0b0b0f] transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const feedbackButtonClass = `${buttonBaseClass} text-[color:var(--color-accent)]`;

  const handleOpenFeedback = useCallback((source: 'header' | 'drawer') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('eco-feedback-open', {
        detail: { source },
      }),
    );
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const touchStartX = useRef<number | null>(null);
  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (touchStartX.current !== null) e.preventDefault();
  };
  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (dx < -60) setDrawerOpen(false);
  };

  /* ================= AppBar “pill” ================= */
  const TopBar = (
    <div
      className="sticky top-0 z-50 flex w-full justify-center bg-white/80 px-3 pb-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm sm:px-6"
    >
      <div
        className={[
          'pointer-events-auto w-full max-w-6xl rounded-[28px] border border-[rgba(0,0,0,0.1)]',
          'transition-all duration-300 ease-out',
          scrolled ? 'bg-white' : 'bg-white/95',
        ].join(' ')}
      >
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="flex items-center justify-start">
            {shouldShowBack ? (
              <button
                onClick={() => navigate('/app')}
                className={`${buttonBaseClass} min-w-[2.5rem]`}
                aria-label="Voltar ao chat"
                title="Voltar ao chat"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : (
              <span aria-hidden className="inline-flex h-10 min-w-[2.5rem]" />
            )}
          </div>

          <div className="flex items-center justify-center">
            <Link to="/app" className="select-none text-[color:var(--color-text-primary)]">
              <span className={`${labelCls} text-[16px] md:text-[17px]`}>ECO</span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleOpenFeedback('header')}
              className={`${feedbackButtonClass} whitespace-nowrap`}
            >
              Feedback
            </button>

            {onLogout ? (
              <button onClick={onLogout} className={`${buttonBaseClass} whitespace-nowrap`}>
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
  /* ================= Drawer (overlay) ================= */
  const Drawer = (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.button
            key="backdrop"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[79] bg-black/30"
          />
          <motion.aside
            key="panel"
            initial={{ x: '-100%', opacity: 0.85, filter: 'blur(14px)' }}
            animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ x: '-100%', opacity: 0.85, filter: 'blur(14px)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="
              fixed top-0 left-0 z-[80] h-dvh w-screen sm:w-[420px]
              flex flex-col overflow-y-auto border-r border-black/10 bg-white text-[#050505]
              font-['SF Pro Display','SF Pro Text','-apple-system','BlinkMacSystemFont','Segoe UI',sans-serif]
              pt-[env(safe-area-inset-top)] sm:rounded-r-[28px]
            "
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
              <span className={`${labelCls} text-[16px] md:text-[17px]`}>ECO</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className={drawerIconButtonClass}
              >
                <EcoBubbleOneEye variant="icon" size={22} state="focus" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 px-4 py-5">
              <NavLink to="/app" end onClick={() => setDrawerOpen(false)} className={({ isActive }) => navItem(isActive)}>
                <MessageSquare className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Chat</span>
              </NavLink>

              <NavLink
                to="/app/memory"
                end
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => navItem(isActive)}
              >
                <BookOpen className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Memórias</span>
              </NavLink>
              <NavLink
                to="/app/memory/profile"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => navItem(isActive)}
              >
                <Brain className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Perfil Emocional</span>
              </NavLink>
              <NavLink
                to="/app/memory/report"
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => navItem(isActive)}
              >
                <BarChart3 className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Relatórios</span>
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  handleOpenFeedback('drawer');
                }}
                className={navItem(false)}
              >
                <MessageCircle className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Feedback</span>
              </button>

              {shouldShowBack && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(-1);
                  }}
                  className={navItem(false)}
                >
                  <ArrowLeft className={iconCls} strokeWidth={1.75} />
                  <span className={labelCls}>Voltar</span>
                </button>
              )}
            </nav>

            <div className="mt-auto flex items-center justify-between border-t border-black/10 px-5 py-5">
              <span className="select-none text-[10px] leading-none text-black/50 tabular-nums">{VERSION}</span>
              {onLogout && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-[#050505] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Sair
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {TopBar}
      {Drawer}
    </>
  );
};

export default Header;
