export type SoundOption = 'rain' | 'forest' | 'ocean' | 'silence';

/** Background audio URLs for each sound option.
 *  Filenames should match what's served under /audio/ in the public folder. */
export const SOUND_URLS: Record<SoundOption, string | null> = {
  rain: '/audio/chuva-suave.mp3',
  forest: '/audio/floresta.mp3',
  ocean: '/audio/ondas.mp3',
  silence: null,
};

export const SOUND_LABELS: Record<SoundOption, string> = {
  rain: 'Chuva',
  forest: 'Floresta',
  ocean: 'Ondas',
  silence: 'Silêncio',
};

export const SOUND_EMOJIS: Record<SoundOption, string> = {
  rain: '🌧️',
  forest: '🌿',
  ocean: '🌊',
  silence: '🔇',
};

export const LS_KEYS = {
  completed: 'eco.sono.guest.noite1.completed',
  progress: 'eco.sono.guest.noite1.progress',
  lead: 'eco.sono.guest.lead',
} as const;
