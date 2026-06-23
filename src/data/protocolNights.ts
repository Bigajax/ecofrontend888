export interface ProtocolNight {
  id: string;
  night: number;
  title: string;
  description: string;
  duration: string;
  audioUrl?: string;
  imageUrl?: string;
  hasAudio: boolean;
  isFree: boolean;
  gradient: string;
}

export const PROTOCOL_NIGHTS: ProtocolNight[] = [
  {
    id: 'night_1',
    night: 1,
    title: 'Desligando o estado de alerta',
    description: 'A maioria das pessoas deita em modo de batalha. Hoje, seu corpo aprende a sair disso.',
    duration: '8 min',
    audioUrl: '/audio/desligando-estado-alerta-calmo.mp3',
    imageUrl: '/images/sono-noite-01.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)',
  },
  {
    id: 'night_2',
    night: 2,
    title: 'Soltando o controle da mente',
    description: 'Quanto menos você tenta… mais o sono se aproxima.',
    duration: '6 min',
    audioUrl: '/audio/respiracao-induz-sono-calmo.mp3',
    imageUrl: '/images/sono-noite-02.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #6B5B95 0%, #251A45 100%)',
  },
  {
    id: 'night_3',
    night: 3,
    title: 'Desligamento profundo do corpo',
    description: 'Seu corpo começa a dormir antes da mente.',
    duration: '6 min',
    audioUrl: '/audio/esvaziando-pensamentos-calmo.mp3',
    imageUrl: '/images/sono-noite-03.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #5B6B95 0%, #1A2545 100%)',
  },
  {
    id: 'night_4',
    night: 4,
    title: 'Quebrando o ciclo de pensamentos',
    description: 'Pensamentos deixam de puxar você para fora do sono.',
    duration: '6 min',
    audioUrl: '/audio/liberando-preocupacoes-calmo.mp3',
    imageUrl: '/images/sono-noite-04.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #7B5B8A 0%, #2A1A40 100%)',
  },
  {
    id: 'night_5',
    night: 5,
    title: 'Entrando em segurança profunda',
    description: 'Seu sistema entende que pode desligar.',
    duration: '5 min',
    audioUrl: '/audio/silencio-interno-guiado-calmo.mp3',
    imageUrl: '/images/sono-noite-05.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A6B8A 0%, #142045 100%)',
  },
  {
    id: 'night_6',
    night: 6,
    title: 'Quando o sono começa sozinho',
    description: 'Você para de tentar dormir, e o corpo assume.',
    duration: '5 min',
    audioUrl: '/audio/inducao-sono-profundo-calmo.mp3',
    imageUrl: '/images/sono-noite-06.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #6B4A8A 0%, #20142E 100%)',
  },
  {
    id: 'night_7',
    night: 7,
    title: 'Seu corpo já sabe dormir',
    description: 'Você não precisa mais do áudio. O padrão mudou.',
    duration: '5 min',
    audioUrl: '/audio/consolidacao-padrao-sono-calmo.mp3',
    imageUrl: '/images/sono-noite-07.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A5B8A 0%, #14172E 100%)',
  },
];
