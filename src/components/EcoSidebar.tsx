import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  MessageCircle,
  Brain,
  BookOpen,
  Mic,
  Settings,
  LogOut,
  Home
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/app', icon: MessageCircle, label: 'Chat' },
  { to: '/memory', icon: Brain, label: 'Memórias' },
  { to: '/voice', icon: Mic, label: 'Voz' },
  { to: '/', icon: Home, label: 'Início' },
];

export default function EcoSidebar({ isOpen = true, onClose, className }: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay para mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={clsx(
              'fixed left-0 top-0 z-50 h-full w-[260px] md:sticky md:z-auto',
              'bg-white/50 backdrop-blur-md border-r border-[var(--eco-line)]',
              'flex flex-col',
              'shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6 border-b border-[var(--eco-line)]">
              <h2 className="text-2xl font-display font-normal text-[var(--eco-text)] tracking-tight">
                ECO
              </h2>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg',
                        'text-[15px] font-inter font-normal',
                        'transition-all duration-300 ease-out',
                        'group relative overflow-hidden',
                        isActive
                          ? 'bg-gradient-to-r from-[var(--eco-user)] to-[var(--eco-accent)] text-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]'
                          : 'text-[var(--eco-text)] hover:bg-[var(--eco-bubble)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Background gradient animation on hover */}
                        {!isActive && (
                          <span className="absolute inset-0 bg-gradient-to-r from-[var(--eco-user)]/5 to-[var(--eco-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}

                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          className={clsx(
                            'relative z-10 transition-transform duration-300',
                            isActive && 'scale-110'
                          )}
                        />
                        <span className="relative z-10">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-6 border-t border-[var(--eco-line)] space-y-2">
              <NavLink
                to="/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    'text-[15px] font-inter font-normal',
                    'transition-all duration-300 ease-out',
                    'group relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-r from-[var(--eco-user)] to-[var(--eco-accent)] text-white'
                      : 'text-[var(--eco-text)] hover:bg-[var(--eco-bubble)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <span className="absolute inset-0 bg-gradient-to-r from-[var(--eco-user)]/5 to-[var(--eco-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    <Settings size={20} strokeWidth={1.5} className="relative z-10" />
                    <span className="relative z-10">Configurações</span>
                  </>
                )}
              </NavLink>

              <button
                onClick={() => {
                  // Handle logout
                  console.log('Logout clicked');
                }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg w-full',
                  'text-[15px] font-inter font-normal',
                  'text-[var(--eco-muted)] hover:text-[var(--eco-text)]',
                  'transition-all duration-300 ease-out',
                  'hover:bg-[var(--eco-bubble)]',
                  'group relative overflow-hidden'
                )}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[var(--eco-user)]/5 to-[var(--eco-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <LogOut size={20} strokeWidth={1.5} className="relative z-10" />
                <span className="relative z-10">Sair</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
