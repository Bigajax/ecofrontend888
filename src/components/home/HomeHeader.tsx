import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

interface HomeHeaderProps {
  onLogout?: () => void;
}

export default function HomeHeader({ onLogout }: HomeHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/app' },
    { label: 'Explorar', path: '/app/explore' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--eco-line)] bg-white/60 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <EcoBubbleOneEye variant="icon" size={28} />
            <span className="font-display text-lg font-normal text-[var(--eco-text)]">
              ECO
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-all duration-300 ${
                  isActive(item.path)
                    ? 'bg-[var(--eco-user)] text-white shadow-[0_2px_10px_rgba(167,132,108,0.2)]'
                    : 'text-[var(--eco-text)] hover:bg-[var(--eco-line)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[14px] text-[var(--eco-muted)]">
                {user.email?.split('@')[0]}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--eco-line)] text-[var(--eco-user)] transition-all duration-300 hover:bg-[var(--eco-line)]"
            >
              <LogOut size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--eco-line)] bg-white/60 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <EcoBubbleOneEye variant="icon" size={24} />
            <span className="font-display text-base font-normal text-[var(--eco-text)]">
              ECO
            </span>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--eco-text)] transition-colors hover:bg-[var(--eco-line)]"
          >
            {mobileMenuOpen ? (
              <X size={24} strokeWidth={1.5} />
            ) : (
              <Menu size={24} strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[var(--eco-line)] bg-[var(--eco-bg)] px-4 py-3"
            >
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-lg px-4 py-3 text-[14px] font-medium transition-all duration-300 ${
                      isActive(item.path)
                        ? 'bg-[var(--eco-user)] text-white'
                        : 'text-[var(--eco-text)] hover:bg-[var(--eco-line)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                <hr className="my-2 border-[var(--eco-line)]" />

                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] font-medium text-[var(--eco-user)] transition-all duration-300 hover:bg-[var(--eco-line)]"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  Sair
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
