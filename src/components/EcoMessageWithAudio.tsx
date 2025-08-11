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

  const isUser = message.sender === 'user';
  const displayText = message.text ?? message.content ?? '';

  const iconBase = 'text-gray-500 group-hover:text-gray-800';
  const iconSize = 'h-[18px] w-[18px] sm:h-5 sm:w-5';
  const iconClass = `${iconBase} ${iconSize}`;

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
      {/* Wrapper força o mesmo alinhamento da bolha e da barra de ações */}
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
          <ChatMessage message={message} />

          {/* barra de ações com mesma largura da bolha */}
          <div
            className={[
              'mt-1 ml-2 flex items-center gap-1.5',
              'max-w-[min(720px,88vw)]',
              // recuo levemente maior nas mensagens da Eco
              isUser ? '' : 'pl-6'
            ].join(' ')}
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
              onClick={() => {}}
            >
              <ThumbsUp className={iconClass} />
            </button>

            <button
              className="group p-1.5 rounded-md hover:bg-gray-100 active:bg-gray-200"
              aria-label="Não curtir resposta"
              title="Não curtir"
              onClick={() => {}}
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
      </div>

      {audioUrl && (
        <AudioPlayerOverlay audioUrl={audioUrl} onClose={() => setAudioUrl(null)} />
      )}
    </>
  );
};

export default EcoMessageWithAudio;
