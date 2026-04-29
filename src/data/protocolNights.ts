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
    title: 'Desligando o Estado de Alerta',
    description: 'A maioria das pessoas deita em modo de batalha. Esta noite você sai dele.',
    duration: '5 min',
    audioUrl: '/audio/desligando-estado-alerta.mp3',
    imageUrl: '/images/desligando-estado-alerta.png',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #4A4E8A 0%, #14172E 100%)',
  },
  {
    id: 'night_2',
    night: 2,
    title: 'Soltando o Controle da Mente',
    description: 'Quando a mente solta, o corpo segue.',
    duration: '5 min',
    audioUrl: '/audio/respiracao-induz-sono.mp3',
    imageUrl: '/images/respiracao-induz-sono.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #6B5B95 0%, #251A45 100%)',
  },
  {
    id: 'night_3',
    night: 3,
    title: 'Desligamento Profundo do Corpo',
    description: 'Cada músculo, cada articulação, cada tensão escondida.',
    duration: '5 min',
    audioUrl: '/audio/esvaziando-pensamentos.mp3',
    imageUrl: '/images/esvaziando-pensamentos.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #5B6B95 0%, #1A2545 100%)',
  },
  {
    id: 'night_4',
    night: 4,
    title: 'Quebrando o Ciclo de Pensamentos',
    description: 'O laço que te mantém acordado, finalmente soltando.',
    duration: '5 min',
    audioUrl: '/audio/liberando-preocupacoes.mp3',
    imageUrl: '/images/liberando-preocupacoes.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #7B5B8A 0%, #2A1A40 100%)',
  },
  {
    id: 'night_5',
    night: 5,
    title: 'Entrando em Segurança Profunda',
    description: 'O sistema nervoso aprende que pode baixar a guarda.',
    duration: '4 min',
    audioUrl: '/audio/silencio-interno-guiado.mp3',
    imageUrl: '/images/silencio-interno-guiado.webp',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A6B8A 0%, #142045 100%)',
  },
  {
    id: 'night_6',
    night: 6,
    title: 'Quando o Sono Começa Sozinho',
    description: 'Você não precisa fazer nada. Ele simplesmente chega.',
    duration: '4 min',
    audioUrl: '/audio/inducao-sono-profundo.mp3',
    imageUrl: '/images/inducao-sono-profundo.png',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #6B4A8A 0%, #20142E 100%)',
  },
  {
    id: 'night_7',
    night: 7,
    title: 'Seu Corpo Já Sabe Dormir',
    description: 'Você chegou até aqui. Agora isso vira parte de quem você é.',
    duration: '4 min',
    audioUrl: '/audio/consolidacao-padrao-sono.mp3',
    imageUrl: '/images/consolidacao-padrao-sono.png',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A5B8A 0%, #14172E 100%)',
  },
];
