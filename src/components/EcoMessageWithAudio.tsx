import React, { useState } from "react";
import ChatMessage from "./ChatMessage";
import {
  ClipboardCopy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Loader2,
} from "lucide-react";
import AudioPlayerOverlay from "./AudioPlayerOverlay";
import { gerarAudioDaMensagem } from "../api/voiceApi";
import { Message } from "../contexts/ChatContext";

interface EcoMessageWithAudioProps {
  message: Message;
}

const EcoMessageWithAudio: React.FC<EcoMessageWithAudioProps> = ({
  message,
}) => {
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // sempre Data URL
  const [loadingAudio, setLoadingAudio] = useState(false);

  const isUser = message.sender === "user";
  const displayText = (message.text ?? message.content ?? "").trim();
  const canSpeak = !isUser && !!displayText; // só narra respostas da Eco

  // UI
  const BTN_SIZE = "w-7 h-7 sm:w-8 sm:h-8";
  const ICON_SIZE = "w-[14px] h-[14px] sm:w-4 sm:h-4";
  const ICON_BASE = "text-gray-500/80 group-hover:text-gray-800 transition-colors";
  const ICON_CLASS = `${ICON_SIZE} ${ICON_BASE}`;

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(displayText || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.warn("Falha ao copiar", e);
    }
  };

  // puxa TTS e abre o overlay (sempre Data URL, sem createObjectURL)
  const reproduzirAudio = async () => {
    if (!canSpeak || loadingAudio) return;
    setLoadingAudio(true);
    if (audioUrl) setAudioUrl(null); // fecha overlay anterior

    try {
      const dataUrl = await gerarAudioDaMensagem(displayText);
      setAudioUrl(dataUrl);
    } catch (err) {
      console.error("Erro ao gerar áudio:", err);
    } finally {
      setLoadingAudio(false);
    }
  };

  const GhostBtn: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
  > = ({ children, className = "", ...rest }) => (
    <button
      {...rest}
      className={[
        "group rounded-xl",
        BTN_SIZE,
        "flex items-center justify-center",
        "hover:bg-gray-100 active:bg-gray-200/80",
        "focus:outline-none focus:ring-2 focus:ring-gray-300/50",
        "transition-colors",
        className,
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );

  // padding/margem da barra acompanha a bolha:
  // - user (direita): padding à direita espelha o padding interno da bolha
  // - eco (esquerda): margem soma avatar (30px), gap (12px) e padding interno
  const actionsPad = isUser ? "pr-4 sm:pr-5" : "ml-[58px] sm:ml-[62px]";

  return (
    <>
      {/* wrapper respeita a coluna central do grid (min-w-0 evita esmagar a “pílula”) */}
      <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} min-w-0`}>
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full min-w-0 max-w-full`}>
          <ChatMessage message={message} />

          {/* barra de ações (alinhada à bolha) */}
          <div
            className={[
              "mt-1 flex items-center gap-1.5",
              "max-w-[min(720px,88vw)] min-w-0", // acompanha o mesmo limite da bolha
              actionsPad,
              isUser ? "self-end" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <GhostBtn onClick={copiarTexto} aria-label="Copiar mensagem" title="Copiar">
              <ClipboardCopy className={ICON_CLASS} strokeWidth={1.5} />
            </GhostBtn>

            <GhostBtn onClick={() => {}} aria-label="Curtir resposta" title="Curtir">
              <ThumbsUp className={ICON_CLASS} strokeWidth={1.5} />
            </GhostBtn>

            <GhostBtn onClick={() => {}} aria-label="Não curtir resposta" title="Não curtir">
              <ThumbsDown className={ICON_CLASS} strokeWidth={1.5} />
            </GhostBtn>

            {/* botão de áudio só nas mensagens da Eco com texto */}
            {canSpeak && (
              <GhostBtn
                onClick={reproduzirAudio}
                aria-label={loadingAudio ? "Gerando áudio..." : "Ouvir em áudio"}
                title="Ouvir"
                disabled={loadingAudio}
                className="disabled:opacity-50 disabled:pointer-events-none"
              >
                {loadingAudio ? (
                  <Loader2 className={`${ICON_CLASS} animate-spin`} strokeWidth={1.75} />
                ) : (
                  <Volume2 className={ICON_CLASS} strokeWidth={1.5} />
                )}
              </GhostBtn>
            )}

            <span
              className={`text-[10px] sm:text-xs text-gray-400 ml-1 transition-opacity ${
                copied ? "opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              Copiado!
            </span>
          </div>
        </div>
      </div>

      {audioUrl && <AudioPlayerOverlay audioUrl={audioUrl} onClose={() => setAudioUrl(null)} />}
    </>
  );
};

export default EcoMessageWithAudio;
