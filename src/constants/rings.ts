/**
 * Constants and data for Five Rings of Discipline
 */

import type { Ring } from '@/types/rings';

export const RINGS: Record<string, Ring> = {
  earth: {
    id: 'earth',
    nameKey: 'earth',
    titlePt: 'Anel da Terra',
    subtitlePt: 'ver a verdade',
    descriptionPt: 'Clareza sobre o que realmente distrai você e onde você gasta energia',
    impactPhrase: 'A maioria pensa que está ocupada, mas está apenas distraída.',
    question: 'O que tirou meu foco hoje?',
    icon: 'earth',
    color: 'amber',
    order: 1,
    backgroundImage: '/images/rings/earth.webp',
  },
  water: {
    id: 'water',
    nameKey: 'water',
    titlePt: 'Anel da Água',
    subtitlePt: 'ajustar ao dia',
    descriptionPt: 'Pequenos ajustes práticos que melhoram sua disciplina',
    impactPhrase: 'Grandes mudanças vêm do esforço diário.',
    question: 'Qual o menor ajuste que posso fazer amanhã?',
    icon: 'water',
    color: 'blue',
    order: 2,
    backgroundImage: '/images/rings/water.webp',
  },
  fire: {
    id: 'fire',
    nameKey: 'fire',
    titlePt: 'Anel do Fogo',
    subtitlePt: 'transformar emoções',
    descriptionPt: 'Converter emoções fortes em ação produtiva',
    impactPhrase: 'Você fica forte por causa do sofrimento.',
    question: 'Que emoção forte senti hoje e em que ação isso pode virar?',
    icon: 'fire',
    color: 'red',
    order: 3,
    backgroundImage: '/images/rings/fire.webp',
  },
  wind: {
    id: 'wind',
    nameKey: 'wind',
    titlePt: 'Anel do Vento',
    subtitlePt: 'continuar aprendiz',
    descriptionPt: 'Manutenção da humildade e abertura contínua ao aprendizado',
    impactPhrase: 'O risco do progresso é acreditar que já chegou lá.',
    question: 'O que aprendi hoje ou com quem posso aprender nesta semana?',
    icon: 'wind',
    color: 'sky',
    order: 4,
    backgroundImage: '/images/rings/wind.webp',
  },
  void: {
    id: 'void',
    nameKey: 'void',
    titlePt: 'Anel do Vazio',
    subtitlePt: 'tornar-se disciplina',
    descriptionPt: 'Internalização da disciplina como forma de vida',
    impactPhrase: 'A disciplina é um estilo de vida, não um destino.',
    question: 'Quem estou me tornando ao praticar disciplina diariamente?',
    icon: 'void',
    color: 'purple',
    order: 5,
    backgroundImage: '/images/rings/void.webp',
  },
};

export const RINGS_ARRAY = Object.values(RINGS).sort((a, b) => a.order - b.order);

export const FOCUS_REASON_OPTIONS = [
  { id: 'redes_sociais', label: 'Redes Sociais' },
  { id: 'sono', label: 'Falta de Sono' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'interrupcoes', label: 'Interrupções' },
  { id: 'outro', label: 'Outro' },
];

export const ADJUSTMENT_TYPE_OPTIONS = [
  { id: 'sono', label: 'Sono' },
  { id: 'ambiente', label: 'Ambiente' },
  { id: 'rotina', label: 'Rotina' },
  { id: 'corpo', label: 'Corpo/Exercício' },
  { id: 'relacoes', label: 'Relações' },
  { id: 'outro', label: 'Outro' },
];

export const EMOTION_OPTIONS = [
  { id: 'raiva', label: 'Raiva' },
  { id: 'frustracao', label: 'Frustração' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'culpa', label: 'Culpa' },
  { id: 'tristeza', label: 'Tristeza' },
  { id: 'outro', label: 'Outro' },
];

export const LEARNING_SOURCE_OPTIONS = [
  { id: 'erro_proprio', label: 'Meu Próprio Erro' },
  { id: 'outra_pessoa', label: 'Outra Pessoa' },
  { id: 'conteudo', label: 'Conteúdo/Livro/Vídeo' },
  { id: 'trabalho_estudo', label: 'Trabalho/Estudo' },
  { id: 'outro', label: 'Outro' },
];

export const IDENTITY_KEYWORDS = [
  { id: 'mais_disciplinado', label: 'Mais Disciplinado' },
  { id: 'mais_calmo', label: 'Mais Calmo' },
  { id: 'mais_presente', label: 'Mais Presente' },
  { id: 'mais_forte', label: 'Mais Forte' },
  { id: 'menos_impulsivo', label: 'Menos Impulsivo' },
  { id: 'outro', label: 'Outro' },
];
