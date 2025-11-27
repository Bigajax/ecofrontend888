import { useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { getAllSounds, type Sound } from '@/data/sounds';

interface BackgroundSoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSoundId?: string | null;
  onSelectSound: (sound: Sound) => void;
  backgroundVolume?: number;
  onVolumeChange?: (volume: number) => void;
}

export default function BackgroundSoundsModal({
  isOpen,
  onClose,
  selectedSoundId,
  onSelectSound,
  backgroundVolume = 40,
  onVolumeChange,
}: BackgroundSoundsModalProps) {
  const [volume, setVolume] = useState(backgroundVolume);
  const allSounds = getAllSounds();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const handleSoundClick = (sound: Sound) => {
    onSelectSound(sound);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content - Responsive */}
      <div className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation active:scale-95"
          aria-label="Fechar"
        >
          <X size={18} className="text-gray-700" />
        </button>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 pr-8 sm:pr-0">
            {/* Title Section */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
                Sons de fundo
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Fazemos sugestões personalizadas para você
              </p>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-2 sm:px-4 sm:py-2.5 w-full sm:w-auto">
              <Volume2 size={16} className="text-gray-700 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 cursor-pointer h-1 sm:h-1.5 touch-manipulation"
                style={{
                  background: `linear-gradient(to right, #6B5DD3 0%, #6B5DD3 ${volume}%, #D1D5DB ${volume}%, #D1D5DB 100%)`,
                  borderRadius: '999px'
                }}
              />
              <span className="text-xs font-medium text-gray-700 w-8 text-right">
                %{Math.round(volume)}
              </span>
            </div>
          </div>

          {/* Sounds Grid - Fully Responsive */}
          <div className="pb-2 sm:pb-4">
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {allSounds.map((sound) => {
                const isSelected = selectedSoundId === sound.id;
                const imageStyle = sound.image.startsWith('url(')
                  ? {
                      backgroundImage: sound.image,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {
                      background: sound.image,
                    };

                return (
                  <button
                    key={sound.id}
                    onClick={() => handleSoundClick(sound)}
                    className={`
                      relative aspect-square rounded-2xl sm:rounded-[22px] overflow-hidden
                      transition-all duration-300 active:scale-95 sm:hover:scale-105
                      touch-manipulation
                      ${isSelected ? 'ring-2 sm:ring-3 ring-[#6EC8FF] shadow-lg' : 'shadow-sm sm:hover:shadow-md'}
                    `}
                    style={imageStyle}
                  >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Sound Title */}
                    <div className="absolute inset-0 flex items-end justify-center p-1.5 sm:p-2">
                      <h3 className="text-white font-medium text-[10px] xs:text-xs sm:text-xs text-center leading-tight">
                        {sound.title}
                      </h3>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-[#6EC8FF] rounded-full flex items-center justify-center">
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 14 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="sm:w-3 sm:h-2.5"
                        >
                          <path
                            d="M1 5L5 9L13 1"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
