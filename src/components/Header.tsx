// Header.tsx — AppBar “pill” + Drawer lateral (ChatGPT-like, apple-ish)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, BarChart3, X, Menu, MessageCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrolled } from '@/hooks/useScrolled';
import EcoBubbleOneEye from './EcoBubbleOneEye';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onLogout?: () => void;
}

const VERSION = '222';
const iconCls = 'h-[22px] w-[22px] text-[color:rgba(15,23,42,0.8)]';
const labelCls =
  'text-[15px] leading-[1.35] font-medium tracking-[-0.005em] text-[color:var(--color-text-primary)] antialiased';

const iconButtonClass =
  'glass-chip h-11 w-11 flex items-center justify-center transition-transform duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]';

const navItem = (active: boolean) =>
  [
    'glass-chip flex items-center gap-3 px-4 py-2 h-11 min-h-[44px]',
    'transition-transform duration-200 ease-out',
    active
      ? 'text-[color:var(--color-text-primary)] shadow-floating -translate-y-[1px]'
      : 'text-[color:var(--color-text-muted)] hover:-translate-y-[2px] hover:text-[color:var(--color-text-primary)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]',
  ].join(' ');

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const routeTitleMap: Array<[RegExp, string]> = [
    [/^\/memory\/?$/, 'Memórias'],
    [/^\/memory\/profile\/?$/, 'Perfil Emocional'],
    [/^\/memory\/report\/?$/, 'Relatórios'],
    [/^\/chat\/?$/, 'ECO'],
  ];
  const autoTitle =
    routeTitleMap.find(([re]) => re.test(location.pathname))?.[1] || title || 'ECO';

  const isChat = /^\/chat\/?$/.test(location.pathname);
  const shouldShowBack = showBackButton || !isChat;
  const scrolled = useScrolled(8);

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
    <div className="sticky top-0 z-50 flex w-full justify-center px-3 pb-3 pt-[env(safe-area-inset-top,0px)] sm:px-6">
      <div
        className={[
          'glass-toolbar pointer-events-auto w-full max-w-6xl border border-white/60',
          'shadow-glass transition-all duration-300 ease-out',
          scrolled ? 'shadow-floating translate-y-[1px] bg-white/75' : 'bg-white/65',
        ].join(' ')}
      >
        <div className="grid h-[64px] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 sm:px-5">
          <div className="flex items-center">
            <button
              onClick={() => setDrawerOpen(true)}
              className={iconButtonClass}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5 text-[color:var(--color-text-primary)]" strokeWidth={1.75} />
            </button>
          </div>

          <div className="justify-self-center">
            <Link
              to="/chat"
              className="flex items-center gap-2 select-none text-[color:var(--color-text-primary)] transition hover:opacity-95"
            >
              <span className="inline-flex translate-y-[1px]">
                <EcoBubbleOneEye variant="icon" size={22} state="focus" />
              </span>
              <span className={`${labelCls} text-[16px] md:text-[17px]`}>{autoTitle}</span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2">
            {shouldShowBack && (
              <button
                onClick={() => navigate('/chat')}
                className={iconButtonClass}
                aria-label="Voltar ao chat"
                title="Voltar ao chat"
              >
                <ArrowLeft className="h-5 w-5 text-[color:var(--color-text-primary)]" strokeWidth={1.75} />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenFeedback('header')}
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,122,255,0.25)] transition-transform duration-200 hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]"
            >
              Feedback
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="btn-secondary h-11 px-5 text-sm font-semibold"
              >
                Sair
              </button>
            )}
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
            initial={{ x: -360, opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 1 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="
              fixed top-0 left-0 z-[80] h-dvh w-[86vw] max-w-[340px]
              glass-strong rounded-r-[28px]
              border border-white/60 shadow-floating
              pt-[env(safe-area-inset-top)] overflow-y-auto
              flex flex-col backdrop-blur-xl
            "
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-lg">
              <EcoBubbleOneEye variant="icon" size={24} state="focus" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="glass-chip h-10 w-10 p-0 text-[color:var(--color-text-primary)] hover:-translate-y-[1px]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-3 py-3 flex flex-col gap-1.5">
              <NavLink
                to="/chat"
                end
                className={({ isActive }) => navItem(isActive)}
                onClick={() => setDrawerOpen(false)}
              >
                <MessageSquare className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Chat</span>
              </NavLink>

              <NavLink to="/memory" end className={({ isActive }) => navItem(isActive)} onClick={() => setDrawerOpen(false)}>
                <BookOpen className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Memórias</span>
              </NavLink>
              <NavLink to="/memory/profile" className={({ isActive }) => navItem(isActive)} onClick={() => setDrawerOpen(false)}>
                <Brain className={iconCls} strokeWidth={1.75} />
                <span className={labelCls}>Perfil Emocional</span>
              </NavLink>
              <NavLink to="/memory/report" className={({ isActive }) => navItem(isActive)} onClick={() => setDrawerOpen(false)}>
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

              {showBackButton && (
                <button onClick={() => { setDrawerOpen(false); navigate(-1); }} className={navItem(false)}>
                  <ArrowLeft className={iconCls} strokeWidth={1.75} />
                  <span className={labelCls}>Voltar</span>
                </button>
              )}
            </nav>

            <div className="mt-auto flex items-center justify-between border-t border-white/60 px-4 py-4">
              <span className="text-[10px] leading-none text-[color:var(--color-text-muted)] tabular-nums select-none">{VERSION}</span>
              {onLogout && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="btn-secondary h-10 px-4 text-sm font-semibold"
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
