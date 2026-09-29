import type { ReactNode } from 'react';
import type { ReinoMood } from './reinoMood';

/**
 * Glifos da navegação: pequenos desenhos a pincel de lugares do reino, não ícones
 * de linha. Traço em currentColor; o detalhe quente (ocre) só acende na aba ativa.
 */
interface GlifoProps {
  ativo: boolean;
  className?: string;
}

const OCRE = '#EDB85A';
const acento = (ativo: boolean) => (ativo ? OCRE : 'currentColor');

function Base({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Hoje: o céu da hora. Sol nascendo, sol se pondo ou lua crescente. */
export function GlifoHoje({ ativo, className, mood }: GlifoProps & { mood: ReinoMood }) {
  if (mood === 'noite') {
    return (
      <Base className={className}>
        <path
          d="M17.5 6.3C12 6.7 8.6 11.2 9.1 15.9c.5 4.8 4.9 7.5 9.7 6.4-3.4-1.4-5.4-4.7-5-8.5.4-3.4 2.1-5.9 3.7-7.5Z"
          fill={acento(ativo)}
          stroke={ativo ? OCRE : 'currentColor'}
        />
        <path d="M21.4 8.2v.1M22.6 13.6v.1" strokeWidth={2.4} />
      </Base>
    );
  }
  if (mood === 'entardecer') {
    return (
      <Base className={className}>
        <path d="M9.3 19.4c.1-2.8 2.3-4.6 4.8-4.6 2.6 0 4.7 1.9 4.8 4.6Z" fill={acento(ativo)} stroke={ativo ? OCRE : 'currentColor'} />
        <path d="M3.2 19.6c5.8-.8 14.7.7 21.7-.4" />
        <path d="M6.4 23.2c4.6-.5 10.3.4 15.4-.2" opacity={0.6} />
        <path d="M8.2 10.4l1.2 1.4M20 10.4l-1.2 1.4M14.1 7.6v2" />
      </Base>
    );
  }
  return (
    <Base className={className}>
      <path d="M8.5 19.3c.1-4.7 3.4-7.3 5.7-7.3 3.4.1 5.8 3 5.6 7.3Z" fill={acento(ativo)} stroke={ativo ? OCRE : 'currentColor'} />
      <path d="M3 19.6c6-.7 15 .6 22-.4" />
      <path d="M14 8.4V6M8.3 10.5 6.8 8.9M19.9 10.5l1.5-1.6" />
    </Base>
  );
}

/** Mapa: papel dobrado em três, com a trilha pontilhada. */
export function GlifoMapa({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M4 8.3 10 6.1l7 2.4 7-2.3v14.3l-7 2.2-7-2.4-6 2.2Z" />
      <path d="M10 6.1v14.1M17 8.5v14.1" opacity={0.55} />
      <path d="M6.6 17.2c2.4-3 5.4-.6 7.4-3.6s4.9-2.5 7.4-3.6" stroke={acento(ativo)} strokeDasharray="1.1 2.3" strokeWidth={1.9} />
    </Base>
  );
}

/** Eco: a Casa da Eco, com a janela acesa. */
export function GlifoEco({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M4.4 13.6 14.1 5.4l9.5 8.2" />
      <path d="M7.1 12.1v10.5h14V12" />
      <path d="M10.1 22.6v-5h2.8v5" />
      <rect x={15.2} y={14.4} width={3.6} height={3.4} rx={0.4} fill={acento(ativo)} stroke={ativo ? OCRE : 'currentColor'} />
    </Base>
  );
}

/** Sono: as colinas do vale e uma estrela. */
export function GlifoSono({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M3 20.2c4-5.6 7.1-5.6 10.6-2.1 3-4 7.5-4.9 11.4.4" />
      <path d="M3.4 23.6c5.6-3 14.6-3 21.4-.6" opacity={0.6} />
      <path
        d="M19 4.8l.8 1.9 2 .6-2 .6-.8 1.9-.8-1.9-2-.6 2-.6Z"
        fill={acento(ativo)}
        stroke={ativo ? OCRE : 'currentColor'}
        strokeWidth={1.2}
      />
    </Base>
  );
}

/** Perfil: a pessoa pequena que aparece em todas as pinturas, com a lanterna. */
export function GlifoPerfil({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <circle cx={13.2} cy={7.4} r={2.7} fill={ativo ? 'currentColor' : 'none'} />
      <path d="M8.6 23.2c.2-6 1.7-10.6 4.6-10.9 2.9.3 4.4 4.9 4.6 10.9Z" fill={ativo ? 'currentColor' : 'none'} />
      <path d="M17.4 15.6l2.6 1.6" />
      <rect
        x={19.2}
        y={17}
        width={3}
        height={3.6}
        rx={0.6}
        fill={acento(ativo)}
        stroke={ativo ? OCRE : 'currentColor'}
        strokeWidth={1.4}
      />
    </Base>
  );
}
