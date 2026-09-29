import { formatHojeLabel } from './reinoMood';

/**
 * Onde você está no reino, pela rota. Usado pelo cabeçalho corrente e pelo
 * carregamento ("para onde você está indo").
 */
export interface LugarDaRota {
  codigo?: string;
  nome: string;
  /** frase de chegada, usada enquanto a página carrega */
  chegada: string;
}

const TRILHAS = [
  '/app/programas',
  '/app/rings',
  '/app/riqueza-mental',
  '/app/dr-joe-dispenza',
  '/app/introducao-meditacao',
  '/app/codigo-da-abundancia',
  '/app/recondicione',
];

export function lugarDaRota(pathname: string): LugarDaRota {
  const p = pathname.replace(/\/$/, '');
  if (p === '/app' || p === '/app/home') return { nome: formatHojeLabel(), chegada: 'Abrindo o dia' };
  if (p.startsWith('/app/mapa')) return { nome: '5 regiões · 1 caminho', chegada: 'Abrindo o mapa' };
  if (p.startsWith('/app/meditacoes-sono')) return { codigo: 'SOM.02', nome: 'Vale do Sono', chegada: 'Descendo ao Vale do Sono' };
  if (p.startsWith('/app/sons')) return { codigo: 'SOM.02', nome: 'Sons do vale', chegada: 'Ouvindo o vale' };
  if (p.startsWith('/app/diario-estoico')) return { codigo: 'STO.05', nome: 'O Pórtico', chegada: 'Subindo ao Pórtico' };
  if (p.startsWith('/app/dream')) return { codigo: 'DRM.03', nome: 'Lago dos Sonhos', chegada: 'Chegando ao Lago dos Sonhos' };
  if (p.startsWith('/app/chat') || p.startsWith('/app/memory'))
    return { codigo: 'ECO.01', nome: 'Casa da Eco', chegada: 'Acendendo a lamparina da Casa' };
  if (p.startsWith('/app/articles')) return { nome: 'Biblioteca', chegada: 'Abrindo a biblioteca' };
  if (p.startsWith('/app/configuracoes')) return { nome: 'Sua conta', chegada: 'Abrindo sua conta' };
  if (p.startsWith('/app/meditation-player')) return { nome: 'Ouvindo agora', chegada: 'Preparando o lugar para ouvir' };
  if (TRILHAS.some((r) => p.startsWith(r))) return { codigo: 'TRI.04', nome: 'As Trilhas', chegada: 'Seguindo a trilha' };
  return { nome: 'Ecotopia', chegada: 'Abrindo o reino' };
}

/**
 * O que cada lugar é, em palavras de todo dia. O nome do lugar é poético;
 * esta linha vai sempre junto, para quem chega pela primeira vez saber
 * para onde ir. Mesma frase na home e no mapa.
 */
export const PARA_QUE_SERVE: Record<'casa' | 'vale' | 'lago' | 'trilhas' | 'portico', string> = {
  casa: 'Converse com a Eco',
  vale: 'Meditações e sons para dormir',
  lago: 'Conte um sonho e entenda o que ele diz',
  trilhas: 'Programas guiados, um dia de cada vez',
  portico: 'Uma reflexão estoica por dia',
};
