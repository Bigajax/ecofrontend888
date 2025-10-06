// Header.tsx — AppBar “pill” + Drawer lateral (ChatGPT-like, apple-ish)

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, BarChart3, X, Menu, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EcoBubbleOneEye from './EcoBubbleOneEye';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onLogout?: () => void;
}

const VERSION = '222';
const IOS_BLUE = '#007AFF'; // 💙 iOS System Blue

const iconCls = 'h-[22px] w-[22px] text-slate-800';
const labelCls =
  'text-[15px] leading-[1.35] text-slate-900/95 font-normal tracking-[-0.005em] antialiased';

const navItem = (active: boolean) =>
  [
    'flex items-center gap-2 px-3 py-2 h-11 min-h-[44px]',
    'rounded-[18px] transition-colors',
    active ? 'bg-black/[0.04] border border-black/[0.06]' : 'hover:bg-black/[0.04] border border-transparent',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]',
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
    <header
      className="
        fixed top-0 left-0 right-0 z-[70]
        bg-white rounded-b-[22px]
        border-b border-black/[0.06]
        shadow-[0_8px_24px_rgba(16,24,40,0.06)]
        pt-[env(safe-area-inset-top)]
      "
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <div className="flex items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5">
        {/* ☰ abre o drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-[18px] hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-slate-900" />
        </button>

        {/* Centro — título */}
        <Link to="/chat" className="flex items-center gap-2 select-none hover:opacity-95">
          <span className="translate-y-[1px] inline-flex">
            <EcoBubbleOneEye variant="icon" size={20} state="focus" />
          </span>
          <span className={`${labelCls} text-[16px] md:text-[17px]`}>{autoTitle}</span>
        </Link>

        {/* Direita: voltar + Feedback (iOS Blue) + Sair */}
        <div className="flex items-center gap-2">
          {shouldShowBack && (
            <button
              onClick={() => navigate('/chat')}
              className="px-2 py-2 rounded-[18px] hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]"
              aria-label="Voltar ao chat"
              title="Voltar ao chat"
            >
              <ArrowLeft className="h-5 w-5 text-slate-900" />
            </button>
          )}

          {/* 🔵 Feedback no iOS Blue */}
          <a
            href="https://feedback777.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="
              px-3 py-1.5 rounded-[14px]
              text-white text-sm
              bg-[#007AFF]
              hover:opacity-95 active:opacity-90
              border border-transparent
              shadow-[0_1px_0_rgba(0,0,0,0.04)]
              transition
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[#007AFF]/40
            "
            style={{ backgroundColor: IOS_BLUE }}
          >
            Feedback
          </a>

          {onLogout && (
            <button
              onClick={onLogout}
              className="
                px-3 py-1.5 rounded-[14px]
                bg-black/[0.04] hover:bg-black/[0.06]
                border border-black/[0.08]
                text-slate-900 text-sm
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]
              "
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
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
              fixed top-0 left-0 z-[80] h-svh w-[86vw] max-w-[340px]
              bg-white rounded-r-[26px]
              border-r border-black/[0.06]
              shadow-[0_24px_60px_rgba(16,24,40,0.18)]
              pt-[env(safe-area-inset-top)] overflow-y-auto
              flex flex-col
            "
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
              <EcoBubbleOneEye variant="icon" size={24} state="focus" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="p-2 rounded-[18px] hover:bg-black/[0.05]"
              >
                <X className="h-5 w-5 text-slate-900" />
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

              {showBackButton && (
                <button onClick={() => { setDrawerOpen(false); navigate(-1); }} className={navItem(false)}>
                  <ArrowLeft className={iconCls} strokeWidth={1.75} />
                  <span className={labelCls}>Voltar</span>
                </button>
              )}
            </nav>

            <div className="mt-auto px-4 py-4 flex items-center justify-between border-t border-black/[0.06]">
              <span className="text-[10px] leading-none text-slate-600 tabular-nums select-none">{VERSION}</span>
              {onLogout && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="
                    px-3 py-1.5 rounded-[14px]
                    bg-black/[0.04] hover:bg-black/[0.06]
                    border border-black/[0.08]
                    text-slate-900 text-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/[0.08]
                  "
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
