export interface ProtocolSession {
  id: string;
  session: number;
  title: string;
  description: string;
  duration: string;
  audioUrl?: string;
  imageUrl?: string;
  hasAudio: boolean;
  isFree: boolean;
  gradient: string;
}

export const PROTOCOL_SESSIONS: ProtocolSession[] = [
  {
    id: 'abundancia_1',
    session: 1,
    title: 'O Diagnóstico',
    description: 'Antes de atrair, você precisa entender o que está repelindo.',
    duration: '8 min',
    audioUrl: '/audio/abundancia-diagnostico.mp3',
    imageUrl: '/images/abundancia-diagnostico.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #B8860B 0%, #09090F 100%)',
  },
  {
    id: 'abundancia_2',
    session: 2,
    title: 'Quebrando o Contrato Antigo',
    description: 'Você fez um acordo inconsciente com a escassez. Hoje você o desfaz.',
    duration: '10 min',
    audioUrl: '/audio/abundancia-contrato-antigo.mp3',
    imageUrl: '/images/abundancia-contrato-antigo.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #C49A00 0%, #1A1005 100%)',
  },
  {
    id: 'abundancia_3',
    session: 3,
    title: 'A Frequência do Receber',
    description: 'A maioria das pessoas sabe pedir. Pouquíssimas sabem receber.',
    duration: '12 min',
    audioUrl: '/audio/abundancia-frequencia-receber.mp3',
    imageUrl: '/images/abundancia-frequencia-receber.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #D4A017 0%, #1A0E00 100%)',
  },
  {
    id: 'abundancia_4',
    session: 4,
    title: 'Você no Futuro Próspero',
    description: 'Seu cérebro não distingue experiência real de imaginada com intensidade.',
    duration: '14 min',
    audioUrl: '/audio/abundancia-futuro-prospero.mp3',
    imageUrl: '/images/abundancia-futuro-prospero.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #E6B800 0%, #150E00 100%)',
  },
  {
    id: 'abundancia_5',
    session: 5,
    title: 'Gratidão Como Imã',
    description: 'O estado de gratidão genuína expande sua percepção de oportunidades.',
    duration: '10 min',
    audioUrl: '/audio/abundancia-gratidao-ima.mp3',
    imageUrl: '/images/abundancia-gratidao-ima.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #BFA020 0%, #100C00 100%)',
  },
  {
    id: 'abundancia_6',
    session: 6,
    title: 'Merecimento Sem Culpa',
    description: 'O maior bloqueio financeiro não é falta de esforço — é a crença de que você não merece.',
    duration: '12 min',
    audioUrl: '/audio/abundancia-merecimento.mp3',
    imageUrl: '/images/abundancia-merecimento.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #C8961A 0%, #120900 100%)',
  },
  {
    id: 'abundancia_7',
    session: 7,
    title: 'Consolidando a Nova Identidade',
    description: 'Você não tenta mais atrair dinheiro. Você é uma pessoa próspera.',
    duration: '15 min',
    audioUrl: '/audio/abundancia-nova-identidade.mp3',
    imageUrl: '/images/abundancia-nova-identidade.webp',
    hasAudio: true,
    isFree: true,
    gradient: 'linear-gradient(to bottom, #FFB932 0%, #09090F 100%)',
  },
];
