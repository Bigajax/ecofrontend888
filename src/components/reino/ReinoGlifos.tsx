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

/**
 * A Eco: a bolha de conversa com o olho quente (a marca da Eco). Antes era a
 * casa, e parecia que a pessoa conversava com a casa; a casa é o lugar, nas
 * pinturas e no cabeçalho, e quem conversa é a Eco.
 */
export function GlifoEco({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M4.8 12.8c-.1-4.4 4-7.6 9.2-7.5 5.1.1 9.1 3.4 9 7.7-.1 4.2-4.2 7.3-9.3 7.2-1.2 0-2.3-.2-3.3-.5l-4.3 2.6 1.4-3.9c-1.7-1.4-2.7-3.4-2.7-5.6Z" />
      <circle cx={14} cy={12.6} r={2.3} fill={acento(ativo)} stroke={ativo ? OCRE : 'currentColor'} strokeWidth={1.3} />
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

/** Memórias: o caderno aberto, com uma folha prensada na página da direita. */
export function GlifoMemorias({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M14 8.2c-2.8-1.9-6.2-2.3-9.6-1.6v14.6c3.4-.6 6.8-.2 9.6 1.7 2.8-1.9 6.2-2.3 9.6-1.7V6.6c-3.4-.7-6.8-.3-9.6 1.6Z" />
      <path d="M14 8.2v14.4" opacity={0.55} />
      <path
        d="M17.2 17.6c.4-3.2 2-5.3 4.3-6-.2 3.1-1.8 5.3-4.3 6Z"
        fill={acento(ativo)}
        stroke={ativo ? OCRE : 'currentColor'}
        strokeWidth={1.3}
      />
      <path d="M7.2 11.2c1.4-.2 2.8 0 4 .5M7.2 14.4c1.4-.2 2.8 0 4 .5" opacity={0.6} />
    </Base>
  );
}

/** Perfil emocional: o espelho de mão, com o reflexo quente. */
export function GlifoEspelho({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M14.2 4.6c3.8.1 6.3 3 6.2 6.6-.1 3.7-2.8 6.3-6.4 6.2-3.6-.1-6.2-2.9-6.1-6.5.1-3.6 2.7-6.4 6.3-6.3Z" />
      <path d="M13.9 17.4c-.2 2 .1 4 .6 6" />
      <path d="M11.8 23.6c1.5-.4 3-.4 4.4.1" />
      <path d="M11.6 9.6c.6-1.4 1.8-2.3 3.2-2.5" stroke={acento(ativo)} strokeWidth={2} />
    </Base>
  );
}

/** Relatórios: três pinceladas de alturas diferentes sobre a linha do chão. */
export function GlifoRelatorio({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M3.6 22.8c6.8-.5 13.9.4 20.8-.2" />
      <path d="M8.2 20.6c-.2-3.2 0-6 .4-8.4" strokeWidth={2.6} />
      <path d="M14.1 20.4c-.3-4.9 0-9.6.5-13.6" strokeWidth={2.6} stroke={acento(ativo)} />
      <path d="M20 20.6c-.1-2.2.1-4.2.4-5.8" strokeWidth={2.6} />
    </Base>
  );
}

/** Feedback: a pena de escrever. */
export function GlifoPena({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M22.6 4.8c-6.8.9-11.9 5.8-13.5 13.3l2.5-.4c5.4-1.8 9.4-6.6 11-12.9Z" fill={ativo ? OCRE : 'none'} />
      <path d="M5.4 23.2 15.8 11" />
    </Base>
  );
}

/** Sair: a porta entreaberta, com a luz do lado de fora. */
export function GlifoPorta({ ativo, className }: GlifoProps) {
  return (
    <Base className={className}>
      <path d="M8 23.4V5.2h11.6v18.2" />
      <path d="M8 5.2l6.4 2.2v18l-6.4-2" fill={acento(ativo)} fillOpacity={ativo ? 1 : 0} />
      <path d="M12.2 15.4v.1" strokeWidth={2.4} />
      <path d="M4.6 23.6c6.6-.4 13.2.3 19.8-.1" />
    </Base>
  );
}
