/**
 * EXEMPLO DE INTEGRAÇÃO DO BACKGROUNDSOUNDSMODAL
 *
 * Este arquivo mostra como integrar o BackgroundSoundsModal
 * no SoundPlayerPage ou em qualquer outra página de player.
 */

import { useState, useRef, useEffect } from 'react';
import { Music } from 'lucide-react';
import BackgroundSoundsModal from './BackgroundSoundsModal';
import { type Sound } from '@/data/sounds';

export default function SoundPlayerWithBackgroundExample() {
  // Estados do modal
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [selectedBackgroundSound, setSelectedBackgroundSound] = useState<Sound | null>(null);
  const [backgroundVolume, setBackgroundVolume] = useState(40);

  // Referência para o áudio de fundo
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Controlar reprodução do áudio de fundo
  useEffect(() => {
    if (backgroundAudioRef.current && selectedBackgroundSound?.audioUrl) {
      backgroundAudioRef.current.play().catch(err => {
        console.error('Erro ao reproduzir som de fundo:', err);
      });
    }
  }, [selectedBackgroundSound]);

  // Controlar volume do áudio de fundo
  useEffect(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.volume = backgroundVolume / 100;
    }
  }, [backgroundVolume]);

  const handleOpenBackgroundModal = () => {
    setIsBackgroundModalOpen(true);
  };

  const handleCloseBackgroundModal = () => {
    setIsBackgroundModalOpen(false);
  };

  const handleSelectBackgroundSound = (sound: Sound) => {
    setSelectedBackgroundSound(sound);
  };

  const handleRemoveBackgroundSound = () => {
    setSelectedBackgroundSound(null);
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#E8E4F3] to-[#D8D0E8]">
      {/* Exemplo: Botão para abrir o modal de sons de fundo */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={handleOpenBackgroundModal}
          className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Music size={20} className="text-gray-700" />
          <span className="text-sm font-medium text-gray-700">
            {selectedBackgroundSound ? selectedBackgroundSound.title : 'Sons de fundo'}
          </span>
          {selectedBackgroundSound && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBackgroundSound();
              }}
              className="ml-2 w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-xs text-gray-600">×</span>
            </button>
          )}
        </button>
      </div>

      {/* Modal de Sons de Fundo */}
      <BackgroundSoundsModal
        isOpen={isBackgroundModalOpen}
        onClose={handleCloseBackgroundModal}
        selectedSoundId={selectedBackgroundSound?.id}
        onSelectSound={handleSelectBackgroundSound}
        backgroundVolume={backgroundVolume}
        onVolumeChange={setBackgroundVolume}
      />

      {/* Áudio de fundo (oculto) */}
      {selectedBackgroundSound?.audioUrl && (
        <audio
          ref={backgroundAudioRef}
          src={selectedBackgroundSound.audioUrl}
          loop
          preload="auto"
        />
      )}

      {/* Resto do conteúdo do player... */}
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Player Example
          </h1>
          <p className="text-gray-600">
            Clique no botão "Sons de fundo" abaixo para testar o modal
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PASSO A PASSO PARA INTEGRAR NO SOUNDPLAYERPAGE:
 *
 * 1. Adicione os imports:
 *    import BackgroundSoundsModal from '@/components/BackgroundSoundsModal';
 *    import { type Sound } from '@/data/sounds';
 *    import { Music } from 'lucide-react';
 *
 * 2. Adicione os estados (dentro do componente):
 *    const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
 *    const [selectedBackgroundSound, setSelectedBackgroundSound] = useState<Sound | null>(null);
 *    const [backgroundVolume, setBackgroundVolume] = useState(40);
 *    const backgroundAudioRef = useRef<HTMLAudioElement>(null);
 *
 * 3. Adicione os useEffects para controlar o áudio de fundo
 *
 * 4. Adicione o botão "Sons de fundo" onde desejar no layout (exemplo: próximo ao botão Bell)
 *
 * 5. Adicione o componente BackgroundSoundsModal antes do </div> final
 *
 * 6. Adicione o elemento <audio> para o som de fundo
 */
