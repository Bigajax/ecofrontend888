import { NavLink } from 'react-router-dom';
import { Home, Play, Moon, Music, User } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
  const navItems = [
    { to: '/app', icon: Home, label: 'Hoje' },
    { to: '/app/programas', icon: Play, label: 'Programas' },
    { to: '/app/sons', icon: Music, label: 'Sons' },
    { to: '/app/configuracoes', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe md:hidden">
      <div className="container-content flex min-h-16 items-center justify-around px-fluid-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex min-w-[3.75rem] flex-col items-center justify-center gap-fluid-2xs rounded-lg px-fluid-xs py-fluid-2xs transition-all duration-200',
                  isActive
                    ? 'text-[#6EC8FF]'
                    : 'text-gray-600 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="transition-all duration-200"
                  />
                  <span className={clsx(
                    'text-fluid-xs font-medium transition-all duration-200',
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
