import { NavLink } from 'react-router-dom';
import { Home, Compass, MoonStar, AudioLines, UserRound } from 'lucide-react';

const navItems = [
  { to: '/app',               icon: Home,       label: 'Hoje',     end: true  },
  { to: '/app/programas',     icon: Compass,    label: 'Explorar', end: false },
  { to: '/app/meditacoes-sono', icon: MoonStar, label: 'Sono',     end: false },
  { to: '/app/sons',          icon: AudioLines, label: 'Sons',     end: false },
  { to: '/app/configuracoes', icon: UserRound,  label: 'Perfil',   end: false },
];

// Azul vivo do item ativo + tom escuro quase-preto dos inativos (estilo Meditopia)
const ACTIVE_BLUE = '#2E7BFF';
const INACTIVE_DARK = '#0D1B2A';

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Pill esguio com glassmorphism */}
      <div
        className="mx-4 mb-2 flex items-center justify-around gap-1 rounded-full px-1.5 py-1"
        style={{
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow:
            '0 6px 22px rgba(13, 27, 42, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
        }}
      >
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className="flex-1 min-w-0">
            {({ isActive }) => (
              <div
                className="flex flex-col items-center justify-center gap-[3px] rounded-full py-1.5 transition-colors duration-200"
                style={{
                  backgroundColor: isActive ? 'rgba(46, 123, 255, 0.10)' : 'transparent',
                }}
              >
                <Icon
                  size={23}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  absoluteStrokeWidth
                  style={{ color: isActive ? ACTIVE_BLUE : INACTIVE_DARK }}
                />
                <span
                  className="text-[11px] font-semibold leading-none tracking-tight"
                  style={{ color: isActive ? ACTIVE_BLUE : INACTIVE_DARK }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
