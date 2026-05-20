export interface DrJoeMeditation {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl: string;
  image: string;
  imagePosition: string;
  gradient: string;
  completed: boolean;
  isPremium?: boolean;
  totalCompletions?: number;
}

export const DR_JOE_MEDITATIONS: DrJoeMeditation[] = [
  {
    id: 'blessing_1',
    title: 'Bênção dos Centros de Energia',
    description: 'Ative seu corpo para um novo estado interno',
    duration: '7 min',
    audioUrl: '/audio/bencao-centros-energia.mp3',
    image: 'url("/images/meditacao-bencao-energia.webp")',
    imagePosition: 'center 32%',
    gradient:
      'linear-gradient(to bottom, #F5C563 0%, #F5A84D 15%, #F39439 30%, #E67E3C 45%, #D95B39 60%, #C74632 80%, #A63428 100%)',
    completed: false,
  },
  {
    id: 'blessing_2',
    title: 'Sintonize Novos Potenciais',
    description: 'Acesse o campo de possibilidades além do seu passado',
    duration: '5 min',
    audioUrl: '/audio/sintonizar-novos-potenciais-v3.mp3',
    image: 'url("/images/meditacao-novos-potenciais.webp")',
    imagePosition: 'center 32%',
    gradient:
      'linear-gradient(to bottom, #4A7FCC 0%, #3D6BB8 20%, #3358A3 40%, #2A478E 60%, #213779 80%, #182864 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_3',
    title: 'Recondicione Seu Corpo e Mente',
    description: 'O que você repete, vira padrão. Esta sessão interrompe o ciclo antigo.',
    duration: '7 min',
    audioUrl: '/audio/recondicione-corpo-mente.mp3',
    image: 'url("/images/meditacao-recondicionar.webp")',
    imagePosition: 'center 32%',
    gradient:
      'linear-gradient(to bottom, #9B79C9 0%, #8766B5 20%, #7454A0 40%, #61438C 60%, #4E3377 80%, #3B2463 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_5',
    title: 'Meditação Caminhando',
    description: 'Para quando sentar não for suficiente. Leve a prática para o movimento.',
    duration: '5 min',
    audioUrl: '/audio/meditacao-caminhando-nova.mp3',
    image: 'url("/images/meditacao-caminhando.webp")',
    imagePosition: 'center 15%',
    gradient:
      'linear-gradient(to bottom right, #FF8C42 0%, #F7931E 20%, #D8617A 40%, #8B3A62 60%, #6B2C5C 80%, #2D1B3D 100%)',
    completed: false,
    isPremium: true,
  },
  {
    id: 'blessing_6',
    title: 'Espaço-Tempo, Tempo-Espaço',
    description: 'A sessão mais profunda da jornada. Reserve um momento só seu.',
    duration: '5 min',
    audioUrl: '/audio/espaco-tempo-completa.mp3',
    image: 'url("/images/meditacao-espaco-tempo.webp")',
    imagePosition: 'center 32%',
    gradient:
      'linear-gradient(to bottom, #FCD670 0%, #FBCA5D 15%, #F7B84A 30%, #F39A3C 45%, #EC7D2E 60%, #E26224 75%, #D7491F 90%, #C43520 100%)',
    completed: false,
    isPremium: true,
  },
];
