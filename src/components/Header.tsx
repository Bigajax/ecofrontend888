// Header.tsx — AppBar “pill” + Drawer lateral (ChatGPT-like, apple-ish)

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
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

const iconButtonClass =
  'glass-chip h-11 w-11 flex items-center justify-center transition-transform duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]';

const navItem = (active: boolean) =>
  [
    'group flex items-center gap-3 px-4 py-3 h-12 min-h-[48px] rounded-2xl border border-black/10',
    'transition duration-200 ease-out',
    active
      ? 'bg-black text-white'
      : 'bg-white text-[#0b0b0f] hover:-translate-y-[1px] hover:bg-black/[0.04] hover:text-[#050505]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  ].join(' ');

const drawerIconButtonClass = [
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#0b0b0f]',
  'transition-transform duration-200 hover:-translate-y-[1px]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white',
].join(' ');

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const routeTitleMap: Array<[RegExp, string]> = [
    [/^\/memory\/?$/, 'Memórias'],
    [/^\/memory\/profile\/?$/, 'Perfil Emocional'],
    [/^\/memory\/report\/?$/, 'Relatórios'],
    [/^\/(app|chat)\/?$/, 'ECO'], // ⬅ ajuste: considera /app e /chat
  ];
  const autoTitle =
    routeTitleMap.find(([re]) => re.test(location.pathname))?.[1] || title || 'ECO';

  // ⬅ ajuste: detecta chat em /app ou /chat (com ou sem / final)
  const isChat = /^\/(app|chat)\/?$/.test(location.pathname);

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

  /* ================= AppBar ================= */
  const TopBar = (
    <div className="sticky top-0 z-50 flex w-full justify-center px-3 pb-3 pt-[env(safe-area-inset-top,0px)] sm:px-6">
      <div
        className={[
          'glass-toolbar pointer-events-auto w-full max-w-6xl border border-white/60',
          'transition-all duration-300 ease-out',
          scrolled ? 'translate-y-[1px] bg-white/75' : 'bg-white/65',
        ].join(' ')}
      >
        {/* Grid de 3 colunas - centralização perfeita */}
        <div className="grid grid-cols-[1fr,auto,1fr] items-center h-[64px] gap-3 px-3 sm:px-5">
          {/* ESQUERDA */}
          <div className="flex items-center">
            <button
              onClick={() => setDrawerOpen(true)}
              className={iconButtonClass}
              aria-label="Abrir menu"
            >
              <EcoBubbleOneEye variant="icon" size={22} state="idle" />
            </button>
          </div>

          {/* CENTRO */}
          <div className="justify-self-center select-none">
            <Link
              to="/app"
              className="flex items-center gap-2 text-[color:var(--color-text-primary)] transition hover:opacity-95"
            >
              <span className={`${labelCls} text-[16px] md:text-[17px]`}>{autoTitle}</span>
            </Link>
          </div>

          {/* DIREITA */}
          <div className="justify-self-end flex items-center gap-2">
            {/* só aparece se NÃO estiver no chat */}
            {!isChat && shouldShowBack && (
              <button
                onClick={() => navigate('/app')}
                className={iconButtonClass}
                aria-label="Voltar ao chat"
                title="Voltar ao chat"
              >
                <ArrowLeft
                  className="h-5 w-5 text-[color:var(--color-text-primary)]"
                  strokeWidth={1.75}
                />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenFeedback('header')}
              className="hidden sm:inline-flex items-center justify-center rounded-full bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]"
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

  /* ================= Drawer ================= */
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

              {showBackButton && (
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
