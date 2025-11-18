import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Home, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EcoBubbleOneEye from '@/components/EcoBubbleOneEye';

export default function HomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/app' },
    { label: 'Explorar', path: '/app/explore' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden border-b border-[var(--eco-line)] bg-white/60 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-4">
          {/* Logo */}
          <div className="absolute left-6 flex items-center gap-2">
            <EcoBubbleOneEye variant="icon" size={28} />
            <span className="font-display text-lg font-normal text-[var(--eco-text)]">
              ECOTOPIA
            </span>
          </div>

          {/* Navigation - Centered */}
          <nav className="flex items-center gap-8">
            {navItems.map((item, index) => (
              <div key={item.path} className="relative">
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-medium transition-all duration-300 ${
                    isActive(item.path)
                      ? 'text-purple-600'
                      : 'text-gray-400 hover:text-purple-600'
                  }`}
                >
                  {index === 0 && (
                    <Home
                      size={18}
                      strokeWidth={1.5}
                      className={isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}
                    />
                  )}
                  {index === 1 && (
                    <Search
                      size={18}
                      strokeWidth={1.5}
                      className={isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}
                    />
                  )}
                  {item.label}
                </button>

                {/* Active indicator line */}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute top-0 left-0 right-0 h-1 bg-purple-600"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            ))}
          </nav>

          {/* Avatar - Right */}
          <div className="absolute right-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-700" />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--eco-line)] bg-white/60 backdrop-blur-md md:hidden">

        <div className="flex items-center justify-between px-4 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <EcoBubbleOneEye variant="icon" size={24} />
            <span className="font-display text-base font-normal text-[var(--eco-text)]">
              ECOTOPIA
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
                {navItems.map((item, index) => (
                  <div key={item.path} className="relative">
                    <button
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-[14px] font-medium transition-all duration-300 ${
                        isActive(item.path)
                          ? 'text-purple-600'
                          : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      {index === 0 && (
                        <Home
                          size={18}
                          strokeWidth={1.5}
                          className={isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}
                        />
                      )}
                      {index === 1 && (
                        <Search
                          size={18}
                          strokeWidth={1.5}
                          className={isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}
                        />
                      )}
                      {item.label}
                    </button>

                    {/* Active indicator line */}
                    {isActive(item.path) && (
                      <motion.div
                        layoutId="mobileNavIndicator"
                        className="absolute top-0 left-0 right-0 h-1 bg-purple-600"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
