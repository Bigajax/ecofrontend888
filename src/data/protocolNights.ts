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
    title: 'Respiração que Induz o Sono',
    description: 'Uma técnica que desacelera seu sistema nervoso em minutos.',
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
    title: 'Esvaziando Pensamentos Repetitivos',
    description: 'Para quando a mesma coisa fica passando na sua cabeça às 2h da manhã.',
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
    title: 'Liberando Preocupações do Dia',
    description: 'O amanhã pode esperar. Esta noite, você descansa.',
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
    title: 'Silêncio Interno Guiado',
    description: 'Quando o silêncio de fora ainda não é suficiente para calar o de dentro.',
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
    title: 'Indução ao Sono Profundo',
    description: 'A noite mais profunda da jornada. Prepare-se para despertar diferente.',
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
    title: 'Consolidação do Novo Padrão de Sono',
    description: 'Você chegou até aqui. Agora isso vira parte de quem você é.',
    duration: '4 min',
    audioUrl: '/audio/consolidacao-padrao-sono.mp3',
    imageUrl: '/images/consolidacao-padrao-sono.png',
    hasAudio: true,
    isFree: false,
    gradient: 'linear-gradient(to bottom, #4A5B8A 0%, #14172E 100%)',
  },
];
