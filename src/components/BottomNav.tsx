import { NavLink } from 'react-router-dom';
import { Home, Play, Moon, Music, User } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
  const navItems = [
    { to: '/app', icon: Home, label: 'Hoje' },
    { to: '/app/programas', icon: Play, label: 'Programas' },
    { to: '/app/sono', icon: Moon, label: 'Sono' },
    { to: '/app/sons', icon: Music, label: 'Sons' },
    { to: '/app/configuracoes', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-200 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]',
                  isActive
                    ? 'text-[#6EC8FF]'
                    : 'text-gray-600 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="transition-all duration-200"
                  />
                  <span className={clsx(
                    'text-xs font-medium transition-all duration-200',
                    isActive ? 'font-semibold' : 'font-normal'
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
