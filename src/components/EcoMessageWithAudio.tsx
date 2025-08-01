import React, { useState } from 'react';
import ChatMessage from './ChatMessage';
import { ClipboardCopy, ThumbsUp, ThumbsDown, Volume2, Loader2 } from 'lucide-react';
import AudioPlayerOverlay from './AudioPlayerOverlay';
import { gerarAudioDaMensagem } from '../api/voiceApi';
import { Message } from '../contexts/ChatContext';

interface EcoMessageWithAudioProps {
  message: Message;
}

const EcoMessageWithAudio: React.FC<EcoMessageWithAudioProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const iconBase = 'text-gray-500 group-hover:text-gray-800';
  const iconSize = 'h-[18px] w-[18px] sm:h-5 sm:w-5';
  const iconClass = `${iconBase} ${iconSize}`;
  const displayText = message.text ?? message.content ?? '';

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      console.warn('Falha ao copiar', e);
    }
  };

  const reproduzirAudio = async () => {
    if (loadingAudio) return;
    setLoadingAudio(true);
    try {
      const blob = await gerarAudioDaMensagem(displayText);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      console.error('Erro ao gerar áudio:', err);
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start">
        {/* bolha da mensagem (usa o mesmo componente) */}
        <ChatMessage message={message} />

        {/* barra de ações — acompanha a mesma largura da bolha */}
        <div
          className="
            mt-1.5 ml-2
            flex items-center gap-1.5
            max-w-[76vw] sm:max-w-[70ch]
          "
        >
          <button
            onClick={copiarTexto}
            className="group p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200"
            aria-label="Copiar mensagem"
            title="Copiar"
          >
            <ClipboardCopy className={iconClass} />
          </button>

          <button
            className="group p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200"
            aria-label="Curtir resposta"
            title="Curtir"
            onClick={() => {/* hook de feedback futuro */}}
          >
            <ThumbsUp className={iconClass} />
          </button>

          <button
            className="group p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200"
            aria-label="Não curtir resposta"
            title="Não curtir"
            onClick={() => {/* hook de feedback futuro */}}
          >
            <ThumbsDown className={iconClass} />
          </button>

          <button
            onClick={reproduzirAudio}
            className="group p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none"
            aria-label={loadingAudio ? 'Gerando áudio...' : 'Ouvir em áudio'}
            title="Ouvir"
            disabled={loadingAudio}
          >
            {loadingAudio ? (
              <Loader2 className={`${iconClass} animate-spin`} />
            ) : (
              <Volume2 className={iconClass} />
            )}
          </button>

          {/* toast inline, sem deslocar layout */}
          <span
            className={`text-[11px] sm:text-xs text-gray-400 ml-1 transition-opacity ${
              copied ? 'opacity-100' : 'opacity-0'
            }`}
            aria-live="polite"
          >
            Copiado!
          </span>
        </div>
      </div>

      {audioUrl && (
        <AudioPlayerOverlay audioUrl={audioUrl} onClose={() => setAudioUrl(null)} />
      )}
    </>
  );
};

export default EcoMessageWithAudio;
