/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — scroll estável + sem bolinha fantasma + saudação alinhada  */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

import ChatInput, { ChatInputHandle } from '../components/ChatInput';
import LoginGateModal from '../components/LoginGateModal';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
import EcoLoopHud from '../components/EcoLoopHud';
import QuickSuggestions, { Suggestion, SuggestionPickMeta } from '../components/QuickSuggestions';
import TypingDots from '../components/TypingDots';
import SuggestionChips from '../components/SuggestionChips';
import MessageList from '../components/MessageList';
import VoiceRecorderPanel from '../components/VoiceRecorderPanel';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';

import { useAutoScroll } from '../hooks/useAutoScroll';
import { useEcoStream } from '../hooks/useEcoStream';
import { useFeedbackPrompt } from '../hooks/useFeedbackPrompt';
import { useQuickSuggestionsVisibility } from '../hooks/useQuickSuggestionsVisibility';
import { useEcoActivity } from '../hooks/useEcoActivity';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { ensureSessionId } from '../utils/chat/session';
import { saudacaoDoDiaFromHour } from '../utils/chat/greetings';
import { isEcoMessage } from '../utils/chat/messages';
import { ROTATING_ITEMS, OPENING_VARIATIONS } from '../constants/chat';
import mixpanel from '../lib/mixpanel';
import { FeedbackPrompt } from '../components/FeedbackPrompt';
import { trackFeedbackEvent } from '../analytics/track';
import { getSessionId } from '../utils/identity';
import { useGuestGate } from '../hooks/useGuestGate';
import { useMessageFeedbackContext } from '../hooks/useMessageFeedbackContext';
import { useAdminCommands } from '../hooks/useAdminCommands';
import { sendPassiveSignal } from '../api/passiveSignals';
import formatName from '../utils/formatName';

const NETWORK_ERROR_MESSAGE =
  'Não consegui conectar ao servidor. Verifique sua internet ou tente novamente em instantes.';
const CORS_ERROR_MESSAGE =
  'O servidor recusou a origem. Atualize e tente novamente.';

const BEHAVIOR_BURST_WINDOW_MS = 1500;
const BEHAVIOR_BURST_DELTA = 6;
const BEHAVIOR_EDIT_DELTA = 6;
const FAST_FOLLOWUP_WINDOW_MS = 15_000;
const BEHAVIOR_HINT_FALLBACK_MS = 12_000;

type BehaviorHintMetrics = {
  typing_bursts: number;
  message_edits: number;
  fast_followup: number;
};

function ChatPage() {
  const { messages, upsertMessage, setMessages } = useChat();
  const auth = useAuth();
  const { userId, userName: rawUserName = 'Usuário', user } = auth;
  const prefersReducedMotion = useReducedMotion();

  const [sessaoId] = useState(() => ensureSessionId());
  useAdminCommands(user, sessaoId);
  const isGuest = !user;
  const guestGate = useGuestGate(isGuest);
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [isComposerSending, setIsComposerSending] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [lastAttempt, setLastAttempt] = useState<{ text: string; hint?: string } | null>(null);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const ecoActivity = useEcoActivity();

  const behaviorTrackerRef = useRef({
    lastLength: 0,
    lastChangeAt: 0,
    bursts: 0,
    edits: 0,
  });
  const pendingBehaviorHintRef = useRef<{
    metrics: BehaviorHintMetrics;
    timeoutId: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const lastMessageSentAtRef = useRef<number | null>(null);
  const lastBehaviorInteractionRef = useRef<string | null>(null);

  const flushBehaviorHint = useCallback(
    (interactionId?: string | null) => {
      const pending = pendingBehaviorHintRef.current;
      if (!pending) return;
      pendingBehaviorHintRef.current = null;
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }

      const meta = pending.metrics;
      if (
        meta.typing_bursts === 0 &&
        meta.message_edits === 0 &&
        meta.fast_followup === 0
      ) {
        lastBehaviorInteractionRef.current = interactionId ?? null;
        return;
      }

      void sendPassiveSignal({
        signal: 'behavior_hint',
        sessionId: sessaoId,
        interactionId: interactionId ?? undefined,
        meta,
      });
      lastBehaviorInteractionRef.current = interactionId ?? null;
    },
    [sessaoId],
  );

  const scheduleBehaviorHint = useCallback(
    (metrics: BehaviorHintMetrics) => {
      if (pendingBehaviorHintRef.current) {
        flushBehaviorHint(undefined);
      }

      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(() => {
              flushBehaviorHint(undefined);
            }, BEHAVIOR_HINT_FALLBACK_MS)
          : null;

      pendingBehaviorHintRef.current = { metrics, timeoutId };
      lastBehaviorInteractionRef.current = null;
    },
    [flushBehaviorHint],
  );

  const finalizeBehaviorMetrics = useCallback(() => {
    const tracker = behaviorTrackerRef.current;
    const now = Date.now();
    const fastFollowup =
      lastMessageSentAtRef.current &&
      now - lastMessageSentAtRef.current <= FAST_FOLLOWUP_WINDOW_MS
        ? 1
        : 0;

    const metrics: BehaviorHintMetrics = {
      typing_bursts: tracker.bursts,
      message_edits: tracker.edits,
      fast_followup: fastFollowup,
    };

    behaviorTrackerRef.current = {
      lastLength: 0,
      lastChangeAt: now,
      bursts: 0,
      edits: 0,
    };
    lastMessageSentAtRef.current = now;

    if (
      metrics.typing_bursts === 0 &&
      metrics.message_edits === 0 &&
      metrics.fast_followup === 0
    ) {
      return;
    }

    scheduleBehaviorHint(metrics);
  }, [scheduleBehaviorHint]);

  const displayName = useMemo(() => formatName(rawUserName), [rawUserName]);

  useEffect(() => {
    if (!user) return;
    mixpanel.track('Eco: Entrou no Chat', {
      userId,
      userName: rawUserName,
      timestamp: new Date().toISOString(),
    });
  }, [rawUserName, user, userId]);

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

  const chatRef = useRef<HTMLDivElement | null>(null);
  const { scrollerRef, endRef, isAtBottom, showScrollBtn, scrollToBottom } = useAutoScroll<HTMLDivElement>({
    items: [messages],
    externalRef: chatRef,
    bottomThreshold: 120,
  });

  const chatInputWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const { contentInset, isKeyboardOpen, safeAreaBottom, inputHeight, keyboardHeight } = useKeyboardInsets({
    inputRef: chatInputWrapperRef,
  });

  const computedInputHeight = inputHeight || 96;
  const safeAreaOffset = safeAreaBottom ?? 0;
  const insetCompensation = Math.max(contentInset, keyboardHeight);
  const paddingBaseline = Math.max(
    computedInputHeight + 24,
    insetCompensation + 24,
  );
  const mainPaddingBottom = `calc(${paddingBaseline}px + env(safe-area-inset-bottom, 0px))`; // padding inferior soma altura do input + safe-area
  const scrollPaddingBottomValue = paddingBaseline + safeAreaOffset;
  const voicePanelBottomOffset = Math.max(120, keyboardHeight + computedInputHeight + 24);

  const { showQuick, hideQuickSuggestions, handleTextChange } =
    useQuickSuggestionsVisibility(messages);

  const trackComposerChange = useCallback(
    (text: string) => {
      const now = Date.now();
      const length = typeof text === 'string' ? text.length : 0;
      const tracker = behaviorTrackerRef.current;
      const delta = length - tracker.lastLength;

      if (delta > 0) {
        if (
          delta >= BEHAVIOR_BURST_DELTA &&
          now - tracker.lastChangeAt <= BEHAVIOR_BURST_WINDOW_MS
        ) {
          tracker.bursts = Math.min(tracker.bursts + 1, 10);
        }
      } else if (delta < 0) {
        if (Math.abs(delta) >= BEHAVIOR_EDIT_DELTA) {
          tracker.edits = Math.min(tracker.edits + 1, 10);
        }
      }

      tracker.lastChangeAt = now;
      tracker.lastLength = length;
      handleTextChange(text);
    },
    [handleTextChange],
  );

  const handleComposerTextChange = useCallback(
    (text: string) => {
      setComposerValue(text);
      trackComposerChange(text);
    },
    [trackComposerChange],
  );

  const { showFeedback, lastEcoInfo, handleFeedbackSubmitted } = useFeedbackPrompt(messages);
  const lastPromptFeedbackContext = useMessageFeedbackContext(lastEcoInfo?.msg);

  useEffect(() => {
    const interactionId = lastPromptFeedbackContext?.interactionId;
    if (!interactionId) return;
    if (
      pendingBehaviorHintRef.current &&
      lastBehaviorInteractionRef.current !== interactionId
    ) {
      flushBehaviorHint(interactionId);
    }
  }, [flushBehaviorHint, lastPromptFeedbackContext?.interactionId]);

  useEffect(() => {
    return () => {
      if (pendingBehaviorHintRef.current?.timeoutId) {
        clearTimeout(pendingBehaviorHintRef.current.timeoutId);
      }
      pendingBehaviorHintRef.current = null;
    };
  }, []);

  const { handleSendMessage: streamSendMessage, erroApi, pending } = useEcoStream({
    messages,
    upsertMessage,
    setMessages,
    userId: userId || undefined,
    userName: rawUserName,
    sessionId: sessaoId,
    scrollToBottom,
    isAtBottom,
    isGuest,
    guestId: guestGate.guestId || undefined,
    onUnauthorized: () => {
      setLoginGateOpen(true);
    },
    activity: ecoActivity,
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
        finalizeBehaviorMetrics();
        setLastAttempt(null);
      } finally {
        setIsComposerSending(false);
      }
    },
    [finalizeBehaviorMetrics, isComposerSending, pending, streamAndPersist],
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

  const handleOpenVoicePanel = useCallback(() => {
    if (voicePanelOpen) return;
    setVoicePanelOpen(true);
  }, [voicePanelOpen]);

  const handleVoicePanelClose = useCallback(() => {
    setVoicePanelOpen(false);
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }, []);

  const handleVoiceConfirm = useCallback(
    (payload: { audioBlob: Blob | null; transcript: string }) => {
      const nextText = (payload.transcript ?? '').trim();
      if (nextText !== composerValue) {
        handleComposerTextChange(nextText);
      }
      handleVoicePanelClose();
    },
    [composerValue, handleComposerTextChange, handleVoicePanelClose],
  );

  const lastMessage = messages[messages.length - 1];
  const lastEcoMessageContent =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content.trim()
      : typeof lastMessage?.text === 'string'
      ? lastMessage.text.trim()
      : '';
  const lastEcoMessageIsPlaceholder =
    !!lastMessage && isEcoMessage(lastMessage) && lastEcoMessageContent.length === 0;

  const activityState = ecoActivity.activity;
  const isWaitingForEco =
    activityState.state === 'sending' ||
    activityState.state === 'waiting_llm' ||
    activityState.state === 'streaming';
  const isSynthesizingAudio = activityState.state === 'synthesizing_audio';
  const isSendingToEco = activityState.state === 'sending';

  const shouldShowGlobalTyping = isWaitingForEco && !lastEcoMessageIsPlaceholder;
  const [globalTypingVisible, setGlobalTypingVisible] = useState(false);
  const [globalTypingState, setGlobalTypingState] = useState<
    'hidden' | 'enter' | 'visible' | 'exit'
  >('hidden');
  const globalTypingShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const globalTypingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const globalTypingRemoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const globalTypingMinVisibleRef = useRef<number>(0);

  useEffect(() => {
    const SHOW_DELAY = 150;
    const MIN_VISIBLE = 500;
    const EXIT_DURATION = 160;

    if (shouldShowGlobalTyping) {
      if (globalTypingHideTimeoutRef.current) {
        clearTimeout(globalTypingHideTimeoutRef.current);
        globalTypingHideTimeoutRef.current = null;
      }
      if (globalTypingRemoveTimeoutRef.current) {
        clearTimeout(globalTypingRemoveTimeoutRef.current);
        globalTypingRemoveTimeoutRef.current = null;
      }

      if (globalTypingVisible) {
        globalTypingMinVisibleRef.current = Math.max(
          globalTypingMinVisibleRef.current,
          Date.now() + MIN_VISIBLE,
        );
        if (globalTypingState !== 'visible') {
          setGlobalTypingState('visible');
        }
        return;
      }

      if (globalTypingShowTimeoutRef.current) {
        return;
      }

      globalTypingShowTimeoutRef.current = window.setTimeout(() => {
        globalTypingShowTimeoutRef.current = null;
        globalTypingMinVisibleRef.current = Date.now() + MIN_VISIBLE;
        setGlobalTypingVisible(true);
        setGlobalTypingState('enter');
        if (
          typeof window !== 'undefined' &&
          typeof window.requestAnimationFrame === 'function'
        ) {
          window.requestAnimationFrame(() => {
            setGlobalTypingState('visible');
          });
        } else {
          setGlobalTypingState('visible');
        }
      }, SHOW_DELAY);
      return;
    }

    if (globalTypingShowTimeoutRef.current) {
      clearTimeout(globalTypingShowTimeoutRef.current);
      globalTypingShowTimeoutRef.current = null;
    }

    if (!globalTypingVisible || globalTypingHideTimeoutRef.current) {
      return;
    }

    const remaining = globalTypingMinVisibleRef.current - Date.now();
    const delay = remaining > 0 ? remaining : 0;

    globalTypingHideTimeoutRef.current = window.setTimeout(() => {
      globalTypingHideTimeoutRef.current = null;
      setGlobalTypingState('exit');
      globalTypingRemoveTimeoutRef.current = window.setTimeout(() => {
        globalTypingRemoveTimeoutRef.current = null;
        setGlobalTypingVisible(false);
        setGlobalTypingState('hidden');
      }, EXIT_DURATION);
    }, delay);
  }, [shouldShowGlobalTyping, globalTypingVisible, globalTypingState]);

  useEffect(() => {
    return () => {
      if (globalTypingShowTimeoutRef.current) {
        clearTimeout(globalTypingShowTimeoutRef.current);
      }
      if (globalTypingHideTimeoutRef.current) {
        clearTimeout(globalTypingHideTimeoutRef.current);
      }
      if (globalTypingRemoveTimeoutRef.current) {
        clearTimeout(globalTypingRemoveTimeoutRef.current);
      }
    };
  }, []);

  const shouldRenderGlobalTyping = globalTypingVisible || isSynthesizingAudio;
  const composerPending = pending || isComposerSending || isSendingToEco;
  const [hasPendingMessages, setHasPendingMessages] = useState(false);
  const lastMessageTokenRef = useRef<string>('');
  const handleJumpToBottom = useCallback(() => {
    setHasPendingMessages(false);
    scrollToBottom(true);
  }, [scrollToBottom]);
  const showNewMessagesChip = hasPendingMessages && showScrollBtn;
  const isEmptyState = messages.length === 0 && !erroApi;
  const hasComposerText = composerValue.trim().length > 0;
  const showInitialSuggestions =
    isEmptyState && showQuick && !isWaitingForEco && !composerPending && !erroApi;
  const shouldShowSuggestionChips =
    showQuick &&
    !isEmptyState &&
    !hasComposerText &&
    isAtBottom &&
    !isWaitingForEco &&
    !composerPending &&
    !erroApi &&
    !voicePanelOpen;
  const canRetry = Boolean(
    lastAttempt &&
    erroApi &&
    (erroApi === NETWORK_ERROR_MESSAGE || erroApi === CORS_ERROR_MESSAGE)
  );

  useEffect(() => {
    const last = messages[messages.length - 1];
    const signature = last
      ? `${last.id}|${last.sender}|${(last.content ?? last.text ?? '').length}|${last.streaming ? '1' : '0'}`
      : 'empty';
    if (isAtBottom) {
      setHasPendingMessages(false);
    } else if (lastMessageTokenRef.current && signature !== lastMessageTokenRef.current) {
      setHasPendingMessages(true);
    }
    lastMessageTokenRef.current = signature;
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!isAtBottom) return;
    scrollToBottom(false);
  }, [scrollPaddingBottomValue, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldRenderGlobalTyping || !isAtBottom) return;
    scrollToBottom(false);
  }, [shouldRenderGlobalTyping, isAtBottom, scrollToBottom]);

  const feedbackPromptNode =
    showFeedback && lastEcoInfo?.msg ? (
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
    ) : null;

  const typingIndicatorNode = shouldRenderGlobalTyping ? (
    <div className="w-full flex justify-start" aria-live="polite">
      <div className="max-w-[800px] w-full min-w-0 flex items-center gap-2">
        <div className="flex-shrink-0 translate-y-[1px]">
          <EcoBubbleOneEye variant="message" state="thinking" size={30} />
        </div>
        <div className="min-w-0 text-sm text-slate-500">
          {isSynthesizingAudio ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>🎧</span>
              <span>preparando áudio…</span>
              <span className="sr-only">Eco está preparando áudio</span>
            </span>
          ) : (
            <div
              className="opacity-0 translate-y-1 transition-opacity transition-transform duration-[160ms] ease-out data-[state=enter]:opacity-100 data-[state=visible]:opacity-100 data-[state=enter]:translate-y-0 data-[state=visible]:translate-y-0 data-[state=exit]:opacity-0 data-[state=exit]:translate-y-1"
              data-state={
                globalTypingState === 'hidden' ? undefined : globalTypingState
              }
            >
              <TypingDots variant="bubble" size="md" tone="auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      className={clsx(
        'chat-page-grid relative w-full bg-[color:var(--color-bg-base)] text-[color:var(--color-text-primary)]',
        { 'keyboard-open': isKeyboardOpen },
      )}
      style={{
        minHeight: '100dvh', // 100dvh garante viewport real em iOS/Android
      }}
    >
      <div
        ref={scrollerRef}
        className="chat-page__main px-4 sm:px-5 md:px-6"
        style={{
          paddingTop: 'clamp(28px, 8vh, 64px)',
          paddingBottom: mainPaddingBottom, // padding inferior inclui altura do input + safe-area
          scrollPaddingTop: 'calc(var(--eco-topbar-h, 72px) + 12px)',
          scrollPaddingBottom: `${scrollPaddingBottomValue}px`, // mantém ancoragens visíveis ao focar
        }}
      >
        <div className="chat-page__content mx-auto w-full max-w-[600px] sm:max-w-[720px] xl:max-w-[960px]">
          {(isEmptyState || showInitialSuggestions) && (
            <section className="chat-home-block" aria-label="Sugestões iniciais">
              {isEmptyState && (
                <motion.div
                  className="chat-home-block__hero"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="flex flex-col items-center">
                    <h1 className="chat-home-block__hero-title text-balance font-semibold tracking-tight text-[color:var(--bubble-eco-text)]">
                      {saudacao}, {displayName || rawUserName}
                    </h1>
                    <p className="chat-home-block__hero-subtitle max-w-[52ch] text-balance">
                      {OPENING_VARIATIONS[Math.floor(Math.random() * OPENING_VARIATIONS.length)]}
                    </p>
                  </div>
                </motion.div>
              )}

              {showInitialSuggestions && (
                <div className="chat-home-block__chips">
                  <p className="text-sm font-medium text-slate-600" style={{ marginBottom: 'var(--rythm-sm)' }}>
                    Pronto para começar?
                  </p>
                  <QuickSuggestions
                    visible={showInitialSuggestions}
                    onPickSuggestion={handlePickSuggestion}
                    rotatingItems={ROTATING_ITEMS}
                    rotationMs={5000}
                    className="w-full"
                    disabled={composerPending}
                  />
                </div>
              )}
            </section>
          )}

          <div
            role="feed"
            aria-busy={isWaitingForEco || isSendingToEco}
            className="flex flex-col gap-6"
          >
            {erroApi && (
              <div className="glass rounded-xl text-red-600 text-center px-4 py-3">
                <div className="flex flex-col items-center gap-2">
                  <span>{erroApi}</span>
                  {canRetry && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={composerPending}
                      className="text-sm font-medium text-red-700 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 underline underline-offset-4"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              </div>
            )}

            <MessageList
              messages={messages}
              prefersReducedMotion={prefersReducedMotion}
              ecoActivityTTS={ecoActivity.onTTS}
              feedbackPrompt={feedbackPromptNode}
              typingIndicator={typingIndicatorNode}
              endRef={endRef}
            />

          </div>
        </div>

        {showNewMessagesChip && (
          <div
            className="sticky bottom-24 z-30 flex justify-center px-2 sm:px-6"
            style={{ bottom: safeAreaBottom + computedInputHeight + 24 }}
          >
            <button
              type="button"
              onClick={handleJumpToBottom}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300/60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Novas mensagens
            </button>
          </div>
        )}
      </div>

      {/* Sticky composer mantém o ChatInput visível na base */}
      <div
        ref={chatInputWrapperRef}
        className="chat-page__composer z-40 px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5 md:px-6"
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', // padding inferior respeita a safe-area
        }}
      >
        <div className="mx-auto w-full max-w-[600px] sm:max-w-[720px] xl:max-w-[960px] space-y-3">
          <SuggestionChips
            visible={shouldShowSuggestionChips}
            onPick={(suggestion, index) =>
              handlePickSuggestion(suggestion, { source: 'pill', index })
            }
            disabled={composerPending}
            className="mb-1"
          />
          <ChatInput
            ref={chatInputRef}
            value={composerValue}
            onSendMessage={(t) => sendWithGuards(t)}
            disabled={composerPending || (isGuest && guestGate.inputDisabled)}
            placeholder={
              isGuest && guestGate.inputDisabled
                ? 'Crie sua conta para continuar…'
                : undefined
            }
            onTextChange={handleComposerTextChange}
            isSending={composerPending}
            onMicPress={handleOpenVoicePanel}
            isMicActive={voicePanelOpen}
          />
          <LoginGateModal
            open={loginGateOpen}
            onClose={() => setLoginGateOpen(false)}
            onSignup={() => {
              if (guestGate.guestId) {
                mixpanel.track('signup_clicked', { guestId: guestGate.guestId });
              }
              setLoginGateOpen(false);
              window.location.href = '/?returnTo=/app';
            }}
            count={guestGate.count}
            limit={guestGate.limit}
          />
        </div>
      </div>

      <VoiceRecorderPanel
        open={voicePanelOpen}
        bottomOffset={voicePanelBottomOffset}
        onCancel={handleVoicePanelClose}
        onConfirm={handleVoiceConfirm}
        onError={(error) => console.error('Painel de voz', error)}
      />

      <EcoLoopHud />
    </div>
  );
};

export default ChatPage;

