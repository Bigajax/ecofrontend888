import { NavLink } from 'react-router-dom';
import { Home, Compass, Moon, Music2, User } from 'lucide-react';

const navItems = [
  { to: '/app',               icon: Home,    label: 'Início',   end: true  },
  { to: '/app/programas',     icon: Compass, label: 'Explorar', end: false },
  { to: '/app/meditacoes-sono', icon: Moon,  label: 'Sono',     end: false },
  { to: '/app/sons',          icon: Music2,  label: 'Sons',     end: false },
  { to: '/app/configuracoes', icon: User,    label: 'Perfil',   end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--neutral-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] py-2 min-h-[44px]"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
