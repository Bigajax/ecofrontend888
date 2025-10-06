// src/data/slides.ts
export interface SlideData {
  title: string;
  text: string[];
  bubblePosition: string;
  background: string;
  pills?: string[];
}

export const slides: SlideData[] = [
  {
    title: 'A Eco é um espelho',
    text: [
      'Uma IA reflexiva para o seu bem-estar.',
      'Sem julgamentos. Sem respostas prontas. Perguntas que ajudam você a perceber o que sente.'
    ],
    pills: ['Beta gratuito', '7 min/dia', 'Privado'],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Chat + Voz',
    text: [
      'Escreva ou fale — como preferir.',
      'A Eco também responde em voz, deixando a conversa mais próxima.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Padrões e memórias',
    text: [
      'Acompanhe como você se sente ao longo do tempo.',
      'A Eco destaca emoções e padrões para você se conhecer melhor.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Um espaço só seu',
    text: [
      'Suas conversas são privadas e protegidas.',
      'Não é terapia nem promessa mágica — é um exercício diário de autoconhecimento.'
    ],
    pills: ['Criptografado', 'Sem julgamentos'],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Pronto para começar?',
    text: [
      'Reserve alguns minutos para se ouvir hoje.',
      'A Eco está aqui quando você quiser voltar.'
    ],
    pills: ['Leve', 'Sem pressão'],
    bubblePosition: 'floating',
    background: '#ffffff'
  }
];
