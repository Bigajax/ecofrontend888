import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, BookOpen, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  mensagemDeSucesso?: string | null;
  onLogout?: () => void;
  variant?: 'top' | 'left' | 'auto';
}

const navItem = (active: boolean, collapsed: boolean) =>
  `group flex items-center gap-2 rounded-xl ${collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2'}
   transition ${active ? 'bg-gray-100 ring-1 ring-gray-200' : 'hover:bg-gray-100 active:bg-gray-200'}`;

const iconCls = 'h-5 w-5 text-gray-700';
const STORAGE_KEY = 'eco.sidebar.collapsed';

/** Bolha (arquétipo ECO) */
const EcoBubble: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="ecoGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
        gradientTransform="translate(12 12) rotate(45) scale(28)">
        <stop offset="0" stopColor="#9AD5FF"/>
        <stop offset="0.55" stopColor="#CDEBFF"/>
        <stop offset="1" stopColor="#FFFFFF"/>
      </radialGradient>
    </defs>
    <circle cx="20" cy="20" r="14" fill="url(#ecoGrad)" stroke="#0F172A" strokeOpacity="0.08"/>
    <circle cx="14" cy="14" r="3" fill="#FFFFFF" fillOpacity="0.9"/>
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
          <NavLink to="/memory" aria-label="Memórias" title="Memórias"
                   className={({ isActive }) => navItem(isActive, false)}>
            <BookOpen className={iconCls} strokeWidth={2} />
          </NavLink>

          {showBackButton && (
            <button onClick={() => navigate(-1)}
                    className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
                    aria-label="Voltar" title="Voltar">
              <ArrowLeft className={iconCls} />
            </button>
          )}
        </div>

        <Link to="/chat"
              className="text-center font-normal tracking-tight text-lg md:text-xl text-gray-900 truncate hover:opacity-90"
              title={title}>
          {title || 'Eco'}
        </Link>

        <div className="flex items-center justify-end gap-2">
          <AnimatePresence>
            {mensagemDeSucesso && (
              <motion.span initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                           transition={{ duration: 0.25 }}
                           className="text-xs md:text-sm text-green-600 font-medium truncate max-w-[40vw] text-right"
                           title={mensagemDeSucesso}>
                {mensagemDeSucesso}
              </motion.span>
            )}
          </AnimatePresence>

          {onLogout && (
            <button onClick={onLogout}
                    className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
                    aria-label="Sair" title="Sair">
              <LogOut className={iconCls} />
            </button>
          )}
        </div>
      </div>
    </header>
  );

  /* ---------- LEFT SIDEBAR ---------- */
  const LeftBar = (
    <aside
      className="group fixed left-0 top-0 z-50 h-dvh bg-white border-r border-gray-100
                 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]
                 overflow-hidden transition-[width] duration-200 ease-out"
      style={{ width: 'var(--eco-sidebar-w, 240px)' }}
      aria-label="Barra lateral"
    >
      <div className="relative flex h-full flex-col">
        {/* topo: bolha + ECO */}
        <div className={`${collapsed ? 'px-3 justify-center' : 'px-4 justify-between'} pt-4 pb-2 flex items-center`}>
          <Link to="/chat" className="flex items-center gap-2 hover:opacity-90" title={title}>
            <EcoBubble size={22} />
            {!collapsed && <span className="text-lg font-semibold tracking-wide text-gray-900">ECO</span>}
          </Link>
        </div>

        {/* botão dentro da largura (right-2) */}
        <button
          onClick={toggleCollapsed}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapsed(); } }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="absolute top-[12px] right-2 h-8 w-8 rounded-full
                     border border-gray-200 bg-white/95 backdrop-blur-sm
                     shadow-sm hover:shadow-md transition hover:scale-[1.02] active:scale-[0.98]
                     flex items-center justify-center text-gray-600/90 hover:text-gray-800 z-20"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>

        {/* divisor */}
        <div className="mx-4 h-px bg-gray-100" />

        {/* NAV */}
        <nav className={`mt-2 flex flex-col gap-1.5 overflow-hidden ${collapsed ? 'px-1' : 'px-3'}`}>
          <NavLink to="/memory"
                   className={({ isActive }) => navItem(isActive, collapsed)}
                   aria-label="Memórias" title="Memórias">
            <BookOpen className={iconCls} strokeWidth={2} />
            {!collapsed && (
              <motion.span
                key={`mem-label-${collapsed ? 'off' : 'on'}`}
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                className="text-sm font-medium text-gray-800 select-none"
              >
                Memórias
              </motion.span>
            )}
          </NavLink>

          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className={`rounded-xl hover:bg-gray-100 active:bg-gray-200 transition
                          ${collapsed ? 'px-2 py-2 flex items-center justify-center' : 'px-2.5 py-2 flex items-center gap-2'}`}
              aria-label="Voltar" title="Voltar"
            >
              <ArrowLeft className={iconCls} />
              {!collapsed && <span className="text-sm text-gray-800 select-none">Voltar</span>}
            </button>
          )}
        </nav>

        {/* rodapé */}
        <div className="mt-auto px-4 py-3 flex items-center justify-between gap-2">
          <AnimatePresence>
            {mensagemDeSucesso && !collapsed && (
              <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                           transition={{ duration: 0.25 }}
                           className="text-xs text-green-600 font-medium truncate max-w-[9.5rem]"
                           title={mensagemDeSucesso}>
                {mensagemDeSucesso}
              </motion.span>
            )}
          </AnimatePresence>

          {onLogout && (
            <button onClick={onLogout}
                    className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition ml-auto"
                    aria-label="Sair" title="Sair">
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
