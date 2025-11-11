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
    title: 'Sua jornada de autoconhecimento começa aqui',
    paragraphs: [
      '✓ Entender seus padrões emocionais — Descubra por que você reage de determinadas formas',
      '✓ Reduzir ansiedade e estresse — Processe suas emoções de forma saudável',
      '✓ Tomar decisões com mais clareza — Pare de agir no piloto automático',
      '💙 Em apenas 5 minutos por dia',
      'Junte-se a mais de 10.000 pessoas que já transformaram sua relação com as emoções',
    ],
    subtext: 'Sua primeira sessão leva menos de 3 minutos • Sem cadastro necessário para começar',
    visual: 'image',
    imageSrc: '/ECO.png',
    ctaLabel: 'Quero transformar minhas emoções →',
  },
  {
    id: 'espelho',
    title: 'Como funciona? Simples assim:',
    paragraphs: [
      '1️⃣ Você compartilha como se sente — Fale, escreva ou apenas respire. Do seu jeito.',
      '2️⃣ A Eco identifica seus padrões — Nossa IA mapeia suas emoções e revela conexões que você não via.',
      '3️⃣ Você recebe insights personalizados — Entenda-se melhor a cada conversa. É como ter um espelho emocional.',
      '⭐⭐⭐⭐⭐ 4.8/5 - Avaliação média de nossos usuários',
      '🔒 100% privado e criptografado — Suas conversas são só suas. Nunca compartilhamos seus dados.',
    ],
    visual: 'image',
    imageSrc: '/ECO conexão.png',
    badges: [
      { icon: '💫', label: 'Memórias' },
      { icon: '💭', label: 'Emoções' },
      { icon: '🌱', label: 'Evolução' },
    ],
    ctaLabel: 'Ver na prática agora →',
    subtext: 'Você está a 1 minuto de clareza emocional',
  },
  {
    id: 'uso',
    title: 'Experimente agora - Comece grátis',
    paragraphs: [
      'Sua primeira sessão não precisa de cadastro. Sem cartão. Sem compromisso.',
      '✅ Gratuito para sempre no plano básico — Teste todas as funcionalidades principais',
      '✅ Não precisa de cadastro agora — Comece como convidado e crie conta depois se gostar',
      '✅ 100% privado e seguro — Criptografia de ponta a ponta. Seus dados são seus.',
      '✅ Funciona no seu ritmo — 3 minutos ou 30 minutos. Você decide quando e como usar.',
      '⚡ Oferta de lançamento: Acesso antecipado a novas funcionalidades para os primeiros 15.000 usuários',
      '"Finalmente consigo entender por que me sinto assim. A Eco mudou minha vida." - Maria, 28 anos',
    ],
    visual: 'image',
    imageSrc: '/micro.png',
    ctaLabel: 'Começar minha primeira sessão grátis →',
    subtext: '💬 Leva menos de 3 minutos | 🔒 Sem cadastro obrigatório | 🎁 Grátis para sempre',
  },
];
