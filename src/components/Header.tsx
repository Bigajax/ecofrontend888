import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, BookOpen, HeartPulse, BarChart3, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  mensagemDeSucesso?: string | null;
  onLogout?: () => void;
  variant?: 'top' | 'left' | 'auto';
}

const VERSION = '222'; // ← versão exibida ao lado do botão de sair

const navItem = (active: boolean, collapsed: boolean) =>
  [
    'flex items-center gap-2 rounded-lg transition-colors duration-150',
    collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2',
    'h-11 min-h-[44px]',
    active ? 'bg-gray-100 ring-1 ring-gray-200' : 'hover:bg-gray-100 active:bg-gray-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200',
  ].join(' ');

const iconCls = 'h-5 w-5 text-gray-700';
const STORAGE_KEY = 'eco.sidebar.collapsed';

/* Bolha ECO */
const EcoBubble: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="ecoGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
        gradientTransform="translate(12 12) rotate(45) scale(28)">
        <stop offset="0" stopColor="#9AD5FF" />
        <stop offset="0.55" stopColor="#CDEBFF" />
        <stop offset="1" stopColor="#FFFFFF" />
      </radialGradient>
    </defs>
    <circle cx="20" cy="20" r="14" fill="url(#ecoGrad)" stroke="#0F172A" strokeOpacity="0.08" />
    <circle cx="14" cy="14" r="3" fill="#FFFFFF" fillOpacity="0.9" />
  </svg>
);

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

  const applySidebarWidth = (isCollapsed: boolean) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--eco-sidebar-w', isCollapsed ? '64px' : '240px');
    }
  };
  useEffect(() => { applySidebarWidth(collapsed); }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
    applySidebarWidth(next);
  };

  /* ---------- TOP BAR (mobile) ---------- */
  const TopBar = (
    <header className="sticky top-0 z-50 bg-white pt-[env(safe-area-inset-top)] border-b border-gray-100">
      <div className="grid grid-cols-3 items-center px-3 md:px-6 py-2.5">
        <div className="flex items-center gap-1.5">
          <NavLink to="/memory" end className={({ isActive }) => navItem(isActive, false)} aria-label="Memórias" title="Memórias">
            <BookOpen className={iconCls} strokeWidth={2} />
          </NavLink>
          <NavLink to="/memory/profile" className={({ isActive }) => navItem(isActive, false)} aria-label="Perfil Emocional" title="Perfil Emocional">
            <HeartPulse className={iconCls} />
          </NavLink>
          <NavLink to="/memory/report" className={({ isActive }) => navItem(isActive, false)} aria-label="Relatórios" title="Relatórios">
            <BarChart3 className={iconCls} />
          </NavLink>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="ml-1 p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              aria-label="Voltar" title="Voltar"
            >
              <ArrowLeft className={iconCls} />
            </button>
          )}
        </div>

        <Link to="/chat" className="text-center font-normal tracking-tight text-lg md:text-xl text-gray-900 truncate hover:opacity-90" title={title}>
          {title || 'Eco'}
        </Link>

        <div className="flex items-center justify-end gap-2">
          {mensagemDeSucesso && (
            <span className="text-xs md:text-sm text-green-600 font-medium truncate max-w-[40vw] text-right">
              {mensagemDeSucesso}
            </span>
          )}

          {/* versão minimalista à esquerda do botão sair */}
          <span
            className="text-[10px] leading-none text-slate-400 tabular-nums select-none"
            aria-label={`Versão ${VERSION}`}
            title={`Versão ${VERSION}`}
          >
            {VERSION}
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              aria-label="Sair" title="Sair"
            >
              <LogOut className={iconCls} />
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
      style={{ width: 'var(--eco-sidebar-w, 240px)' }}
      aria-label="Barra lateral"
    >
      <div className="relative flex h-full flex-col">
        <div className={`${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'} pt-4 pb-2 flex items-center`}>
          <Link to="/chat" className="flex items-center gap-2 hover:opacity-90" title={title}>
            <EcoBubble size={22} />
            {!collapsed && <span className="text-lg font-semibold tracking-wide text-gray-900">ECO</span>}
          </Link>
        </div>

        <button
          onClick={toggleCollapsed}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full
                     border border-gray-200 bg-white/95 backdrop-blur-sm
                     shadow-sm hover:shadow-md transition hover:scale-[1.02] active:scale-[0.98]
                     flex items-center justify-center text-gray-600/90 hover:text-gray-800 z-20
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>

        <div className="mx-4 h-px bg-gray-100" />

        <nav className={`mt-2 flex flex-col gap-1.5 ${collapsed ? 'px-1' : 'px-3'}`}>
          <NavLink to="/memory" end className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Memórias">
            <BookOpen className={iconCls} strokeWidth={2} />
            {!collapsed && <span className="text-sm font-medium text-gray-800 select-none">Memórias</span>}
          </NavLink>

          <NavLink to="/memory/profile" className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Perfil Emocional">
            <HeartPulse className={iconCls} />
            {!collapsed && <span className="text-sm font-medium text-gray-800 select-none">Perfil Emocional</span>}
          </NavLink>

          <NavLink to="/memory/report" className={({ isActive }) => navItem(isActive, collapsed)} aria-label="Relatórios">
            <BarChart3 className={iconCls} />
            {!collapsed && <span className="text-sm font-medium text-gray-800 select-none">Relatórios</span>}
          </NavLink>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className={`rounded-lg transition focus-visible:outline-none
                          focus-visible:ring-2 focus-visible:ring-gray-200
                          ${collapsed
                            ? 'px-2 py-2 h-11 min-h-[44px] w-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200'
                            : 'px-2.5 py-2 h-11 min-h-[44px] w-full flex items-center gap-2 hover:bg-gray-100 active:bg-gray-200'}`}
              aria-label="Voltar"
            >
              <ArrowLeft className={iconCls} />
              {!collapsed && <span className="text-sm text-gray-800 select-none">Voltar</span>}
            </button>
          )}
        </nav>

        {/* rodapé da sidebar */}
        <div className="mt-auto px-4 py-3 flex items-center gap-2">
          {mensagemDeSucesso && !collapsed && (
            <span className="text-xs text-green-600 font-medium truncate max-w-[9.5rem]">
              {mensagemDeSucesso}
            </span>
          )}

          {/* versão minimalista ao lado ESQUERDO do ícone de sair */}
          <span
            className={`text-[10px] leading-none text-slate-400 tabular-nums select-none ${collapsed ? 'mr-auto' : ''}`}
            aria-label={`Versão ${VERSION}`}
            title={`Versão ${VERSION}`}
          >
            {VERSION}
          </span>

          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-auto p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200"
              aria-label="Sair" title="Sair"
            >
              <LogOut className={iconCls} />
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
