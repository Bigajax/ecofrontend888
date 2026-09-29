import { lugarDaRota } from './lugares';
import { getReinoMood } from './reinoMood';
import './reino.css';

/**
 * Carregamento do reino: o astro se desenha, um horizonte é pintado embaixo,
 * e a frase diz para onde você está indo. O fundo tem a cor do céu da hora.
 * `inline` é a versão compacta, dentro de uma página que já tem cabeçalho.
 */
interface ReinoCarregandoProps {
  inline?: boolean;
  /** substitui a frase de chegada da rota */
  texto?: string;
}

export default function ReinoCarregando({ inline = false, texto }: ReinoCarregandoProps) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/app';
  const lugar = lugarDaRota(pathname);
  const mood = getReinoMood();

  return (
    <div
      className={`reino-carregando${inline ? ' is-inline' : ''}`}
      data-mood={mood}
      role="status"
      aria-live="polite"
    >
      <svg className="reino-carregando__astro" viewBox="0 0 120 120" aria-hidden="true">
        <g className="reino-carregando__raios">
          <path d="M60 14v14M60 92v14M14 60h14M92 60h14M27.5 27.5l10 10M82.5 82.5l10 10M92.5 27.5l-10 10M37.5 82.5l-10 10" />
        </g>
        <path
          className="reino-carregando__sol"
          d="M61.6 33.8c14.6.8 26 12.6 25 28-1 15.2-13.6 25.6-28 24.6-13.9-1-24.7-13.1-23.6-27.3 1-14.4 12.2-26 26.6-25.3Z"
        />
        <path className="reino-carregando__brilho" d="M47.5 52c6.4-7.4 17.4-8.2 23.6.6" />
      </svg>
      <svg className="reino-carregando__horizonte" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 7.2C40 3.6 82 9.4 122 6.2s78-4.2 114 1.4" />
      </svg>
      <p className="reino-carregando__frase">{texto ?? lugar.chegada}</p>
      {lugar.codigo && <p className="reino-carregando__codigo">{`${lugar.codigo} · ${lugar.nome}`}</p>}
    </div>
  );
}
