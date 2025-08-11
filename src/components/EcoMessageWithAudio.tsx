import React, { useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import { ClipboardCopy, ThumbsUp, ThumbsDown, Volume2, Loader2 } from 'lucide-react';
import AudioPlayerOverlay from './AudioPlayerOverlay';
import { gerarAudioDaMensagem } from '../api/voiceApi';
import { Message } from '../contexts/ChatContext';

interface EcoMessageWithAudioProps {
  message: Message;
}

const TAP = 32;      // área mínima de toque (px)
const ICON = 16;     // tamanho do ícone

const EcoMessageWithAudio: React.FC<EcoMessageWithAudioProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const iconBase = 'text-gray-500 group-hover:text-gray-800';
  const iconClass = `${iconBase}`;

  const displayText = message.text ?? message.content ?? '';

  // limpa o URL do áudio ao fechar/desmontar
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
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

  const btnBase =
    'group inline-flex items-center justify-center rounded-md hover:bg-gray-100 active:bg-gray-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition';
  const btnStyle = { width: TAP, height: TAP };

  return (
    <>
      <div className="flex flex-col items-start">
        {/* bolha da mensagem */}
        <ChatMessage message={message} />

        {/* barra de ações (compacta) */}
        <div
          className="
            mt-1 ml-1.5
            flex items-center gap-1
            max-w-[76vw] sm:max-w-[70ch]
          "
        >
          <button
            onClick={copiarTexto}
            className={btnBase}
            style={btnStyle}
            aria-label="Copiar mensagem"
            title="Copiar"
          >
            <ClipboardCopy size={ICON} strokeWidth={1.75} className={iconClass} />
          </button>

          <button
            className={btnBase}
            style={btnStyle}
            aria-label="Curtir resposta"
            title="Curtir"
            onClick={() => { /* futuro: enviar feedback +1 */ }}
          >
            <ThumbsUp size={ICON} strokeWidth={1.75} className={iconClass} />
          </button>

          <button
            className={btnBase}
            style={btnStyle}
            aria-label="Não curtir resposta"
            title="Não curtir"
            onClick={() => { /* futuro: enviar feedback -1 */ }}
          >
            <ThumbsDown size={ICON} strokeWidth={1.75} className={iconClass} />
          </button>

          <button
            onClick={reproduzirAudio}
            className={`${btnBase} disabled:opacity-50 disabled:pointer-events-none`}
            style={btnStyle}
            aria-label={loadingAudio ? 'Gerando áudio...' : 'Ouvir em áudio'}
            title="Ouvir"
            disabled={loadingAudio}
          >
            {loadingAudio ? (
              <Loader2 size={ICON} strokeWidth={1.75} className={`${iconClass} animate-spin`} />
            ) : (
              <Volume2 size={ICON} strokeWidth={1.75} className={iconClass} />
            )}
          </button>

          {/* toast inline */}
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
        <AudioPlayerOverlay
          audioUrl={audioUrl}
          onClose={() => {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
          }}
        />
      )}
    </>
  );
};

export default EcoMessageWithAudio;
