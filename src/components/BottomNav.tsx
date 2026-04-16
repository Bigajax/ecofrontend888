import { NavLink } from 'react-router-dom';
import { Home, Play, Music, User } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
  const navItems = [
    { to: '/app', icon: Home, label: 'Hoje' },
    { to: '/app/programas', icon: Play, label: 'Programas' },
    { to: '/app/sons', icon: Music, label: 'Sons' },
    { to: '/app/configuracoes', icon: User, label: 'Perfil' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm pb-safe md:hidden"
      style={{ borderTop: '1px solid rgba(110,200,255,0.20)', boxShadow: '0 -4px 24px rgba(110,200,255,0.10)' }}
    >
      <div className="flex min-h-[60px] items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                clsx(
                  'relative flex min-w-[60px] min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200',
                  isActive
                    ? 'text-[#1E6FA5]'
                    : 'text-gray-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active pill background */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: 'rgba(110,200,255,0.14)' }}
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.5}
                    className="relative z-10 transition-all duration-200"
                  />
                  <span className={clsx(
                    'relative z-10 text-[11px] leading-none transition-all duration-200',
                    isActive ? 'font-bold' : 'font-medium'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
