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
      { id: 'nat_1', title: 'Chuva suave', duration: '60 min', image: 'url(/images/sounds/chuva-suave.webp)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/chuva-suave.mp3' },
      { id: 'nat_2', title: 'Tempestade leve', duration: '45 min', image: 'url(/images/sounds/tempestade-leve.webp)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/tempestade-leve.mp3' },
      { id: 'nat_3', title: 'Cachoeira', duration: '90 min', image: 'url(/images/sounds/cachoeira.webp)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/cachoeira.mp3' },
      { id: 'nat_4', title: 'Riacho', duration: '60 min', image: 'url(/images/sounds/riacho.webp)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'nat_5', title: 'Vento nas árvores', duration: '75 min', image: 'url(/images/sounds/vento-arvores.webp)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'nat_6', title: 'Pássaros ao amanhecer', duration: '30 min', image: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'meditacao',
    emoji: '🧘‍♂️',
    title: 'Meditação & Presença',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    sounds: [
      { id: 'med_1', title: 'Taças tibetanas', duration: '45 min', image: 'url(/images/sounds/tibetan-bowl.png)', category: 'meditacao', isPremium: false, badge: 'MÚSICA', audioUrl: '/sounds/tibetan-bowl-26240.mp3' },
      { id: 'med_2', title: 'Flauta nativa', duration: '40 min', image: 'url(/images/sounds/flauta-nativa.png)', category: 'meditacao', isPremium: false, badge: 'MÚSICA', audioUrl: '/sounds/flute-recorder-18816.mp3' },
      { id: 'med_3', title: 'Mantras', duration: '60 min', image: 'url(/images/sounds/mantras.png)', category: 'meditacao', isPremium: false, badge: 'MÚSICA', audioUrl: '/sounds/aum_02_528hz-22432.mp3' },
      { id: 'med_4', title: 'Sons 432Hz', duration: '90 min', image: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', category: 'meditacao', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'med_5', title: 'Binaural Calm', duration: '60 min', image: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', category: 'meditacao', isPremium: true, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'frequencias',
    emoji: '🌌',
    title: 'Frequências Energéticas',
    gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    sounds: [
      { id: 'freq_1', title: '432Hz', duration: '120 min', image: 'url(/images/sounds/432hz.png)', category: 'frequencias', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/432hz-frequency.mp3' },
      { id: 'freq_2', title: '528Hz', duration: '120 min', image: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', category: 'frequencias', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'freq_3', title: '963Hz', duration: '90 min', image: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', category: 'frequencias', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'freq_4', title: 'Ressonância Schumann', duration: '180 min', image: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', category: 'frequencias', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'freq_5', title: 'Harmônicos cristalinos', duration: '60 min', image: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', category: 'frequencias', isPremium: false, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'sono',
    emoji: '🌙',
    title: 'Sono & Relaxamento',
    gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    sounds: [
      { id: 'sono_1', title: 'Ondas do mar', duration: '120 min', image: 'linear-gradient(135deg, #2e3192 0%, #1bffff 100%)', category: 'sono', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'sono_2', title: 'Chuva na janela', duration: '90 min', image: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)', category: 'sono', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'sono_3', title: 'White noise', duration: '240 min', image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', category: 'sono', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'sono_4', title: 'Pink noise', duration: '240 min', image: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', category: 'sono', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'sono_5', title: 'Vento noturno', duration: '150 min', image: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', category: 'sono', isPremium: false, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'mistico',
    emoji: '💭',
    title: 'Sons místicos & espirituais',
    gradient: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
    sounds: [
      { id: 'mist_1', title: 'Monges tibetanos', duration: '45 min', image: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', category: 'mistico', isPremium: false, badge: 'MÚSICA' },
      { id: 'mist_2', title: 'Canto budista suave', duration: '60 min', image: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', category: 'mistico', isPremium: false, badge: 'MÚSICA' },
      { id: 'mist_3', title: 'Temple bells', duration: '30 min', image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', category: 'mistico', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'mist_4', title: 'Atmospheric pads', duration: '90 min', image: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', category: 'mistico', isPremium: false, badge: 'SOM RELAXANTE' },
    ],
  },
];

// Função helper para pegar todos os sons de todas as categorias
export const getAllSounds = (): Sound[] => {
  return SOUND_CATEGORIES.flatMap(category => category.sounds);
};
