import {
  Flower2,
  Wind,
  Music2,
  Scale,
  Moon,
  BookOpen,
  Waves,
  Bed,
  Brain,
  Anchor,
  GraduationCap,
  Lightbulb,
  NotebookPen,
  Compass,
  LineChart,
  Leaf,
  Target,
  Sparkles,
  Heart,
  UserCircle,
  MessagesSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NeedBenefit = {
  Icon: LucideIcon;
  /** Se presente, usa esta imagem (orb) no lugar do ícone lucide. */
  image?: string;
  title: string;
  desc?: string;
};

export type NeedModalData = {
  /** Chave estável; precisa casar com a `key` do card em DiagnosticoSection. */
  key: string;
  /** Cor de fundo do modal. */
  color: string;
  /** Imagem de fundo própria do modal (cobre tudo, sem tint). Opcional —
   *  na ausência, usa o fundo cósmico compartilhado com tint da `color`. */
  background?: string;
  /** Contraste do texto sobre `color`: 'dark' = fundo claro, 'light' = fundo escuro. */
  textTone: 'light' | 'dark';
  /** Caminho da ilustração (placeholder elegante até a imagem existir). */
  illustration: string;
  title: string;
  subtitle: string;
  /** Exatamente 4 itens (grid 2x2). */
  benefits: NeedBenefit[];
  ctaLabel: string;
};

export const NEEDS: NeedModalData[] = [
  {
    key: 'stress',
    color: '#F5A623',
    textTone: 'light',
    illustration: '/images/need-stress.webp',
    title: 'Solte o peso do dia',
    subtitle:
      'Pequenos momentos de pausa para desacelerar a mente e recuperar energia.',
    benefits: [
      {
        Icon: Flower2,
        title: 'Meditações guiadas',
        desc: 'Práticas rápidas para aliviar tensão',
      },
      {
        Icon: Wind,
        title: 'Respiração consciente',
        desc: 'Volte para o presente em minutos',
      },
      {
        Icon: Music2,
        title: 'Sons relaxantes',
        desc: 'Crie um ambiente mais leve',
      },
      {
        Icon: Scale,
        title: 'Programas de equilíbrio',
        desc: 'Desenvolva mais calma no dia a dia',
      },
    ],
    ctaLabel: 'Experimente grátis',
  },
  {
    key: 'sleep',
    color: '#6D4BD2',
    textTone: 'light',
    illustration: '/images/need-sleep.webp',
    title: 'Prepare sua mente para descansar',
    subtitle:
      'Práticas, sons e meditações para ajudar seu corpo a desligar naturalmente.',
    benefits: [
      { Icon: Moon, title: 'Meditações para dormir' },
      { Icon: BookOpen, title: 'Histórias relaxantes' },
      { Icon: Waves, title: 'Sons para o sono' },
      { Icon: Bed, title: 'Protocolos noturnos' },
    ],
    ctaLabel: 'Experimente grátis',
  },
  {
    key: 'anxiety',
    color: '#2E7BF7',
    textTone: 'light',
    illustration: '/images/need-anxiety.webp',
    title: 'Encontre mais espaço dentro de você',
    subtitle:
      'Aprenda a lidar com pensamentos acelerados com mais clareza e gentileza.',
    benefits: [
      { Icon: Brain, title: 'Meditações para ansiedade' },
      { Icon: Anchor, title: 'Exercícios de aterramento' },
      { Icon: Wind, title: 'Respiração guiada' },
      { Icon: GraduationCap, title: 'Programas especializados' },
    ],
    ctaLabel: 'Experimente grátis',
  },
  {
    key: 'thoughts',
    color: '#C7A7FF',
    textTone: 'dark',
    illustration: '/images/need-thoughts.webp',
    title: 'Transforme ruído em clareza',
    subtitle:
      'Organize pensamentos, emoções e prioridades com mais tranquilidade.',
    benefits: [
      { Icon: Lightbulb, title: 'Reflexões guiadas' },
      { Icon: NotebookPen, title: 'Diário emocional' },
      { Icon: Compass, title: 'Mapa emocional' },
      { Icon: LineChart, title: 'Insights pessoais' },
    ],
    ctaLabel: 'Experimente grátis',
  },
  {
    key: 'meditation',
    color: '#16A34A',
    textTone: 'light',
    illustration: '/images/need-meditation.webp',
    title: 'Volte para o momento presente',
    subtitle: 'Cultive presença, foco e equilíbrio através da prática diária.',
    benefits: [
      { Icon: Flower2, title: 'Meditações guiadas' },
      { Icon: Wind, title: 'Exercícios de respiração' },
      { Icon: Leaf, title: 'Mindfulness' },
      { Icon: Target, title: 'Programas de atenção plena' },
    ],
    ctaLabel: 'Experimente grátis',
  },
  {
    key: 'eco',
    color: '#6EC8FF',
    textTone: 'dark',
    illustration: '/images/need-eco.webp',
    title: 'Converse com a Eco',
    subtitle:
      'Um espaço seguro para refletir, organizar pensamentos e compreender emoções.',
    benefits: [
      { Icon: Sparkles, title: 'Reflexões personalizadas' },
      { Icon: Heart, title: 'Memória emocional' },
      { Icon: UserCircle, title: 'Perfil emocional' },
      { Icon: MessagesSquare, title: 'Conversas profundas' },
    ],
    ctaLabel: 'Experimente grátis',
  },
];
