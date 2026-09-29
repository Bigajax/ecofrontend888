import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { GlifoEco, GlifoHoje, GlifoMapa, GlifoPerfil, GlifoSono } from '@/components/reino/ReinoGlifos';
import { getReinoMood } from '@/components/reino/reinoMood';
import '@/components/reino/reino.css';

type NavItem = { to: string; label: string; end: boolean; glifo: (ativo: boolean) => ReactNode };

// Barra do reino: cada aba é um lugar pintado. A ativa acende em anil e ocre,
// com uma pincelada embaixo; o "Hoje" mostra o céu da hora.
export default function BottomNav() {
  const mood = getReinoMood();

  const navItems: NavItem[] = [
    { to: '/app', label: 'Hoje', end: true, glifo: (a) => <GlifoHoje ativo={a} mood={mood} className="reino-barra__glifo" /> },
    { to: '/app/mapa', label: 'Mapa', end: false, glifo: (a) => <GlifoMapa ativo={a} className="reino-barra__glifo" /> },
    { to: '/app/chat', label: 'Eco', end: false, glifo: (a) => <GlifoEco ativo={a} className="reino-barra__glifo" /> },
    { to: '/app/meditacoes-sono', label: 'Sono', end: false, glifo: (a) => <GlifoSono ativo={a} className="reino-barra__glifo" /> },
    {
      to: '/app/configuracoes',
      label: 'Perfil',
      end: false,
      glifo: (a) => <GlifoPerfil ativo={a} className="reino-barra__glifo" />,
    },
  ];

  return (
    <nav className="reino-corpo reino-barra md:hidden" aria-label="Principal">
      <ul className="reino-barra__lista">
        {navItems.map(({ to, label, end, glifo }) => (
          <li key={to}>
            <NavLink to={to} end={end} className="reino-barra__item">
              {({ isActive }) => (
                <>
                  {glifo(isActive)}
                  <span className="reino-barra__rotulo" aria-current={isActive ? 'page' : undefined}>
                    {label}
                  </span>
                  <svg className="reino-barra__pincel" viewBox="0 0 40 6" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 3.6C10 1.8 22 2.4 38 3c-6 2.2-24 2.6-36 .6Z" />
                  </svg>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
