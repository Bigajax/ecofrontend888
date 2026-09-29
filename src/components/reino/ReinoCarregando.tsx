import { lugarDaRota } from './lugares';
import { getReinoMood } from './reinoMood';
import { ASTRO } from './astroFormas';
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
  const astro = ASTRO[mood];

  return (
    <div
      className={`reino-carregando${inline ? ' is-inline' : ''}`}
      data-mood={mood}
      role="status"
      aria-live="polite"
    >
      <svg className="reino-carregando__astro" viewBox="0 0 120 120" aria-hidden="true">
        <g className="reino-carregando__raios">
          <path d={astro.raios} />
        </g>
        <path className="reino-carregando__sol" d={astro.corpo} />
        {astro.brilho && <path className="reino-carregando__brilho" d={astro.brilho} />}
      </svg>
      <svg className="reino-carregando__horizonte" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
        <path d="M4 7.2C40 3.6 82 9.4 122 6.2s78-4.2 114 1.4" />
      </svg>
      <p className="reino-carregando__frase">{texto ?? lugar.chegada}</p>
      {lugar.codigo && <p className="reino-carregando__codigo">{`${lugar.codigo} · ${lugar.nome}`}</p>}
    </div>
  );
}
