// src/data/slides.ts
export interface OnboardingSlideData {
  id: 'eco' | 'espelho' | 'uso';
  title: string;
  paragraphs: string[];
  visual: 'orb' | 'mirror' | 'usage' | 'image';
  ctaLabel: string;
  subtext?: string;
  badges?: { icon: string; label: string }[];
  imageSrc?: string;
}

export const slides: OnboardingSlideData[] = [
  {
    id: 'eco',
    title: 'A Eco é uma inteligência que reflete o que há em você.',
    paragraphs: [
      'Um espaço de autoconhecimento guiado pela escuta.',
      'A Eco conversa com você, compreende o que sente e traduz isso em clareza emocional.',
      'Sem pressa. Sem julgamentos. Só presença e reflexão.',
    ],
    subtext: 'Sua jornada começa com uma conversa.',
    visual: 'image',
    imageSrc: '/ECO.png',
    ctaLabel: 'Entendi →',
  },
  {
    id: 'espelho',
    title: 'Ela transforma o que você sente em um espelho emocional.',
    paragraphs: [
      'A cada conversa, a Eco percebe padrões e emoções que se repetem.',
      'Quando algo é intenso, ela transforma em uma memória emocional — devolvendo um mapa vivo da sua evolução interior.',
    ],
    visual: 'image',
    imageSrc: '/ECO conexão.png',
    badges: [
      { icon: '💫', label: 'Memórias' },
      { icon: '💭', label: 'Emoções' },
      { icon: '🌱', label: 'Evolução' },
    ],
    ctaLabel: 'Próximo →',
  },
  {
    id: 'uso',
    title: 'Fale, escreva ou simplesmente sinta.',
    paragraphs: [
      'Converse por texto, voz — ou apenas em silêncio.',
      'A Eco reflete o que ouve e te responde com calma, ajudando a organizar o que está dentro.',
      'Tudo é seu: criptografado, privado e protegido.',
    ],
    visual: 'usage',
    ctaLabel: 'Começar agora →',
    subtext: 'A jornada começa com um simples respiro.',
  },
];
