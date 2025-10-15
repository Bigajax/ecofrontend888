/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — scroll estável + sem bolinha fantasma + saudação alinhada  */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import LoginGateModal from '../components/LoginGateModal';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
import EcoMessageWithAudio from '../components/EcoMessageWithAudio';
import QuickSuggestions, { Suggestion, SuggestionPickMeta } from '../components/QuickSuggestions';
import TypingDots from '../components/TypingDots';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

import { useChatScroll } from '../hooks/useChatScroll';
import { useEcoStream } from '../hooks/useEcoStream';
import { useFeedbackPrompt } from '../hooks/useFeedbackPrompt';
import { useQuickSuggestionsVisibility } from '../hooks/useQuickSuggestionsVisibility';
import { ensureSessionId } from '../utils/chat/session';
import { saudacaoDoDiaFromHour } from '../utils/chat/greetings';
import { ROTATING_ITEMS, OPENING_VARIATIONS } from '../constants/chat';
import mixpanel from '../lib/mixpanel';
import { FeedbackPrompt } from '../components/FeedbackPrompt';
import { trackFeedbackEvent } from '../analytics/track';
import { getSessionId } from '../utils/identity';
import { useGuestGate } from '../hooks/useGuestGate';
import { useMessageFeedbackContext } from '../hooks/useMessageFeedbackContext';

const NETWORK_ERROR_MESSAGE =
  'Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.';
const CORS_ERROR_MESSAGE =
  'O servidor recusou a origem. Atualize e tente novamente.';

const ChatPage: React.FC = () => {
  const { messages, addMessage, setMessages } = useChat();
  const auth = useAuth();
  const { userId, userName = 'Usuário', user } = auth;
  const navigate = useNavigate();

  const [sessaoId] = useState(() => ensureSessionId());
  const isGuest = !user;
  const guestGate = useGuestGate(isGuest);
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [isComposerSending, setIsComposerSending] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<{ text: string; hint?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    mixpanel.track('Eco: Entrou no Chat', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
  }, [user, userId, userName]);

  // 👉 Abrir o modal imediatamente ao atingir o limite OU quando o input estiver bloqueado
  useEffect(() => {
    if (!isGuest) {
      setLoginGateOpen(false);
      return;
    }
    if (guestGate.reachedLimit || guestGate.inputDisabled) {
      // debug opcional para cravar diagnóstico
      // console.debug('[Gate] Abrindo modal', {
      //   count: guestGate.count, limit: guestGate.limit,
      //   reachedLimit: guestGate.reachedLimit, inputDisabled: guestGate.inputDisabled
      // });
      setLoginGateOpen(true);
    }
  }, [guestGate.reachedLimit, guestGate.inputDisabled, isGuest]);

  const saudacao = useMemo(() => saudacaoDoDiaFromHour(new Date().getHours()), []);

  const {
    scrollerRef,
    endRef,
    isAtBottom,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
  } = useChatScroll<HTMLDivElement>([messages]);

  const { showQuick, hideQuickSuggestions, handleTextChange } = useQuickSuggestionsVisibility(messages);

  const { showFeedback, lastEcoInfo, handleFeedbackSubmitted } = useFeedbackPrompt(messages);
  const lastPromptFeedbackContext = useMessageFeedbackContext(lastEcoInfo?.msg);

  const {
    handleSendMessage: streamSendMessage,
    digitando,
    erroApi,
    pending,
  } = useEcoStream({
    messages,
    addMessage,
    setMessages,
    userId: userId || undefined,
    userName,
    sessionId: sessaoId,
    scrollToBottom,
    isAtBottom,
    isGuest,
    guestId: guestGate.guestId || undefined,
    onUnauthorized: () => {
      setLoginGateOpen(true);
    },
  });

  // 👉 Guard: se já bateu o limite, abre modal e não envia
  const streamAndPersist = useCallback(
    async (text: string, systemHint?: string) => {
      if (pending) return;
      if (isGuest) {
        if (guestGate.inputDisabled || guestGate.count >= guestGate.limit) {
          setLoginGateOpen(true);
          return;
        }
        // registra a interação ANTES do envio para manter contagem consistente
        guestGate.registerUserInteraction();
      }
      await streamSendMessage(text, systemHint);
    },
    [guestGate, isGuest, pending, streamSendMessage],
  );

  const sendWithGuards = useCallback(
    async (text: string, systemHint?: string) => {
      const trimmed = (text ?? '').trim();
      if (!trimmed) return;
      if (isComposerSending || pending) return;
      console.count('HANDLE_SEND');
      setIsComposerSending(true);
      setLastAttempt({ text: trimmed, hint: systemHint });
      try {
        await streamAndPersist(trimmed, systemHint);
        setLastAttempt(null);
      } finally {
        setIsComposerSending(false);
      }
    },
    [isComposerSending, pending, streamAndPersist],
  );

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) hideQuickSuggestions();
  }, [messages, hideQuickSuggestions]);

  const handlePickSuggestion = async (s: Suggestion, meta?: SuggestionPickMeta) => {
    if (isComposerSending || pending) return;
    hideQuickSuggestions();
    mixpanel.track('Front-end: Quick Suggestion', {
      id: s.id,
      label: s.label,
      source: meta?.source,
      index: meta?.index,
      modules: s.modules,
    });
    const hint =
      (s.modules?.length || s.systemHint)
        ? `${s.modules?.length ? `Ative módulos: ${s.modules.join(', ')}.` : ''}${s.systemHint ? ` ${s.systemHint}` : ''}`.trim()
        : '';
    const userText = `${s.icon ? s.icon + ' ' : ''}${s.label}`;
    await sendWithGuards(userText, hint);
  };

  const handleRetry = useCallback(() => {
    if (!lastAttempt) return;
    void sendWithGuards(lastAttempt.text, lastAttempt.hint);
  }, [lastAttempt, sendWithGuards]);

  const lastMessage = messages[messages.length - 1];
  const lastEcoMessageContent =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content.trim()
      : typeof lastMessage?.text === 'string'
      ? lastMessage.text.trim()
      : '';
  const lastEcoMessageIsPlaceholder =
    !!lastMessage && lastMessage.sender === 'eco' && lastEcoMessageContent.length === 0;

  const shouldShowGlobalTyping = digitando && !lastEcoMessageIsPlaceholder;
  const composerPending = pending || isComposerSending;
  const canRetry = Boolean(
    lastAttempt &&
    erroApi &&
    (erroApi === NETWORK_ERROR_MESSAGE || erroApi === CORS_ERROR_MESSAGE)
  );

  return (
    <div className="relative flex h-[calc(100dvh-var(--eco-topbar-h,56px))] w-full flex-col overflow-hidden bg-white">
      {/* SCROLLER */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        role="feed"
        aria-busy={digitando}
        className="chat-scroller flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-6 [scrollbar-gutter:stable]"
        style={{
          paddingTop: 'calc(var(--eco-topbar-h,56px) + 12px)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          scrollPaddingTop: 'calc(var(--eco-topbar-h,56px) + 12px)',
          touchAction: 'pan-y',
        }}
      >
        <div className="w-full mx-auto max-w-3xl">
          {messages.length === 0 && !erroApi && (
            <div className="min-h-[calc(100svh-var(--eco-topbar-h,56px)-120px)] flex items-center justify-center">
              <motion.div
                className="px-4 w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                {/* Saudação centralizada */}
                <div className="flex flex-col items-center gap-3 text-center md:gap-4">
                  <h2 className="text-[32px] font-light leading-tight text-slate-800 md:text-[40px]">
                    {saudacao}, {userName}
                  </h2>
                  <p className="max-w-xl text-base font-light text-slate-500 md:text-lg">
                    {OPENING_VARIATIONS[Math.floor(Math.random() * OPENING_VARIATIONS.length)]}
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {erroApi && (
            <div className="glass rounded-xl text-red-600 text-center mb-4 px-4 py-2 flex flex-col items-center gap-2">
              <span>{erroApi}</span>
              {canRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={composerPending}
                  className="text-sm font-medium text-red-700 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed underline underline-offset-4"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          <div className="w-full space-y-3 md:space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="w-full">
                {m.sender === 'eco' ? (
                  <EcoMessageWithAudio message={m as any} />
                ) : (
                  <ChatMessage message={m} />
                )}
              </div>
            ))}

            {showFeedback && lastEcoInfo?.msg && (
              <FeedbackPrompt
                message={lastEcoInfo.msg}
                userId={auth?.user?.id ?? null}
                onSubmitted={() => {
                  const sessionId = getSessionId();
                  const payload: Record<string, unknown> = {
                    user_id: auth?.user?.id ?? undefined,
                    session_id: sessionId ?? undefined,
                    source: 'prompt_auto',
                    interaction_id: lastPromptFeedbackContext.interactionId,
                  };
                  if (lastPromptFeedbackContext.messageId) {
                    payload.message_id = lastPromptFeedbackContext.messageId;
                  }
                  if (
                    lastPromptFeedbackContext.moduleCombo &&
                    lastPromptFeedbackContext.moduleCombo.length > 0
                  ) {
                    payload.module_combo = lastPromptFeedbackContext.moduleCombo;
                  }
                  if (lastPromptFeedbackContext.promptHash) {
                    payload.prompt_hash = lastPromptFeedbackContext.promptHash;
                  }
                  if (typeof lastPromptFeedbackContext.latencyMs === 'number') {
                    payload.latency_ms = lastPromptFeedbackContext.latencyMs;
                  }
                  trackFeedbackEvent('FE: Feedback Prompt Closed', payload);
                  handleFeedbackSubmitted();
                }}
              />
            )}

            {shouldShowGlobalTyping && (
              <div className="w-full flex justify-start">
                <div className="max-w-3xl w-full min-w-0 flex items-start gap-3">
                  <div className="flex-shrink-0 translate-y-[2px]">
                    <EcoBubbleOneEye variant="message" state="thinking" size={30} />
                  </div>
                  <div className="min-w-0">
                    {/* TypingDots novo, com tom automático */}
                    <TypingDots variant="bubble" size="md" tone="auto" />
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} className="anchor-end h-px" />
          </div>
        </div>

        {showScrollBtn && (
          <div className="sticky bottom-24 z-30 flex justify-end pr-2 sm:pr-6">
            <button
              onClick={() => scrollToBottom(true)}
              className="h-9 w-9 rounded-full glass-soft hover:bg-white/24 flex items-center justify-center transition"
              aria-label="Descer para a última mensagem"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-40 bg-gradient-to-t from-white via-white/95 to-white/80 px-4 pb-3 pt-3 sm:px-6 lg:px-10">
        <div className="w-full mx-auto max-w-3xl">
          <QuickSuggestions
            visible={
              showQuick &&
              messages.length === 0 &&
              !digitando &&
              !composerPending &&
              !erroApi
            }
            onPickSuggestion={handlePickSuggestion}
            rotatingItems={ROTATING_ITEMS}
            rotationMs={5000}
            className="mt-1 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            disabled={composerPending}
          />
          <ChatInput
            onSendMessage={(t) => sendWithGuards(t)}
            onMoreOptionSelected={(opt) => {
              if (opt === 'go_to_voice_page') navigate('/voice');
            }}
            onSendAudio={() => console.log('Áudio enviado')}
            disabled={composerPending || (isGuest && guestGate.inputDisabled)}
            placeholder={
              isGuest && guestGate.inputDisabled
                ? 'Crie sua conta para continuar…'
                : undefined
            }
            onTextChange={handleTextChange}
            isSending={composerPending}
          />
          <LoginGateModal
            open={loginGateOpen}
            onClose={() => setLoginGateOpen(false)}
            onSignup={() => {
              if (guestGate.guestId) {
                mixpanel.track('signup_clicked', { guestId: guestGate.guestId });
              }
              setLoginGateOpen(false);
              window.location.href = '/login?returnTo=/chat';
            }}
            count={guestGate.count}
            limit={guestGate.limit}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
