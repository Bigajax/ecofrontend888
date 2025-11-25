import { useState } from 'react';
import { Clock, Lock } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';

interface Sound {
  id: string;
  title: string;
  duration: string;
  image: string;
  category: string;
  isPremium: boolean;
  badge: string;
}

const SOUND_CATEGORIES = [
  { id: 'all', label: 'Todos os sons' },
  { id: 'musicas', label: 'Todas as músicas' },
  { id: 'populares', label: 'Populares' },
  { id: 'concentracao', label: 'Música para concentração' },
  { id: 'dormir', label: 'Música para dormir' },
  { id: 'chuva', label: 'Sons de chuva' },
  { id: 'misticos', label: 'Sons místicos' },
  { id: 'radio', label: 'Rádio de música' },
  { id: 'meditacao', label: 'Música para meditação' },
  { id: 'natureza', label: 'Sons da natureza' },
];

const SOUNDS_DATA: Sound[] = [
  {
    id: 'sound_1',
    title: 'Sons Relaxantes',
    duration: '10 min',
    image: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    category: 'all',
    isPremium: false,
    badge: 'SOM RELAXANTE',
  },
  {
    id: 'sound_2',
    title: 'Sons Relaxantes',
    duration: '10 min',
    image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    category: 'all',
    isPremium: false,
    badge: 'SOM RELAXANTE',
  },
  {
    id: 'sound_3',
    title: 'Sons Relaxantes',
    duration: '10 min',
    image: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
    category: 'all',
    isPremium: false,
    badge: 'SOM RELAXANTE',
  },
  {
    id: 'sound_4',
    title: 'Sons Relaxantes',
    duration: '10 min',
    image: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
    category: 'all',
    isPremium: true,
    badge: 'SOM RELAXANTE',
  },
  {
    id: 'sound_5',
    title: 'Sons Relaxantes',
    duration: '10 min',
    image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    category: 'all',
    isPremium: true,
    badge: 'SOM RELAXANTE',
  },
];

export default function SonsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSounds = SOUNDS_DATA.filter(
    (sound) => selectedCategory === 'all' || sound.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Header */}
        <h1 className="text-5xl sm:text-6xl font-bold text-[#38322A] mb-8">
          Sons
        </h1>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-3 mb-12">
          {SOUND_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-white text-[#38322A] shadow-md'
                  : 'bg-white/60 text-[#38322A]/70 hover:bg-white/80'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#38322A]">
            Todos os sons
          </h2>
          <button className="text-sm font-medium text-[#38322A]/60 hover:text-[#38322A] transition-colors">
            Ver todos
          </button>
        </div>

        {/* Sound Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {filteredSounds.map((sound) => (
            <div
              key={sound.id}
              className="group relative rounded-3xl overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105"
              style={{
                background: sound.image,
                aspectRatio: '3/4',
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between p-6">
                {/* Top - Badge and Lock */}
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-white/90 tracking-wider bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    {sound.badge}
                  </span>
                  {sound.isPremium && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                      <Lock size={16} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Bottom - Title and Duration */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/90">
                    <Clock size={14} strokeWidth={2} />
                    <span className="text-xs font-medium">{sound.duration}</span>
                  </div>
                  <button className="w-full bg-[#6B5DD3] hover:bg-[#5B4DC3] text-white text-sm font-semibold py-3 rounded-xl transition-colors duration-300 uppercase tracking-wide">
                    {sound.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
