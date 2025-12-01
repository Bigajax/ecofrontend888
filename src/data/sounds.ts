export interface Sound {
  id: string;
  title: string;
  duration: string;
  image: string;
  category: string;
  isPremium: boolean;
  badge: string;
  audioUrl?: string;
}

export interface SoundCategory {
  id: string;
  emoji: string;
  title: string;
  gradient: string;
  sounds: Sound[];
}

export const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: 'natureza',
    emoji: '🎧',
    title: 'Sons da Natureza',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    sounds: [
      { id: 'nat_1', title: 'Chuva suave', duration: '60 min', image: 'url(/images/sounds/chuva-suave.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE', audioUrl: '/sounds/chuva-suave.mp3' },
      { id: 'nat_2', title: 'Tempestade leve', duration: '45 min', image: 'url(/images/sounds/tempestade-leve.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE', audioUrl: '/sounds/tempestade-leve.mp3' },
      { id: 'nat_3', title: 'Cachoeira', duration: '90 min', image: 'url(/images/sounds/cachoeira.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE', audioUrl: '/sounds/cachoeira.mp3' },
      { id: 'nat_4', title: 'Riacho', duration: '60 min', image: 'url(/images/sounds/riacho.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'nat_5', title: 'Vento nas árvores', duration: '75 min', image: 'url(/images/sounds/vento-arvores.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'meditacao',
    emoji: '🧘‍♂️',
    title: 'Meditação & Presença',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    sounds: [
      { id: 'med_1', title: 'Taças tibetanas', duration: '45 min', image: 'url(/images/sounds/tibetan-bowl.png)', category: 'meditacao', isPremium: true, badge: 'MÚSICA', audioUrl: '/sounds/tibetan-bowl-26240.mp3' },
      { id: 'med_2', title: 'Flauta nativa', duration: '40 min', image: 'url(/images/sounds/flauta-nativa.png)', category: 'meditacao', isPremium: true, badge: 'MÚSICA', audioUrl: '/sounds/flute-recorder-18816.mp3' },
      { id: 'med_3', title: 'Mantras', duration: '60 min', image: 'url(/images/sounds/mantras.png)', category: 'meditacao', isPremium: true, badge: 'MÚSICA', audioUrl: '/sounds/aum_02_528hz-22432.mp3' },
    ],
  },
  {
    id: 'frequencias',
    emoji: '🌌',
    title: 'Frequências Energéticas',
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    sounds: [
      { id: 'freq_1', title: '432Hz', duration: '120 min', image: 'url(/images/sounds/432hz.png)', category: 'frequencias', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/432hz-frequency.mp3' },
    ],
  },
];

// Função helper para pegar todos os sons de todas as categorias
export const getAllSounds = (): Sound[] => {
  return SOUND_CATEGORIES.flatMap(category => category.sounds);
};
