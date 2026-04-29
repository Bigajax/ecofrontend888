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
    audioUrl: '/audio/desligando-estado-alerta.mp3',
    imageUrl: '/images/desligando-estado-alerta.png',
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
    audioUrl: '/audio/respiracao-induz-sono.mp3',
    imageUrl: '/images/respiracao-induz-sono.webp',
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
    audioUrl: '/audio/esvaziando-pensamentos.mp3',
    imageUrl: '/images/esvaziando-pensamentos.webp',
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
    audioUrl: '/audio/liberando-preocupacoes.mp3',
    imageUrl: '/images/liberando-preocupacoes.webp',
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
    audioUrl: '/audio/silencio-interno-guiado.mp3',
    imageUrl: '/images/silencio-interno-guiado.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A6B8A 0%, #142045 100%)',
  },
  {
    id: 'night_6',
    night: 6,
    title: 'Quando o sono começa sozinho',
    description: 'Você para de tentar dormir — e o corpo assume.',
    duration: '5 min',
    audioUrl: '/audio/inducao-sono-profundo.mp3',
    imageUrl: '/images/inducao-sono-profundo.png',
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
    audioUrl: '/audio/consolidacao-padrao-sono.mp3',
    imageUrl: '/images/consolidacao-padrao-sono.png',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A5B8A 0%, #14172E 100%)',
  },
];
