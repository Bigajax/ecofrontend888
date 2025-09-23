import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, BookOpen, Brain, BarChart3, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import EcoBubbleIcon from './EcoBubbleIcon';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  mensagemDeSucesso?: string | null;
  onLogout?: () => void;
  variant?: 'top' | 'left' | 'auto';
}

const VERSION = '222';
const STORAGE_KEY = 'eco.sidebar.collapsed';

const iconCls = 'h-[22px] w-[22px] text-slate-700';

/** Nav item — vidro leve e arredondamento estilo Apple */
const navItem = (active: boolean, collapsed: boolean) =>
  [
    'flex items-center gap-2 transition-all duration-150',
    collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
    'h-11 min-h-[44px]',
    'rounded-[18px]',
    active
      ? 'bg-white/18 backdrop-blur-xl border border-white/40 shadow-[0_8px_22px_rgba(16,24,40,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]'
      : 'hover:bg-white/12 hover:backdrop-blur-lg hover:border hover:border-white/30 active:bg-white/16',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35',
  ].join(' ');

const readCollapsed = () => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  mensagemDeSucesso,
  onLogout,
  variant = 'auto',
}) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed());

  /* Sidebar width var */
  const applySidebarWidth = (isCollapsed: boolean) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--eco-sidebar-w', isCollapsed ? '72px' : '264px');
    }
  };
  useEffect(() => { applySidebarWidth(collapsed); }, []); // mount

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
    applySidebarWidth(next);
  };

  /* Topbar height var */
  const topRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    document.documentElement.style.setProperty('--eco-topbar-h', '56px'); // fallback
    if (!topRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const h = topRef.current?.getBoundingClientRect().height ?? 56;
      document.documentElement.style.setProperty('--eco-topbar-h', `${Math.round(h)}px`);
    });
    ro.observe(topRef.current);
    const h = topRef.current?.getBoundingClientRect().height ?? 56;
    document.documentElement.style.setProperty('--eco-topbar-h', `${Math.round(h)}px`);
    return () => ro.disconnect();
  }, []);

  /* ---------- TOP BAR (mobile) — translúcido tipo “pill” ---------- */
  const TopBar = (
    <header
      ref={topRef}
      className="
        fixed top-0 left-0 right-0 z-[70]
        bg-white/10 supports-backdrop:bg-white/8
        backdrop-blur-2xl border-b border-white/25
        shadow-[0_8px_24px_rgba(16,24,40,0.06)]
        rounded-b-[22px]
        pt-[env(safe-area-inset-top)]
      "
      /* pequeno degradê lateral para dar aquele fade do exemplo */
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2.5 px-4 sm:px-6 py-2.5">
        {/* ESQUERDA */}
        <div className="flex items-center gap-2">
          <NavLink to="/memory" end className={({ isActive }) => navItem(isActive, false)} aria-label="Memórias" title="Memórias">
            <BookOpen className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
          </NavLink>
          <NavLink to="/memory/profile" className={({ isActive }) => navItem(isActive, false)} aria-label="Perfil Emocional" title="Perfil Emocional">
            <Brain className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
          </NavLink>
          <NavLink to="/memory/report" className={({ isActive }) => navItem(isActive, false)} aria-label="Relatórios" title="Relatórios">
            <BarChart3 className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
          </NavLink>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="ml-1 px-2 py-2 rounded-[18px] hover:bg-white/12 hover:backdrop-blur-lg border border-transparent hover:border-white/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              aria-label="Voltar" title="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* CENTRO */}
        <Link to="/chat" title={title} className="flex items-center justify-center gap-2 select-none hover:opacity-95">
          <EcoBubbleIcon size={24} className="translate-y-[1px]" />
          <span className="max-[360px]:hidden text-[17px] md:text-[20px] leading-none font-semibold tracking-[-0.01em] text-slate-900">
            {title || 'ECO'}
          </span>
        </Link>

        {/* DIREITA */}
        <div className="flex items-center justify-end gap-2">
          <span className="hidden sm:inline text-[10px] leading-none text-slate-500/90 tabular-nums select-none" aria-label={`Versão ${VERSION}`} title={`Versão ${VERSION}`}>
            {VERSION}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-[18px] hover:bg-white/12 hover:backdrop-blur-lg border border-transparent hover:border-white/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              aria-label="Sair" title="Sair"
            >
              <LogOut className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </header>
  );

  /* ---------- LEFT SIDEBAR (desktop) — super translúcida ---------- */
  const LeftBar = (
    <aside
      className="
        fixed left-0 top-0 z-50 h-svh
        bg-white/6 supports-backdrop:bg-white/5
        backdrop-blur-2xl border-r border-white/25
        shadow-[0_24px_60px_rgba(16,24,40,0.10)]
        rounded-r-[28px] md:rounded-r-[32px]
        pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]
        overflow-hidden transition-[width] duration-200 ease-out
      "
      style={{ width: 'var(--eco-sidebar-w, 264px)' }}
      aria-label="Barra lateral"
    >
      {/* glow/luz lateral sutil */}
      <div
        className="pointer-events-none absolute inset-y-0 -right-6 w-12"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0))',
        }}
      />
      <div className="relative flex h-full flex-col">
        <div className={`${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'} pt-4 pb-2 flex items-center`}>
          <Link to="/chat" className="flex items-center gap-2 hover:opacity-95" title={title}>
            <EcoBubbleIcon size={28} className="translate-y-[1px]" />
            {!collapsed && (
              <span className="text-[19px] leading-none font-semibold tracking-[-0.01em] text-slate-900">ECO</span>
            )}
          </Link>
        </div>

        <button
          onClick={toggleCollapsed}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="
            absolute top-2.5 right-2.5 h-9 w-9 rounded-full
            border border-white/35 bg-white/14 supports-backdrop:bg-white/12 backdrop-blur-xl
            shadow-[0_8px_22px_rgba(16,24,40,0.10),inset_0_1px_0_rgba(255,255,255,0.45)]
            hover:bg-white/18 transition hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center text-gray-700 z-20
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35
          "
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>

        <div className="mx-5 h-px bg-white/25" />

        <nav className={`mt-2 flex flex-col gap-1.5 ${collapsed ? 'px-1' : 'px-4'}`}>
          <NavLink to="/memory" end className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Memórias">
            <BookOpen className={iconCls} strokeWidth={1.75} />
            {!collapsed && <span className="text-[15px] font-medium tracking-[-0.01em] text-slate-800 select-none">Memórias</span>}
          </NavLink>
          <NavLink to="/memory/profile" className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Perfil Emocional">
            <Brain className={iconCls} strokeWidth={1.75} />
            {!collapsed && <span className="text-[15px] font-medium tracking-[-0.01em] text-slate-800 select-none">Perfil Emocional</span>}
          </NavLink>
          <NavLink to="/memory/report" className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Relatórios">
            <BarChart3 className={iconCls} strokeWidth={1.75} />
            {!collapsed && <span className="text-[15px] font-medium tracking-[-0.01em] text-slate-800 select-none">Relatórios</span>}
          </NavLink>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className={`transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 ${
                collapsed
                  ? 'px-2 py-2 h-11 min-h-[44px] w-full flex items-center justify-center rounded-[18px] hover:bg-white/12 hover:backdrop-blur-lg border border-transparent hover:border-white/25'
                  : 'px-3 py-2 h-11 min-h-[44px] w-full flex items-center gap-2 rounded-[18px] hover:bg-white/12 hover:backdrop-blur-lg border border-transparent hover:border-white/25'
              }`}
              aria-label="Voltar"
            >
              <ArrowLeft className={iconCls} strokeWidth={1.75} />
              {!collapsed && <span className="text-[15px] text-slate-800 select-none">Voltar</span>}
            </button>
          )}
        </nav>

        <div className="mt-auto px-5 py-3 flex items-center gap-2">
          {mensagemDeSucesso && !collapsed && (
            <span className="text-xs text-emerald-600 font-medium truncate max-w-[9.5rem]">{mensagemDeSucesso}</span>
          )}
          <span
            className={`text-[10px] leading-none text-slate-500/90 tabular-nums select-none ${collapsed ? 'mr-auto' : ''}`}
            aria-label={`Versão ${VERSION}`} title={`Versão ${VERSION}`}
          >
            {VERSION}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-auto p-2 rounded-[18px] hover:bg-white/12 hover:backdrop-blur-lg border border-transparent hover:border-white/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
              aria-label="Sair" title="Sair"
            >
              <LogOut className={iconCls} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  if (variant === 'top') return TopBar;
  if (variant === 'left') return LeftBar;

  return (
    <>
      <div className="md:hidden">{TopBar}</div>
      <div className="hidden md:block">{LeftBar}</div>
    </>
  );
};

export default Header;
