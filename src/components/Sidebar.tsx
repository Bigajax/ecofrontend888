import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, BookOpen, Brain, BarChart3, Settings, X, LogOut } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  variant?: 'desktop' | 'mobile' | 'bottom';
  onLogout?: () => void;
  isGuest?: boolean;
}

const navItems = [
  { id: 'chat', label: 'Chat', icon: MessageCircle, path: '/app' },
  { id: 'memories', label: 'Memórias', icon: BookOpen, path: '/app/memory' },
  { id: 'profile', label: 'Perfil', icon: Brain, path: '/app/memory/profile' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, path: '/app/memory/report' },
  { id: 'settings', label: 'Config', icon: Settings, path: '/app/configuracoes' },
];

const FEEDBACK_URL = 'https://feedback777.vercel.app/';

export default function Sidebar({ isOpen = false, onClose, variant = 'desktop', onLogout, isGuest = false }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    if (variant === 'mobile' && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    if (onClose) onClose();
    if (onLogout) onLogout();
  };

  const handleFeedback = () => {
    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer');
  };

  const handleLogin = () => {
    if (onClose) onClose();
    navigate('/register');
  };

  if (variant === 'mobile') {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        {/* Mobile Drawer */}
        <aside
          className={clsx(
            'fixed top-0 left-0 bottom-0 z-50 w-72 bg-white/95 backdrop-blur-xl border-r border-black/5 shadow-2xl lg:hidden',
            'transform transition-transform duration-300 ease-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
            <span className="text-xl font-semibold text-gray-900">ECO</span>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/app' && location.pathname.startsWith(item.path));

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive
                      ? 'bg-eco-baby/10 text-eco-deep'
                      : 'text-gray-700 hover:bg-black/5'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto border-t border-black/5 p-4 space-y-2">
            <button
              onClick={handleFeedback}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-black/5 transition-all"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-sm font-medium">Feedback</span>
            </button>

            {isGuest ? (
              <button
                onClick={handleLogin}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-eco-baby text-white hover:bg-eco-baby/90 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Fazer login</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            )}
          </div>
        </aside>
      </>
    );
  }

  // Bottom Nav Mobile
  if (variant === 'bottom') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-black/10 lg:hidden">
        <div className="flex items-center justify-around h-16 px-2 pb-safe">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/app' && location.pathname.startsWith(item.path));

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 min-w-[60px]',
                  isActive
                    ? 'text-eco-deep'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />
                <span className={clsx(
                  'text-[10px] transition-all duration-200 text-center',
                  isActive ? 'font-semibold' : 'font-normal'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Desktop Sidebar
  return (
    <aside className="hidden lg:flex flex-col w-20 xl:w-24 bg-white/50 backdrop-blur-xl border-r border-black/5 shrink-0">
      <nav className="flex flex-col items-center gap-2 p-3 pt-6 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/app' && location.pathname.startsWith(item.path));

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={clsx(
                'flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl transition-all group',
                isActive
                  ? 'bg-eco-baby/10 text-eco-deep'
                  : 'text-gray-600 hover:bg-black/5 hover:text-gray-900'
              )}
              title={item.label}
            >
              <Icon className="w-6 h-6 shrink-0" />
              <span className="text-[10px] font-medium text-center leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions - Desktop */}
      <div className="border-t border-black/5 p-3 space-y-2">
        <button
          onClick={handleFeedback}
          className="flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl text-gray-600 hover:bg-black/5 hover:text-gray-900 transition-all group"
          title="Feedback"
        >
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="text-[10px] font-medium text-center leading-tight">
            Feedback
          </span>
        </button>

        {isGuest ? (
          <button
            onClick={handleLogin}
            className="flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl bg-eco-baby/10 text-eco-deep hover:bg-eco-baby/20 transition-all"
            title="Fazer login"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="text-[10px] font-medium text-center leading-tight">
              Login
            </span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
            title="Sair"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="text-[10px] font-medium text-center leading-tight">
              Sair
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
