import { ASTRO } from './astroFormas';
import type { ReinoMood } from './reinoMood';

/**
 * O reino é um quadro só: cada tela mostra um recorte do mesmo panorama.
 * Recortes em pixels da imagem original (2172×724): [x, y, largura, altura].
 */
export const PANORAMA = {
  src: '/images/reino/panorama.webp',
  srcSmall: '/images/reino/panorama-1200.webp',
  width: 2172,
  height: 724,
} as const;

export type ReinoCrop = readonly [x: number, y: number, w: number, h: number];

interface ReinoSceneProps {
  crop: ReinoCrop;
  className?: string;
  /** usa a versão de 1200px (miniaturas) */
  small?: boolean;
}

export function ReinoScene({ crop, className, small = false }: ReinoSceneProps) {
  return (
    <svg
      viewBox={crop.join(' ')}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <image
        href={small ? PANORAMA.srcSmall : PANORAMA.src}
        width={PANORAMA.width}
        height={PANORAMA.height}
        preserveAspectRatio="none"
      />
    </svg>
  );
}

/** Pinturas próprias de cada região (16:9). O Lago dos Sonhos ainda usa o panorama. */
export type ReinoRegiao = 'casa' | 'vale' | 'trilhas' | 'portico';

interface ReinoPinturaProps {
  regiao: ReinoRegiao;
  /** foco do recorte, em CSS object-position (ex.: '45% 50%') */
  foco?: string;
  className?: string;
}

export function ReinoPintura({ regiao, foco = '50% 50%', className }: ReinoPinturaProps) {
  const base = `/images/reino/${regiao}`;
  return (
    <img
      src={`${base}.webp`}
      srcSet={`${base}-800.webp 800w, ${base}.webp 1600w`}
      sizes="(min-width: 768px) 560px, 100vw"
      width={1600}
      height={900}
      alt=""
      decoding="async"
      {...{ fetchpriority: 'high' }}
      className={className}
      style={{ objectFit: 'cover', objectPosition: foco }}
    />
  );
}

/** A assinatura do reino: um astro amarelo imperfeito, pintado à mão. */
/** O astro da logo: sol, sol se pondo ou lua, conforme a hora (ver astroFormas). */
export function Astro({ className, mood = 'amanhecer' }: { className?: string; mood?: ReinoMood }) {
  const f = ASTRO[mood];
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false">
      <path d={f.raios} fill="none" stroke="#EDB85A" strokeWidth={mood === 'noite' ? 9 : 7} strokeLinecap="round" />
      <path d={f.corpo} fill="#EDB85A" />
      {f.brilho && <path d={f.brilho} fill="none" stroke="#F6D48C" strokeWidth={6} strokeLinecap="round" />}
      {f.horizonte && <path d={f.horizonte} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />}
    </svg>
  );
}

/** Progresso como pincelada sobre uma trilha pontilhada. `value` de 0 a 1. */
export function PincelProgresso({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <svg className={className} viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M4 7h292" stroke="var(--r-trilho)" strokeWidth="1.5" strokeDasharray="2 5" />
      {pct > 0 && (
        <svg width={`${pct}%`} height="12" viewBox="0 0 300 12" preserveAspectRatio="none">
          <path
            d="M2 7.2C40 3.4 92 4.6 150 5.1s110-2.2 148 1.3c-18 3.9-96 4.6-148 4.1S38 12.2 2 9.6Z"
            fill="var(--r-traco)"
          />
        </svg>
      )}
    </svg>
  );
}
