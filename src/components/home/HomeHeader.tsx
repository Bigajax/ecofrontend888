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
      <header className="sticky top-0 z-40 hidden border-b border-[var(--eco-line)]/20 bg-white/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-8 py-5">
          {/* Logo */}
          <div className="absolute left-8 flex items-center gap-2">
            <EcoBubbleOneEye variant="icon" size={28} />
            <span className="font-display text-base font-normal text-[var(--eco-text)]">
              ECOTOPIA
            </span>
          </div>

          {/* Navigation - Centered */}
          <nav className="flex items-end gap-12 pb-2">
            {navItems.map((item, index) => (
              <div key={item.path} className="relative flex flex-col items-center pt-3">
                {/* Active indicator line */}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-3 h-1.5 bg-purple-600 rounded-full"
                    style={{ left: '4px', right: '4px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                )}

                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2.5 text-[15px] font-medium transition-colors duration-300 ${
                    isActive(item.path)
                      ? 'text-purple-600'
                      : 'text-gray-400 hover:text-purple-600'
                  }`}
                >
                  {index === 0 && (
                    <Home
                      size={20}
                      strokeWidth={1.5}
                      className={`transition-colors duration-300 ${isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}`}
                    />
                  )}
                  {index === 1 && (
                    <Search
                      size={20}
                      strokeWidth={1.5}
                      className={`transition-colors duration-300 ${isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}`}
                    />
                  )}
                  {item.label}
                </button>
              </div>
            ))}
          </nav>

          {/* Avatar - Right */}
          <div className="absolute right-8 flex h-10 w-10 items-center justify-center rounded-full bg-slate-700" />
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--eco-line)]/20 bg-white/95 backdrop-blur-sm md:hidden">

        <div className="flex items-center justify-between px-8 py-5">
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
              className="border-t border-[var(--eco-line)]/20 bg-white/95 px-8 py-4"
            >
              <nav className="flex flex-col gap-2">
                {navItems.map((item, index) => (
                  <div key={item.path} className="relative flex flex-col items-start pt-2">
                    {/* Active indicator line */}
                    {isActive(item.path) && (
                      <motion.div
                        layoutId="mobileNavIndicator"
                        className="absolute -top-2 h-1.5 bg-purple-600 rounded-full"
                        style={{ left: '4px', right: '4px' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      />
                    )}

                    <button
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 px-4 py-3 text-[15px] font-medium transition-colors duration-300 ${
                        isActive(item.path)
                          ? 'text-purple-600'
                          : 'text-gray-400 hover:text-purple-600'
                      }`}
                    >
                      {index === 0 && (
                        <Home
                          size={20}
                          strokeWidth={1.5}
                          className={`transition-colors duration-300 ${isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}`}
                        />
                      )}
                      {index === 1 && (
                        <Search
                          size={20}
                          strokeWidth={1.5}
                          className={`transition-colors duration-300 ${isActive(item.path) ? 'text-purple-600' : 'text-gray-400'}`}
                        />
                      )}
                      {item.label}
                    </button>
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
