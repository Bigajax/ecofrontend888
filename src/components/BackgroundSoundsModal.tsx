import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Check } from 'lucide-react';
import { SOUND_CATEGORIES, type Sound } from '@/data/sounds';

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
  backgroundVolume = 70,
  onVolumeChange,
}: BackgroundSoundsModalProps) {
  const [volume, setVolume] = useState(backgroundVolume);

  useEffect(() => { setVolume(backgroundVolume); }, [backgroundVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    onVolumeChange?.(v);
  };

  // Featured sound = first of meditacao category
  const featuredCategory = SOUND_CATEGORIES.find(c => c.id === 'meditacao');
  const featuredSound = featuredCategory?.sounds[0] ?? null;
  const isFeaturedSelected = selectedSoundId === featuredSound?.id;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="bg-sounds-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        >
          <motion.div
            key="bg-sounds-panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.30, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl"
            style={{
              background: 'linear-gradient(160deg, #0A0D1F 0%, #06091A 60%, #0D1530 100%)',
              border: '1px solid rgba(167,139,250,0.18)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.70), 0 8px 40px rgba(124,58,237,0.14)',
              maxHeight: '88vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top purple glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40"
              style={{ background: 'linear-gradient(to bottom, rgba(124,58,237,0.12) 0%, transparent 100%)' }} />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-[16px] font-bold text-white">Sons de fundo</h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Toca junto com a meditação
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <X className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.50)' }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="relative z-10 overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(88vh - 130px)' }}>

              {/* Volume row */}
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <button
                  onClick={() => { const v = volume > 0 ? 0 : 35; setVolume(v); onVolumeChange?.(v); }}
                  className="flex-shrink-0 transition-opacity hover:opacity-70"
                >
                  {volume === 0
                    ? <VolumeX className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
                    : <Volume2 className="h-4 w-4" style={{ color: '#C4B5FD' }} />
                  }
                </button>
                <div className="relative flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${volume}%`, background: 'linear-gradient(to right, #A78BFA, #7C3AED)' }}
                  />
                  <input
                    type="range" min="0" max="100" value={volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: '100%' }}
                  />
                </div>
                <span className="flex-shrink-0 text-[12px] font-mono font-semibold w-8 text-right"
                  style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {Math.round(volume)}%
                </span>
              </div>

              {/* Featured sound */}
              {featuredSound && (
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5"
                    style={{ color: 'rgba(196,181,253,0.55)' }}>
                    Principal
                  </p>
                  <button
                    onClick={() => onSelectSound(featuredSound)}
                    className="relative w-full overflow-hidden rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      height: '90px',
                      border: isFeaturedSelected
                        ? '1.5px solid rgba(196,181,253,0.60)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isFeaturedSelected ? '0 0 20px rgba(124,58,237,0.30)' : 'none',
                    }}
                  >
                    {/* Background image */}
                    <img
                      src="/images/sounds/meditacao-profunda.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: isFeaturedSelected ? 'brightness(0.65)' : 'brightness(0.45) saturate(0.8)' }}
                    />
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to right, rgba(6,9,26,0.85) 0%, rgba(6,9,26,0.30) 100%)' }} />

                    <div className="absolute inset-0 flex items-center px-4 gap-3">
                      {/* Play indicator */}
                      <div
                        className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          background: isFeaturedSelected
                            ? 'linear-gradient(135deg, #A78BFA 0%, #6D42C9 100%)'
                            : 'rgba(255,255,255,0.12)',
                          border: isFeaturedSelected ? 'none' : '1px solid rgba(255,255,255,0.16)',
                          boxShadow: isFeaturedSelected ? '0 4px 16px rgba(124,58,237,0.50)' : 'none',
                        }}
                      >
                        {isFeaturedSelected
                          ? <Check className="h-4 w-4 text-white" />
                          : <div className="flex gap-0.5 items-end h-4">
                              {[3, 5, 4, 6, 3].map((h, i) => (
                                <div key={i} className="w-0.5 rounded-full" style={{ height: `${h * 3}px`, background: 'rgba(255,255,255,0.50)' }} />
                              ))}
                            </div>
                        }
                      </div>

                      <div className="flex-1 text-left">
                        <p className="text-[15px] font-bold text-white leading-tight">{featuredSound.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {featuredSound.duration} · {featuredSound.category === 'meditacao' ? 'Meditação' : featuredSound.category}
                        </p>
                      </div>

                      {isFeaturedSelected && (
                        <div
                          className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(167,139,250,0.20)', border: '1px solid rgba(167,139,250,0.35)', color: '#C4B5FD' }}
                        >
                          Ativo
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Categories */}
              {SOUND_CATEGORIES.map(category => {
                // Skip meditacao category first sound (already shown as featured)
                const sounds = category.id === 'meditacao' ? category.sounds.slice(1) : category.sounds;
                if (sounds.length === 0) return null;

                return (
                  <div key={category.id} className="mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2.5"
                      style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {category.emoji} {category.title}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {sounds.map(sound => {
                        const isSelected = selectedSoundId === sound.id;
                        const isImageUrl = sound.image.startsWith('url(');
                        const imgSrc = isImageUrl
                          ? sound.image.replace(/^url\(["']?/, '').replace(/["']?\)$/, '')
                          : null;

                        return (
                          <button
                            key={sound.id}
                            onClick={() => onSelectSound(sound)}
                            className="relative overflow-hidden rounded-xl transition-all duration-200 active:scale-[0.95] hover:scale-[1.02]"
                            style={{
                              height: '72px',
                              border: isSelected
                                ? '1.5px solid rgba(196,181,253,0.55)'
                                : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: isSelected ? '0 0 14px rgba(124,58,237,0.28)' : 'none',
                            }}
                          >
                            {/* Background */}
                            {imgSrc ? (
                              <img src={imgSrc} alt="" className="absolute inset-0 w-full h-full object-cover"
                                style={{ filter: isSelected ? 'brightness(0.55)' : 'brightness(0.35) saturate(0.7)' }} />
                            ) : (
                              <div className="absolute inset-0" style={{ background: sound.image }} />
                            )}
                            <div className="absolute inset-0"
                              style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(4,6,15,0.80) 100%)' }} />

                            {/* Selected check */}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ background: 'linear-gradient(135deg, #A78BFA, #6D42C9)' }}>
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}

                            {/* Title */}
                            <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
                              <p className="text-[10px] font-medium text-white leading-tight text-center"
                                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.80)' }}>
                                {sound.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
