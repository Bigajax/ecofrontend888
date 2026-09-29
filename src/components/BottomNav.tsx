import { NavLink } from 'react-router-dom';
import { Astro } from '@/components/reino/ReinoScene';
import '@/components/reino/reino.css';

type NavItem = { to: string; label: string; end: boolean };

// Barra do reino: palavras, não ícones. O astro marca onde você está.
const navItems: NavItem[] = [
  { to: '/app', label: 'Hoje', end: true },
  { to: '/app/mapa', label: 'Mapa', end: false },
  { to: '/app/chat', label: 'Eco', end: false },
  { to: '/app/meditacoes-sono', label: 'Sono', end: false },
  { to: '/app/configuracoes', label: 'Perfil', end: false },
];

export default function BottomNav() {
  return (
    <nav className="reino-corpo reino-barra md:hidden" aria-label="Principal">
      <ul className="reino-barra__lista">
        {navItems.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="reino-barra__item">
              {({ isActive }) => (
                <>
                  <Astro className={`reino-barra__astro${isActive ? ' is-ativo' : ''}`} />
                  <span aria-current={isActive ? 'page' : undefined}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
