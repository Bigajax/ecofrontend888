import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  audioUrl?: string;
}

interface SoundCategory {
  id: string;
  emoji: string;
  title: string;
  gradient: string;
  sounds: Sound[];
}

interface CategoryPill {
  id: string;
  label: string;
}

const CATEGORY_PILLS: CategoryPill[] = [
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

const SOUND_CATEGORIES: SoundCategory[] = [
  {
    id: 'natureza',
    emoji: '🎧',
    title: 'Sons da Natureza',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    sounds: [
      { id: 'nat_1', title: 'Chuva suave', duration: '60 min', image: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/chuva-suave.mp3' },
      { id: 'nat_2', title: 'Tempestade leve', duration: '45 min', image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE', audioUrl: '/sounds/tempestade-leve.mp3' },
      { id: 'nat_3', title: 'Cachoeira', duration: '90 min', image: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'nat_4', title: 'Riacho', duration: '60 min', image: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', category: 'natureza', isPremium: true, badge: 'SOM RELAXANTE' },
      { id: 'nat_5', title: 'Vento nas árvores', duration: '75 min', image: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE' },
      { id: 'nat_6', title: 'Pássaros ao amanhecer', duration: '30 min', image: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', category: 'natureza', isPremium: false, badge: 'SOM RELAXANTE' },
    ],
  },
  {
    id: 'meditacao',
    emoji: '🧘‍♂️',
    title: 'Meditação & Presença',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    sounds: [
      { id: 'med_1', title: 'Taças tibetanas', duration: '45 min', image: 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', category: 'meditacao', isPremium: false, badge: 'MÚSICA' },
      { id: 'med_2', title: 'Flauta nativa', duration: '40 min', image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', category: 'meditacao', isPremium: false, badge: 'MÚSICA' },
      { id: 'med_3', title: 'Mantras', duration: '60 min', image: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', category: 'meditacao', isPremium: true, badge: 'MÚSICA' },
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
      { id: 'freq_1', title: '432Hz', duration: '120 min', image: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', category: 'frequencias', isPremium: false, badge: 'SOM RELAXANTE' },
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

export default function SonsPage() {
  const navigate = useNavigate();
  const [selectedPill, setSelectedPill] = useState('all');
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (sound: Sound) => {
    setSelectedSound(sound);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSound(null);
    setSelectedDuration(10);
  };

  const handleStartSound = () => {
    if (selectedSound) {
      navigate('/app/sound-player', {
        state: {
          sound: selectedSound,
          selectedDuration: selectedDuration
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF]">
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Header */}
        <h1 className="text-5xl sm:text-6xl font-bold text-[#38322A] mb-8">
          Sons
        </h1>

        {/* Category Pills */}
        <div className="flex gap-3 mb-12 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORY_PILLS.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedPill(pill.id)}
              className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                selectedPill === pill.id
                  ? 'bg-white text-[#38322A] shadow-md'
                  : 'bg-white/60 text-[#38322A]/70 hover:bg-white/80'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Sound Sections */}
        <div className="space-y-12">
          {SOUND_CATEGORIES.map((category) => (
            <div key={category.id}>
              {/* Section Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-[#38322A]">
                  {category.title}
                </h2>
                <button className="text-sm font-medium text-[#38322A]/60 hover:text-[#38322A] transition-colors">
                  Ver todos
                </button>
              </div>

              {/* Horizontal Scroll Container */}
              <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-4">
                {category.sounds.map((sound) => (
                  <div
                    key={sound.id}
                    className="flex-none w-[240px]"
                  >
                    {/* Sound Card */}
                    <div
                      onClick={() => handleCardClick(sound)}
                      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
                      style={{
                        background: sound.image,
                        aspectRatio: '4/5',
                      }}
                    >
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-between p-5">
                        {/* Top - Badge and Lock */}
                        <div className="flex items-start justify-between">
                          <span className="text-[9px] font-bold text-white/90 tracking-wider bg-white/20 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                            {sound.badge}
                          </span>
                          {sound.isPremium && (
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
                              <Lock size={14} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Bottom - Duration and Button */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-white/90">
                            <Clock size={14} strokeWidth={2} />
                            <span className="text-xs font-medium">{sound.duration}</span>
                          </div>
                          <button className="w-full bg-[#6B5DD3] hover:bg-[#5B4DC3] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors duration-300 uppercase tracking-wider">
                            SONS RELAXANTES
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Title Below Card */}
                    <h3 className="mt-3 text-base font-medium text-[#38322A]/80">
                      {sound.title}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duration Modal */}
      {isModalOpen && selectedSound && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl">
            {/* Header with curve */}
            <div className="relative bg-gradient-to-br from-[#4B5DD3] to-[#6B5DD3] h-32 flex items-center justify-center">
              <div className="absolute -bottom-12 bg-white rounded-full p-6 shadow-lg">
                <Clock size={40} className="text-[#4B5DD3]" strokeWidth={2} />
              </div>
            </div>

            {/* Content */}
            <div className="pt-16 pb-8 px-8">
              <h2 className="text-xl font-medium text-[#38322A]/70 text-center mb-8">
                Escolha a duração
              </h2>

              {/* Duration Options */}
              <div className="flex justify-center gap-6 mb-12">
                {[5, 10, 20].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`w-24 h-24 rounded-full border-2 transition-all duration-300 ${
                      selectedDuration === duration
                        ? 'border-[#6B5DD3] bg-[#6B5DD3]/10 text-[#6B5DD3] scale-110'
                        : 'border-gray-300 text-[#38322A]/60 hover:border-[#6B5DD3]/50'
                    }`}
                  >
                    <span className="text-base font-medium">{duration} min.</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-4 text-[#38322A]/60 font-medium hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <div className="w-px bg-gray-200" />
              <button
                onClick={handleStartSound}
                className="flex-1 py-4 text-[#6B5DD3] font-semibold hover:bg-[#6B5DD3]/5 transition-colors"
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
