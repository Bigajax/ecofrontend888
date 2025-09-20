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
const navItem = (active: boolean, collapsed: boolean) =>
  [
    'flex items-center gap-2 rounded-xl transition-all duration-150',
    collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
    'h-11 min-h-[44px]',
    active ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-slate-50 active:bg-slate-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200',
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
      document.documentElement.style.setProperty('--eco-sidebar-w', isCollapsed ? '64px' : '256px');
    }
  };
  useEffect(() => { applySidebarWidth(collapsed); }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
    applySidebarWidth(next);
  };

  /* Topbar height var (para MainLayout) */
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

  /* ---------- TOP BAR (mobile) — agora FIXED ---------- */
  const TopBar = (
    <header
      ref={topRef}
      className="
        fixed top-0 left-0 right-0 z-[70]
        bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80
        border-b border-gray-100
        pt-[env(safe-area-inset-top)]
      "
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
              className="ml-1 p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
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
          <span className="hidden sm:inline text-[10px] leading-none text-slate-400 tabular-nums select-none" aria-label={`Versão ${VERSION}`} title={`Versão ${VERSION}`}>
            {VERSION}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              aria-label="Sair" title="Sair"
            >
              <LogOut className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </header>
  );

  /* ---------- LEFT SIDEBAR (desktop) ---------- */
  const LeftBar = (
    <aside
      className="fixed left-0 top-0 z-50 h-dvh bg-white border-r border-gray-100
                 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]
                 overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width: 'var(--eco-sidebar-w, 256px)' }}
      aria-label="Barra lateral"
    >
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
          className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full border border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center text-gray-600/90 hover:text-gray-800 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>

        <div className="mx-4 h-px bg-gray-100" />

        <nav className={`mt-2 flex flex-col gap-1.5 ${collapsed ? 'px-1' : 'px-3'}`}>
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
              className={`rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 ${
                collapsed
                  ? 'px-2 py-2 h-11 min-h-[44px] w-full flex items-center justify-center hover:bg-slate-50 active:bg-slate-100'
                  : 'px-3 py-2 h-11 min-h-[44px] w-full flex items-center gap-2 hover:bg-slate-50 active:bg-slate-100'
              }`}
              aria-label="Voltar"
            >
              <ArrowLeft className={iconCls} strokeWidth={1.75} />
              {!collapsed && <span className="text-[15px] text-slate-800 select-none">Voltar</span>}
            </button>
          )}
        </nav>

        <div className="mt-auto px-4 py-3 flex items-center gap-2">
          {mensagemDeSucesso && !collapsed && (
            <span className="text-xs text-emerald-600 font-medium truncate max-w-[9.5rem]">{mensagemDeSucesso}</span>
          )}
          <span className={`text-[10px] leading-none text-slate-400 tabular-nums select-none ${collapsed ? 'mr-auto' : ''}`} aria-label={`Versão ${VERSION}`} title={`Versão ${VERSION}`}>
            {VERSION}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-auto p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
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
