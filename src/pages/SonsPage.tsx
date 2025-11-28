import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { SOUND_CATEGORIES, type Sound } from '@/data/sounds';

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
    <div className="min-h-screen bg-white">
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
                      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-95 hover:shadow-xl"
                      style={{
                        background: sound.image,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
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
                          <button className="w-full bg-[#A8D8EA] hover:bg-[#8BC6DB] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors duration-300 uppercase tracking-wider">
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
            <div className="relative bg-gradient-to-br from-[#A8D8EA] to-[#8BC6DB] h-32 flex items-center justify-center">
              <div className="absolute -bottom-12 bg-white rounded-full p-6 shadow-lg">
                <Clock size={40} className="text-[#A8D8EA]" strokeWidth={2} />
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
                        ? 'border-[#A8D8EA] bg-[#A8D8EA]/10 text-[#A8D8EA] scale-110'
                        : 'border-gray-300 text-[#38322A]/60 hover:border-[#A8D8EA]/50'
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
                className="flex-1 py-4 text-[#A8D8EA] font-semibold hover:bg-[#A8D8EA]/5 transition-colors"
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
