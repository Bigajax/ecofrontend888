import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Clock, Headphones, Music2, Flame, Brain, Moon, CloudRain, Sparkles, Radio, User, Leaf, type LucideIcon } from 'lucide-react';
import HomeHeader from '@/components/home/HomeHeader';
import { SOUND_CATEGORIES, type Sound } from '@/data/sounds';

interface CategoryPill {
  id: string;
  label: string;
  icon: LucideIcon;
}

const CATEGORY_PILLS: CategoryPill[] = [
  { id: 'all', label: 'Todos os sons', icon: Headphones },
  { id: 'musicas', label: 'Todas as músicas', icon: Music2 },
  { id: 'populares', label: 'Populares', icon: Flame },
  { id: 'concentracao', label: 'Música para concentração', icon: Brain },
  { id: 'dormir', label: 'Música para dormir', icon: Moon },
  { id: 'chuva', label: 'Sons de chuva', icon: CloudRain },
  { id: 'misticos', label: 'Sons místicos', icon: Sparkles },
  { id: 'radio', label: 'Rádio de música', icon: Radio },
  { id: 'meditacao', label: 'Música para meditação', icon: User },
  { id: 'natureza', label: 'Sons da natureza', icon: Leaf },
];

export default function SonsPage() {
  const navigate = useNavigate();
  const [selectedPill, setSelectedPill] = useState('all');
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para filtrar categorias baseado no pill selecionado
  const getFilteredCategories = () => {
    switch (selectedPill) {
      case 'all':
        return SOUND_CATEGORIES;

      case 'musicas':
        // Mostrar apenas sons com badge "MÚSICA"
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound => sound.badge === 'MÚSICA')
        })).filter(cat => cat.sounds.length > 0);

      case 'populares':
        // Mostrar os primeiros 3 sons de cada categoria (mais populares)
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.slice(0, 3)
        }));

      case 'concentracao':
        // Frequências energéticas + meditação
        return SOUND_CATEGORIES.filter(cat =>
          cat.id === 'frequencias' || cat.id === 'meditacao'
        );

      case 'dormir':
        // Sons relaxantes da natureza
        return SOUND_CATEGORIES.filter(cat => cat.id === 'natureza');

      case 'chuva':
        // Sons que contêm "chuva" no título
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound =>
            sound.title.toLowerCase().includes('chuva') ||
            sound.title.toLowerCase().includes('tempestade')
          )
        })).filter(cat => cat.sounds.length > 0);

      case 'misticos':
        // Sons de meditação (místicos)
        return SOUND_CATEGORIES.filter(cat => cat.id === 'meditacao');

      case 'radio':
        // Mix de todas as músicas
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound => sound.badge === 'MÚSICA')
        })).filter(cat => cat.sounds.length > 0);

      case 'meditacao':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'meditacao');

      case 'natureza':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'natureza');

      default:
        return SOUND_CATEGORIES;
    }
  };

  const filteredCategories = getFilteredCategories();

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
        <div
          className="flex gap-3 mb-12 overflow-x-auto scrollbar-hide pb-2 snap-x snap-proximity touch-pan-x"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const Icon = pill.icon;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedPill(pill.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 snap-start touch-manipulation ${
                  selectedPill === pill.id
                    ? 'bg-white text-[#38322A] shadow-md'
                    : 'bg-white/60 text-[#38322A]/70 active:bg-white/90 md:hover:bg-white/80'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Sound Sections */}
        <div className="space-y-12">
          {filteredCategories.map((category) => (
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

              {/* Horizontal Scroll Container - With Touch Support */}
              <div
                className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory touch-pan-x"
                style={{
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {category.sounds.map((sound) => (
                  <div
                    key={sound.id}
                    className="flex-none w-[240px] snap-start"
                  >
                    {/* Sound Card */}
                    <div
                      onClick={() => handleCardClick(sound)}
                      className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 md:hover:scale-95 md:hover:shadow-xl touch-manipulation"
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

                        {/* Bottom - Empty space for layout */}
                        <div></div>
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
              <div className="flex justify-center gap-5 mb-12">
                {[5, 10, 20].map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`w-20 h-20 rounded-full border-2 transition-all duration-300 ${
                      selectedDuration === duration
                        ? 'border-[#5DADE2] bg-[#5DADE2]/15 text-[#2E86AB] scale-105 font-semibold'
                        : 'border-gray-300 text-[#38322A]/60 hover:border-[#5DADE2]/50'
                    }`}
                  >
                    <span className="text-sm font-medium">{duration} min.</span>
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
                className="flex-1 py-4 text-[#2E86AB] font-semibold hover:bg-[#5DADE2]/10 transition-colors"
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
