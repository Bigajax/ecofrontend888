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

interface SideMenuEcoProps {
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

export default function SideMenuEco({ isOpen = true, onClose, className }: SideMenuEcoProps) {
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
            className="fixed inset-0 z-40 bg-[#38322A]/10 backdrop-blur-sm md:hidden"
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
              'bg-[#FAF9F7] border-r border-[#E8E3DD]/60',
              'flex flex-col',
              'shadow-[0_2px_20px_rgba(56,50,42,0.04)]',
              className
            )}
          >
            {/* Header */}
            <div className="px-5 py-6">
              <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#38322A]/5 backdrop-blur-sm">
                <h2 className="text-2xl font-display font-normal text-[#38322A] tracking-tight">
                  ECO
                </h2>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
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
                        'transition-all duration-200 ease-out',
                        'relative',
                        isActive
                          ? 'bg-[#EDE4DC] text-[#38322A] border-l-4 border-[#A7846C] pl-[14px]'
                          : 'text-[#38322A]/80 hover:bg-[#A7846C]/5'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={20}
                          strokeWidth={1.5}
                          className={clsx(
                            'transition-colors duration-200',
                            isActive ? 'text-[#A7846C]' : 'text-[#38322A]/60'
                          )}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-6 space-y-2">
              <NavLink
                to="/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    'text-[15px] font-inter font-normal',
                    'transition-all duration-200 ease-out',
                    'relative',
                    isActive
                      ? 'bg-[#EDE4DC] text-[#38322A] border-l-4 border-[#A7846C] pl-[14px]'
                      : 'text-[#38322A]/80 hover:bg-[#A7846C]/5'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Settings
                      size={20}
                      strokeWidth={1.5}
                      className={clsx(
                        'transition-colors duration-200',
                        isActive ? 'text-[#A7846C]' : 'text-[#38322A]/60'
                      )}
                    />
                    <span>Configurações</span>
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
                  'text-[#38322A]/80 hover:bg-[#A7846C]/5',
                  'transition-all duration-200 ease-out'
                )}
              >
                <LogOut
                  size={20}
                  strokeWidth={1.5}
                  className="text-[#38322A]/60"
                />
                <span>Sair</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
