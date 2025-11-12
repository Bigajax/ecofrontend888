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
    title: 'Transforme suas emoções',
    paragraphs: [
      '✓ Entender seus padrões emocionais',
      '✓ Reduzir ansiedade e estresse',
      '✓ Tomar decisões com clareza',
      '⏱ Apenas 5 minutos por dia',
    ],
    subtext: 'Primeira sessão em menos de 3 minutos • Sem cadastro',
    visual: 'image',
    imageSrc: '/ECO.png',
    ctaLabel: 'Começar →',
  },
  {
    id: 'espelho',
    title: 'Como funciona',
    paragraphs: [
      '1️⃣ Você compartilha como se sente',
      '2️⃣ A Eco identifica seus padrões',
      '3️⃣ Você recebe insights personalizados',
      '⭐ 4.8/5 - Avaliação de usuários',
    ],
    visual: 'image',
    imageSrc: '/ECO conexão.png',
    badges: [
      { icon: '💫', label: 'Memórias' },
      { icon: '💭', label: 'Emoções' },
      { icon: '🌱', label: 'Evolução' },
    ],
    ctaLabel: 'Próximo →',
    subtext: '100% privado e seguro',
  },
  {
    id: 'uso',
    title: 'Comece grátis',
    paragraphs: [
      '✅ Gratuito para sempre',
      '✅ Sem cadastro',
      '✅ 100% seguro',
    ],
    visual: 'image',
    imageSrc: '/micro.png',
    ctaLabel: 'Começar agora →',
    subtext: 'Primeira sessão em 3 minutos',
  },
];
