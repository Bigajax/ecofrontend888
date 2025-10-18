// src/data/slides.ts
export interface OnboardingSlideData {
  id: 'eco' | 'espelho' | 'uso';
  title: string;
  paragraphs: string[];
  visual: 'orb' | 'mirror' | 'usage';
  ctaLabel: string;
  subtext?: string;
  badges?: { icon: string; label: string }[];
}

export const slides: OnboardingSlideData[] = [
  {
    id: 'eco',
    title: 'A Eco é uma inteligência que reflete você.',
    paragraphs: [
      'Um espaço guiado de autoconhecimento.',
      'A Eco conversa com você, entende o que sente e transforma suas palavras em clareza emocional.',
      'Sem julgamentos. Só reflexão.',
    ],
    subtext: 'Sua jornada começa com uma conversa.',
    visual: 'orb',
    ctaLabel: 'Entendi →',
  },
  {
    id: 'espelho',
    title: 'Ela cria um espelho emocional.',
    paragraphs: [
      'A cada conversa, a Eco registra padrões e sentimentos para ajudar você a perceber o que muda com o tempo.',
      'Quando algo for intenso, ela transforma em uma memória emocional — e devolve isso como um mapa do seu crescimento.',
    ],
    visual: 'mirror',
    badges: [
      { icon: '🧠', label: 'Memórias' },
      { icon: '💭', label: 'Emoções' },
      { icon: '🔄', label: 'Evolução' },
    ],
    ctaLabel: 'Próximo →',
  },
  {
    id: 'uso',
    title: 'Fale, escreva ou apenas sinta.',
    paragraphs: [
      'Você pode conversar por texto ou voz.',
      'A Eco escuta, reflete e te responde de forma calma, ajudando a organizar o que está dentro.',
      'Tudo é criptografado, privado e seu.',
    ],
    visual: 'usage',
    ctaLabel: 'Começar agora →',
  },
];
