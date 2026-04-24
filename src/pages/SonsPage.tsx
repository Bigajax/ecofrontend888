import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Clock, Headphones, Music2, Flame, Brain, Moon, CloudRain, Sparkles, Radio, User, Leaf, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const getFilteredCategories = () => {
    switch (selectedPill) {
      case 'all':
        return SOUND_CATEGORIES;
      case 'musicas':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound => sound.badge === 'MÚSICA')
        })).filter(cat => cat.sounds.length > 0);
      case 'populares':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.slice(0, 3)
        }));
      case 'concentracao':
        return SOUND_CATEGORIES.filter(cat =>
          cat.id === 'frequencias' || cat.id === 'meditacao'
        );
      case 'dormir':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'natureza');
      case 'chuva':
        return SOUND_CATEGORIES.map(cat => ({
          ...cat,
          sounds: cat.sounds.filter(sound =>
            sound.title.toLowerCase().includes('chuva') ||
            sound.title.toLowerCase().includes('tempestade')
          )
        })).filter(cat => cat.sounds.length > 0);
      case 'misticos':
        return SOUND_CATEGORIES.filter(cat => cat.id === 'meditacao');
      case 'radio':
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
    <div
      className="min-h-screen"
      style={{
        background: '#FFFFFF',
      }}
    >
      <HomeHeader />

      <div className="max-w-7xl mx-auto px-4 pt-8 pb-28 sm:px-6 lg:px-8">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: '#0A6BBF' }}
          >
            BIBLIOTECA
          </p>
          <h1
            className="font-display text-[48px] sm:text-[56px] font-bold leading-none mb-3"
            style={{ color: '#0D3461' }}
          >
            Sons
          </h1>
          <p className="text-[15px]" style={{ color: 'rgba(56,50,42,0.55)' }}>
            Música ambiente e sons para qualquer momento.
          </p>
        </motion.div>

        {/* Category Pills */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="flex gap-2.5 mb-10 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const Icon = pill.icon;
            const isActive = selectedPill === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedPill(pill.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #1A4FB5, #0D3461)',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(13,52,97,0.28)',
                  border: '1px solid transparent',
                } : {
                  background: 'rgba(255,255,255,0.78)',
                  color: '#38322A',
                  border: '1px solid rgba(0,0,0,0.09)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Icon size={15} strokeWidth={2} />
                {pill.label}
              </button>
            );
          })}
        </motion.div>

        {/* Sound Sections */}
        <div className="space-y-10">
          {filteredCategories.map((category, catIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 + catIndex * 0.08 }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-5 px-0.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{ background: 'linear-gradient(180deg, #1A4FB5, #0D3461)' }}
                  />
                  <h2
                    className="font-display text-[22px] font-bold"
                    style={{ color: '#0D3461' }}
                  >
                    {category.title}
                  </h2>
                </div>
                <button
                  className="text-[13px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: '#0A6BBF' }}
                >
                  Ver todos
                </button>
              </div>

              {/* Horizontal Scroll */}
              <div
                className="flex gap-4 overflow-x-auto pb-3"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                {category.sounds.map((sound, soundIndex) => (
                  <motion.div
                    key={sound.id}
                    className="flex-none w-[185px] sm:w-[210px]"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    transition={{ type: 'spring', stiffness: 80, damping: 20, delay: soundIndex * 0.06 }}
                  >
                    <SoundCard sound={sound} onClick={() => handleCardClick(sound)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Duration Modal */}
      <AnimatePresence>
        {isModalOpen && selectedSound && (
          <DurationModal
            sound={selectedSound}
            duration={selectedDuration}
            onDurationChange={setSelectedDuration}
            onClose={handleCloseModal}
            onStart={handleStartSound}
          />
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ─── Sound Card ─────────────────────────────────────────────── */

function SoundCard({ sound, onClick }: { sound: Sound; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group w-full text-left">
      {/* Card */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{
          aspectRatio: '3/4',
          boxShadow: '0 8px 28px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            background: sound.image,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/05" />

        {/* Top row: badge + lock */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/90">
              {sound.badge}
            </span>
          </span>
          {sound.isPremium && (
            <div
              className="flex items-center justify-center rounded-xl p-1.5 backdrop-blur-md"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <Lock size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Bottom: play pill */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 group-hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.26)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span className="text-[11px] font-semibold text-white">Ouvir</span>
          </div>
        </div>
      </div>

      {/* Title + duration below */}
      <div className="mt-2.5 px-0.5">
        <p
          className="text-[14px] font-semibold leading-snug truncate"
          style={{ color: '#1A3A5C' }}
        >
          {sound.title}
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(56,50,42,0.45)' }}>
          {sound.duration}
        </p>
      </div>
    </button>
  );
}

/* ─── Duration Modal ─────────────────────────────────────────── */

interface DurationModalProps {
  sound: Sound;
  duration: number;
  onDurationChange: (d: number) => void;
  onClose: () => void;
  onStart: () => void;
}

function DurationModal({ sound, duration, onDurationChange, onClose, onStart }: DurationModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="w-full max-w-md overflow-hidden rounded-3xl"
        style={{ background: '#FFFFFF', boxShadow: '0 32px 80px rgba(0,0,0,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero header */}
        <div
          className="relative h-36 flex items-end p-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #07192E 0%, #0D2E4F 40%, #0F4476 100%)' }}
        >
          {/* Orbs */}
          <div
            className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(110,200,255,0.20) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[-30px] left-[-20px] w-36 h-36 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(75,174,232,0.14) 0%, transparent 70%)' }}
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50 mb-1">
              Duração da sessão
            </p>
            <h3 className="font-display text-[22px] font-bold text-white leading-tight">
              {sound.title}
            </h3>
          </div>
        </div>

        {/* Duration picker */}
        <div className="px-7 pt-7 pb-6">
          <div className="flex items-center justify-center gap-4 mb-7">
            {[5, 10, 20].map((mins) => (
              <button
                key={mins}
                onClick={() => onDurationChange(mins)}
                className="flex flex-col items-center justify-center w-[88px] h-[88px] rounded-2xl transition-all duration-200 active:scale-95"
                style={duration === mins ? {
                  background: 'linear-gradient(135deg, #1A4FB5, #0D3461)',
                  boxShadow: '0 6px 20px rgba(13,52,97,0.30)',
                  transform: 'scale(1.06)',
                } : {
                  background: 'rgba(13,52,97,0.05)',
                  border: '1.5px solid rgba(13,52,97,0.14)',
                }}
              >
                <span
                  className="text-[22px] font-bold leading-none"
                  style={{ color: duration === mins ? 'white' : '#1A3A5C' }}
                >
                  {mins}
                </span>
                <span
                  className="text-[11px] font-medium mt-1"
                  style={{ color: duration === mins ? 'rgba(255,255,255,0.80)' : 'rgba(56,50,42,0.50)' }}
                >
                  min
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mb-7 justify-center">
            <Clock size={13} style={{ color: 'rgba(56,50,42,0.40)' }} />
            <span className="text-[13px]" style={{ color: 'rgba(56,50,42,0.45)' }}>
              Sessão de {duration} minutos selecionada
            </span>
          </div>

          {/* Actions */}
          <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-semibold text-[15px] text-white transition-all duration-200 active:scale-[0.98] hover:opacity-90 mb-3"
            style={{
              background: 'linear-gradient(135deg, #1A4FB5, #0D3461)',
              boxShadow: '0 6px 20px rgba(13,52,97,0.28)',
            }}
          >
            Iniciar sessão →
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-medium text-[14px] transition-all duration-200 active:scale-[0.98]"
            style={{
              color: 'rgba(56,50,42,0.55)',
              background: 'rgba(0,0,0,0.04)',
            }}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
