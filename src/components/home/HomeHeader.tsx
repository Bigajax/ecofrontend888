import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Play, Moon, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [explorarOpen, setExplorarOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const explorarRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Hoje', path: '/app' },
    { label: 'Explorar', path: '/app/explore' },
  ];

  const explorarOptions = [
    { label: 'Programas', path: '/app/programas', icon: Play },
    { label: 'Sons', path: '/app/sons', icon: Music },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (explorarRef.current && !explorarRef.current.contains(event.target as Node)) {
        setExplorarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar dropdown ao pressionar ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExplorarOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--eco-line)]/20 bg-white/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-8 py-5">
          {/* Logo */}
          <button
            onClick={() => navigate('/app')}
            className="absolute left-8 transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src="/images/ECOTOPIA-Natal.webp"
              alt="Ecotopia"
              className="h-20"
            />
          </button>

          {/* Navigation - Centered */}
          <nav className="flex items-end gap-12 pb-2">
            {navItems.map((item, index) => {
              const active = isActive(item.path);
              const hovered = hoveredIndex === index;
              // Verifica se há algum item ativo
              const hasActiveItem = navItems.some(navItem => isActive(navItem.path));
              // Só mostra hover se o item NÃO estiver ativo E não houver item ativo
              const showIndicator = active || (hovered && !hasActiveItem);

              return (
                <div
                  key={item.path}
                  className="relative flex flex-col items-center pt-3"
                  ref={index === 1 ? explorarRef : null}
                  onMouseEnter={() => {
                    setHoveredIndex(index);
                    if (index === 1) setExplorarOpen(true);
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    if (index === 1) setExplorarOpen(false);
                  }}
                >
                  {/* Indicator line - aparece no hover e quando ativo */}
                  <AnimatePresence>
                    {showIndicator && (
                      <motion.div
                        layoutId={active ? "navIndicatorActive" : undefined}
                        className={`absolute -top-3 h-1.5 rounded-full ${
                          active
                            ? 'bg-[#6EC8FF]'
                            : 'bg-[#6EC8FF]/50'
                        }`}
                        style={{ left: '4px', right: '4px' }}
                        initial={{ opacity: 0, scaleX: 0.5 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0.5 }}
                        transition={{
                          duration: 0.2,
                          ease: 'easeOut'
                        }}
                      />
                    )}
                  </AnimatePresence>

                <button
                  onClick={() => {
                    if (index === 1) {
                      setExplorarOpen(!explorarOpen);
                    } else {
                      navigate(item.path);
                      setExplorarOpen(false);
                    }
                  }}
                  className={`flex items-center gap-2.5 text-[15px] font-medium transition-colors duration-300 ${
                    isActive(item.path) || (index === 1 && explorarOpen)
                      ? 'text-[#6EC8FF]'
                      : 'text-gray-400 hover:text-[#6EC8FF]'
                  }`}
                >
                  {index === 0 && (
                    <Home
                      size={20}
                      strokeWidth={1.5}
                      className={`transition-colors duration-300 ${isActive(item.path) ? 'text-[#6EC8FF]' : 'text-gray-400'}`}
                    />
                  )}
                  {index === 1 && (
                    <Search
                      size={20}
                      strokeWidth={1.5}
                      className={`transition-colors duration-300 ${isActive(item.path) || explorarOpen ? 'text-[#6EC8FF]' : 'text-gray-400'}`}
                    />
                  )}
                  {item.label}
                </button>

                {/* Dropdown do Explorar - Desktop */}
                {index === 1 && (
                  <AnimatePresence>
                    {explorarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="py-2">
                          {explorarOptions.map((option) => {
                            const IconComponent = option.icon;
                            return (
                              <button
                                key={option.path}
                                onClick={() => {
                                  navigate(option.path);
                                  setExplorarOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[#38322A] hover:bg-gray-50 transition-colors duration-150"
                              >
                                <IconComponent className="h-5 w-5" strokeWidth={2} />
                                <span className="text-[15px] font-medium">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
              );
            })}
          </nav>

          {/* Avatar - Right */}
          <button
            onClick={() => navigate('/app/configuracoes')}
            className="absolute right-8 flex h-10 w-10 items-center justify-center rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
          >
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6EC8FF] to-[#4BA8E0] text-white text-sm font-semibold">
                {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Header - Logo Only */}
      <header className="sticky top-0 z-40 border-b border-[var(--eco-line)]/20 bg-white/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-center px-8 py-5">
          <button
            onClick={() => navigate('/app')}
            className="transition-transform active:scale-95"
          >
            <img
              src="/images/ECOTOPIA-Natal.webp"
              alt="Ecotopia"
              className="h-16"
            />
          </button>
        </div>
      </header>
    </>
  );
}
