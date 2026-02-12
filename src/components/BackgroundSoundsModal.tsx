import { useState, useEffect } from 'react';
import { X, Volume2, Lock } from 'lucide-react';
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
  backgroundVolume = 13, // Volume mais suave para som de fundo (13%)
  onVolumeChange,
}: BackgroundSoundsModalProps) {
  const [volume, setVolume] = useState(backgroundVolume);
  const allSounds = getAllSounds();

  // Sincronizar volume local com prop quando mudar
  useEffect(() => {
    setVolume(backgroundVolume);
  }, [backgroundVolume]);

  // Estilo customizado para scrollbar
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #F3F4F6;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #9CA3AF;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #6B7280;
    }
  `;

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
    <>
      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-4"
        style={{
          overscrollBehaviorX: 'none',
          touchAction: 'pan-y'
        }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content - Responsive */}
        <div className="relative w-full max-w-4xl max-h-[90vh] xs:max-h-[88vh] sm:max-h-[85vh] bg-white rounded-2xl xs:rounded-[22px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 xs:top-3.5 xs:right-3.5 sm:top-4 sm:right-4 z-10 flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation active:scale-95"
            aria-label="Fechar"
          >
            <X size={18} className="text-gray-700" />
          </button>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 xs:px-5 xs:py-5 sm:px-6 sm:py-5 md:px-8 md:py-6 overscroll-contain scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#9CA3AF #E5E7EB'
            }}
          >
          {/* Header */}
          <div className="mb-4 xs:mb-5 sm:mb-6 pr-8 xs:pr-10 sm:pr-0">
            {/* Title Section */}
            <div className="mb-3 xs:mb-3.5 sm:mb-4">
              <h1 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
                Sons de fundo
              </h1>
              <p className="text-[11px] xs:text-xs sm:text-sm text-gray-500">
                Fazemos sugestões personalizadas para você
              </p>
            </div>

            {/* Volume Control - Minimalista */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 xs:px-3.5 xs:py-2 sm:px-4 sm:py-2 w-full sm:w-auto">
              <Volume2 size={14} className="text-gray-600 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 cursor-pointer h-0.5 touch-manipulation"
                style={{
                  background: `linear-gradient(to right, #9CA3AF 0%, #9CA3AF ${volume}%, #E5E7EB ${volume}%, #E5E7EB 100%)`,
                  borderRadius: '999px'
                }}
              />
              <span className="text-xs font-semibold text-gray-700 min-w-[38px] text-right">
                {Math.round(volume)}%
              </span>
            </div>
          </div>

          {/* Sounds Grid - Fully Responsive */}
          <div className="pb-2 xs:pb-3 sm:pb-4">
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 xs:gap-2.5 sm:gap-3">
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
                    onClick={sound.isPremium ? undefined : () => handleSoundClick(sound)}
                    disabled={sound.isPremium}
                    className={`
                      relative aspect-square rounded-2xl sm:rounded-[22px] overflow-hidden
                      transition-all duration-300 touch-manipulation
                      ${sound.isPremium ? 'cursor-not-allowed' : 'active:scale-95 sm:hover:scale-105 cursor-pointer'}
                      ${isSelected ? 'ring-2 sm:ring-3 ring-[#6EC8FF] shadow-lg' : 'shadow-sm sm:hover:shadow-md'}
                    `}
                    style={{
                      ...imageStyle,
                      opacity: 1,
                      filter: 'none',
                    }}
                  >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Sound Title */}
                    <div className="absolute inset-0 flex items-end justify-center p-1.5 sm:p-2">
                      <h3 className="text-white font-medium text-[10px] xs:text-[11px] sm:text-xs text-center leading-tight">
                        {sound.title}
                      </h3>
                    </div>

                    {/* Lock Icon for Premium */}
                    {sound.isPremium && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Lock size={12} className="text-white" />
                      </div>
                    )}

                    {/* Selected Indicator */}
                    {isSelected && !sound.isPremium && (
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

    {/* Estilos para ocultar thumb do input range */}
    <style>{`
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 0;
        height: 0;
      }
      input[type="range"]::-moz-range-thumb {
        width: 0;
        height: 0;
        border: none;
        background: transparent;
      }
      input[type="range"]::-ms-thumb {
        width: 0;
        height: 0;
        background: transparent;
      }
    `}</style>
    </>
  );
}
