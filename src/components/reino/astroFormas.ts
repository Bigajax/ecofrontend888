import type { ReinoMood } from './reinoMood';

/**
 * O astro de cada hora, desenhado numa caixa de 120×120. É o mesmo desenho na
 * logo do cabeçalho e no carregamento (o index.html repete estes traços).
 *   amanhecer: o sol inteiro, com raios em volta
 *   entardecer: o sol pela metade, pousando na linha do horizonte
 *   noite: a lua crescente com duas estrelas
 */
export interface FormaAstro {
  /** o corpo do astro (preenchido em ocre) */
  corpo: string;
  /** raios ou estrelas (traço em ocre) */
  raios: string;
  /** o reflexo claro por dentro do sol; a lua não tem */
  brilho?: string;
  /** a linha do horizonte, só no entardecer */
  horizonte?: string;
}

export const ASTRO: Record<ReinoMood, FormaAstro> = {
  amanhecer: {
    corpo:
      'M61.6 33.8c14.6.8 26 12.6 25 28-1 15.2-13.6 25.6-28 24.6-13.9-1-24.7-13.1-23.6-27.3 1-14.4 12.2-26 26.6-25.3Z',
    raios: 'M60 14v14M60 92v14M14 60h14M92 60h14M27.5 27.5l10 10M82.5 82.5l10 10M92.5 27.5l-10 10M37.5 82.5l-10 10',
    brilho: 'M47.5 52c6.4-7.4 17.4-8.2 23.6.6',
  },
  entardecer: {
    corpo: 'M33.4 80c.2-16.2 12.4-28.4 27.4-28 14.6.4 25.6 12.4 25.8 28Z',
    raios: 'M60.4 26v13M29.6 39.8l8.6 8.4M91.2 39.4l-8.8 8.6M14.6 66.4l12.2 2.6M105.6 66l-12.2 2.8',
    brilho: 'M46 70.4c4.2-7 13.4-9.2 20.4-4',
    horizonte: 'M10 80.6c22-1.8 46 .8 68-.4s22-1.2 32 .2',
  },
  noite: {
    corpo:
      'M68.4 28.6C50 28.8 35.2 43.2 35.6 61.4c.4 18 15.8 31.6 33.6 30.4 8.8-.6 16.4-4.4 21.4-10.6-5.4 1.8-11.4 2-17.2.2-12.8-4.2-20.8-16.6-18.8-29.6 1.4-9.8 6.6-17.6 13.8-23.2Z',
    raios: 'M88.6 30.4v.2M99.4 50.2v.2',
  },
};
