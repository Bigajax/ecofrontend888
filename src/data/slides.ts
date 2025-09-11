// src/data/slides.ts
export interface SlideData {
  title: string;
  text: string[];
  bubblePosition: string;
  background: string;
}

export const slides: SlideData[] = [
  {
    title: 'ECO',
    text: [
      'Uma IA feita para o seu Bem-estar.',
      'Converse de forma leve e sem julgamentos.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Chat + Voz',
    text: [
      'Escreva ou fale — escolha o jeito mais natural para você.',
      'A Eco também pode responder em voz, criando um diálogo mais próximo.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Perfil Emocional',
    text: [
      'Acompanhe como você se sente ao longo do tempo.',
      'Descubra padrões e insights sobre suas emoções.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  },
  {
    title: 'Autoconhecimento',
    text: [
      'Mais clareza no seu dia a dia.',
      'Um espaço simples para refletir sobre você.'
    ],
    bubblePosition: 'floating',
    background: '#ffffff'
  }
];
