/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — Modern minimalist layout (Claude/Ecotopia inspired)       */
/* -------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import ChatInput, { ChatInputHandle } from '../components/ChatInput';
import LoginGateModal from '../components/LoginGateModal';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
import TypingDots from '../components/TypingDots';
import SuggestionChips from '../components/SuggestionChips';
import MessageList from '../components/MessageList';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';

// 🚀 PERFORMANCE: Lazy load heavy components (Quick Win #4)
const EcoLoopHud = lazy(() => import('../components/EcoLoopHud'));
const QuickSuggestions = lazy(() => import('../components/QuickSuggestions').then(m => ({ default: m.default })));
const VoiceRecorderPanel = lazy(() => import('../components/VoiceRecorderPanel'));

// Import types separately (não afeta bundle)
import type { Suggestion, SuggestionPickMeta } from '../components/QuickSuggestions';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useGuestExperience } from '../contexts/GuestExperienceContext';

import { useAutoScroll } from '../hooks/useAutoScroll';
import { useEcoStream } from '../hooks/useEcoStream';
import { useFeedbackPrompt } from '../hooks/useFeedbackPrompt';
import { useQuickSuggestionsVisibility } from '../hooks/useQuickSuggestionsVisibility';
import { useEcoActivity } from '../hooks/useEcoActivity';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useFreeTierLimits } from '../hooks/useFreeTierLimits';
import { useIsPremium } from '../hooks/usePremiumContent';
import { ensureSessionId } from '../utils/chat/session';
import { saudacaoDoDiaFromHour } from '../utils/chat/greetings';
import { isEcoMessage, resolveMessageSender } from '../utils/chat/messages';
import { ROTATING_ITEMS, OPENING_VARIATIONS } from '../constants/chat';
import mixpanel from '../lib/mixpanel';

// 🚀 PERFORMANCE: Lazy load FeedbackPrompt
const FeedbackPrompt = lazy(() => import('../components/FeedbackPrompt').then(m => ({ default: m.FeedbackPrompt })));
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

const devLog = (label: string, payload?: Record<string, unknown>) => {
  if (!import.meta.env?.DEV) return;
  try {
    console.info(label, payload ?? {});
  } catch {
    /* noop */
  }
};

const pickHeroSubtitle = () =>
  OPENING_VARIATIONS[
    Math.floor(Math.random() * Math.max(OPENING_VARIATIONS.length, 1))
  ] ?? '';

const calculateFollowup = (lastSentAt: number | null, now: number): number => {
  if (!lastSentAt) return 0;
  return now - lastSentAt <= FAST_FOLLOWUP_WINDOW_MS ? 1 : 0;
};

type BehaviorHintMetrics = {
  typing_bursts: number;
  message_edits: number;
  fast_followup: number;
};

function ChatPage() {
  const { messages, upsertMessage, setMessages, clearMessages } = useChat();
  const auth = useAuth();
  const { userId, userName: rawUserName = 'Usuário', user, isGuestMode, guestId, isVipUser } = auth;
  const { trackInteraction } = useGuestExperience();
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();

  const [sessaoId] = useState(() => ensureSessionId());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAdminCommands(user, sessaoId);
  // Use explicit guest mode flag instead of implicit !user check
  // VIP users bypass all guest gates
  const isGuest = isGuestMode && !user && !isVipUser;
  const guestGate = useGuestGate(!user, isGuestMode);
  const isPremium = useIsPremium();
  const freeLimits = useFreeTierLimits(); // Free tier message limits
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [loginGateContext, setLoginGateContext] = useState<'chat_soft_prompt' | 'chat_hard_limit' | 'chat_daily_limit' | 'chat_soft_limit'>('chat_hard_limit');
  const [hasShownSoftPrompt, setHasShownSoftPrompt] = useState(false); // Track se já mostrou soft prompt
  const [isComposerSending, setIsComposerSending] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [lastAttempt, setLastAttempt] = useState<{ text: string; hint?: string } | null>(null);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [ecoTypingStartedAt, setEcoTypingStartedAt] = useState<number | null>(null);
  const [ecoTypingElapsed, setEcoTypingElapsed] = useState(0);
  const sendingRef = useRef(false); // FIX: guard síncrono para bloquear envios concorrentes
  const ecoActivity = useEcoActivity();
  const haptic = useHapticFeedback({ enabled: true });

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
      if (pending.timeoutId) clearTimeout(pending.timeoutId);

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
    (metrics: BehaviorHintMetrics & { fastFollowup?: number }) => {
      if (pendingBehaviorHintRef.current) flushBehaviorHint(undefined);

      const now = Date.now();
      const fast_followup =
        typeof metrics.fast_followup === 'number'
          ? metrics.fast_followup
          : typeof metrics.fastFollowup === 'number'
          ? metrics.fastFollowup
          : calculateFollowup(lastMessageSentAtRef.current, now);

      const normalizedMetrics: BehaviorHintMetrics = {
        typing_bursts: typeof metrics.typing_bursts === 'number' ? metrics.typing_bursts : 0,
        message_edits: typeof metrics.message_edits === 'number' ? metrics.message_edits : 0,
        fast_followup,
      };

      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(() => flushBehaviorHint(undefined), BEHAVIOR_HINT_FALLBACK_MS)
          : null;

      pendingBehaviorHintRef.current = { metrics: normalizedMetrics, timeoutId };
      lastBehaviorInteractionRef.current = null;
    },
    [flushBehaviorHint],
  );

  const finalizeBehaviorMetrics = useCallback(() => {
    const tracker = behaviorTrackerRef.current;
    const now = Date.now();
    const fast_followup = calculateFollowup(lastMessageSentAtRef.current, now);

    const metrics: BehaviorHintMetrics = {
      typing_bursts: tracker.bursts,
      message_edits: tracker.edits,
      fast_followup,
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
    ) return;

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

  useEffect(() => {
    // VIP users bypass all guest gates
    if (isVipUser) {
      setLoginGateOpen(false);
      return;
    }

    if (!isGuest) {
      setLoginGateOpen(false);
      return;
    }

    // Hard limit - mostrar modal bloqueante
    if (guestGate.reachedLimit || guestGate.inputDisabled) {
      setLoginGateContext('chat_hard_limit');
      setLoginGateOpen(true);
    }
    // Soft prompt - mostrar modal dismissível
    else if (guestGate.shouldShowSoftPrompt && !loginGateOpen) {
      setLoginGateContext('chat_soft_prompt');
      setLoginGateOpen(true);
    }
  }, [guestGate.reachedLimit, guestGate.inputDisabled, guestGate.shouldShowSoftPrompt, isGuest, isVipUser, loginGateOpen]);

  const saudacao = useMemo(() => saudacaoDoDiaFromHour(new Date().getHours()), []);
  const [heroSubtitle, setHeroSubtitle] = useState<string>(() => pickHeroSubtitle());

  const chatRef = useRef<HTMLElement | null>(null);
  const { scrollerRef, endRef, isAtBottom, showScrollBtn, scrollToBottom } =
    useAutoScroll<HTMLElement>({
      items: [messages],
      externalRef: chatRef,
      bottomThreshold: 120,
      detectKeyboard: false,  // Desabilitado para evitar loop com textarea resize
    });

  const chatInputWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<ChatInputHandle | null>(null);
  const { contentInset, isKeyboardOpen, safeAreaBottom, inputHeight, keyboardHeight } =
    useKeyboardInsets({ inputRef: chatInputWrapperRef });

  const baseScrollPadding = 112;
  const scrollInset = Math.max(baseScrollPadding, contentInset + safeAreaBottom + 24);
  const computedInputHeight = inputHeight || 96;
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
        if (delta >= BEHAVIOR_BURST_DELTA && now - tracker.lastChangeAt <= BEHAVIOR_BURST_WINDOW_MS) {
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
    if (pendingBehaviorHintRef.current && lastBehaviorInteractionRef.current !== interactionId) {
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

  const {
    handleSendMessage: streamSendMessage,
    erroApi,
    pending,
    streaming,
    digitando: isEcoStreamTyping,
  } = useEcoStream({
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
    onUnauthorized: () => setLoginGateOpen(true),
    activity: ecoActivity,
  });

  // Auto-send message from modal suggestion
  const autoSentRef = useRef(false);
  useEffect(() => {
    const autoSendMessage = location.state?.autoSendMessage;
    if (autoSendMessage && !autoSentRef.current && !pending && !streaming) {
      autoSentRef.current = true;
      // Wait for component to be ready
      setTimeout(() => {
        streamSendMessage(autoSendMessage);
      }, 300);
    }
  }, [location.state, streamSendMessage, pending, streaming]);

  const streamAndPersist = useCallback(
    async (text: string, systemHint?: string) => {
      if (pending || streaming) {
        // InFlight guard: bloquear envios duplicados enquanto stream ativo
        console.warn('[EcoStream] skipped duplicate', {
          reason: pending ? 'pending' : 'streaming_active',
          textPreview: text.slice(0, 60),
        });
        devLog('[ChatPage] stream_guard_blocked', {
          reason: pending ? 'pending' : 'streaming',
          preview: text.slice(0, 60),
        });
        return;
      }
      if (isGuest) {
        if (guestGate.inputDisabled || guestGate.count >= guestGate.limit) {
          setLoginGateContext('chat_hard_limit');
          setLoginGateOpen(true);
          return;
        }
        guestGate.registerUserInteraction();
      }
      await streamSendMessage(text, systemHint);
    },
    [guestGate, isGuest, pending, streamSendMessage, streaming],
  );

  const sendWithGuards = useCallback(
    async (text: string, systemHint?: string) => {
      const trimmed = (text ?? '').trim();
      if (!trimmed) return;
      if (sendingRef.current) {
        console.warn('[ChatPage] Bloqueio síncrono - já enviando'); // FIX: evita duplicar envio no mesmo tick
        return;
      }
      const blockReason = (() => {
        if (isComposerSending) return 'composer';
        if (pending) return 'pending';
        if (streaming) return 'streaming';
        return null;
      })();
      if (blockReason) {
        // InFlight guard: bloquear envios duplicados no sendWithGuards
        console.warn('[EcoStream] skipped duplicate', {
          reason: blockReason,
          textPreview: trimmed.slice(0, 60),
        });
        devLog('[ChatPage] send_blocked', {
          reason: blockReason,
          preview: trimmed.slice(0, 60),
        });
        return;
      }

      // FREE TIER LIMITS: Check message limits for free users
      if (user && !isPremium && !isGuest) {
        // Hard limit: Block se atingiu 30 mensagens
        if (freeLimits.reachedLimit) {
          setLoginGateContext('chat_daily_limit');
          setLoginGateOpen(true);
          mixpanel.track('Free Tier Limit Blocked', {
            limit_type: 'daily_messages',
            count: freeLimits.count,
            limit: freeLimits.limit,
            user_id: user.id,
          });
          return;
        }

        // Soft prompt: Aviso em 25 mensagens (dismissível)
        if (freeLimits.shouldShowSoftPrompt && !hasShownSoftPrompt) {
          setLoginGateContext('chat_soft_limit');
          setLoginGateOpen(true);
          setHasShownSoftPrompt(true);
          mixpanel.track('Free Tier Soft Prompt Shown', {
            count: freeLimits.count,
            remaining: freeLimits.remaining,
            user_id: user.id,
          });
          // Não bloqueia - permite continuar após fechar modal
        }
      }

      sendingRef.current = true; // FIX: trava imediatamente o novo envio
      try {
        devLog('[ChatPage] send_start', {
          preview: trimmed.slice(0, 60),
          hasHint: Boolean(systemHint?.trim()),
        });
        setIsComposerSending(true);
        setLastAttempt({ text: trimmed, hint: systemHint });
        haptic.medium(); // Feedback ao enviar

        // Força scroll antes de enviar (mostra mensagem do usuário)
        scrollToBottom(true);

        try {
          await streamAndPersist(trimmed, systemHint);
          haptic.success(); // Feedback de sucesso

          // FREE TIER: Incrementar contador de mensagens
          if (user && !isPremium && !isGuest) {
            freeLimits.incrementCount();
          }

          // Rastrear interação para guests
          if (!user) {
            trackInteraction('chat_message_sent', {
              message_length: trimmed.length,
              has_hint: Boolean(systemHint?.trim()),
              page: '/app/chat',
            });

            // Disparar evento customizado para GuestExperienceTracker
            window.dispatchEvent(new CustomEvent('eco:chat:message-sent', {
              detail: {
                message_length: trimmed.length,
                has_hint: Boolean(systemHint?.trim()),
              },
            }));
          }

          finalizeBehaviorMetrics();
          setLastAttempt(null);

          // Força scroll após enviar (garante que mostra resposta da ECO)
          setTimeout(() => scrollToBottom(false), 100);
        } finally {
          setIsComposerSending(false);
          devLog('[ChatPage] send_complete', {
            preview: trimmed.slice(0, 60),
          });
        }
      } finally {
        sendingRef.current = false; // FIX: libera o bloqueio após término do envio
      }
    },
    [
      finalizeBehaviorMetrics,
      isComposerSending,
      pending,
      streamAndPersist,
      streaming,
      scrollToBottom,
      user,
      isPremium,
      isGuest,
      freeLimits,
      hasShownSoftPrompt,
      haptic,
      trackInteraction,
    ],
  );

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) hideQuickSuggestions();
  }, [messages, hideQuickSuggestions]);

  const handlePickSuggestion = async (s: Suggestion, meta?: SuggestionPickMeta) => {
    if (isComposerSending || pending || streaming) {
      devLog('[ChatPage] suggestion_blocked', {
        reason: isComposerSending ? 'composer' : pending ? 'pending' : 'streaming',
        suggestionId: s.id,
      });
      return;
    }
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
    devLog('[ChatPage] retry_triggered', {
      hasAttempt: Boolean(lastAttempt),
    });
    void sendWithGuards(lastAttempt.text, lastAttempt.hint);
  }, [lastAttempt, sendWithGuards]);

  // Retry a specific message with watchdog timeout error
  const handleRetryMessage = useCallback((errorMessageId: string) => {
    // Find the assistant message with this error
    const errorMsgIndex = messages.findIndex((m) => m.id === errorMessageId);
    if (errorMsgIndex === -1) return;

    // Find the user message that preceded this error (search backwards)
    let userMsgIndex = -1;
    for (let i = errorMsgIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      const sender = resolveMessageSender(msg) ?? msg.sender;
      if (sender === 'user') {
        userMsgIndex = i;
        break;
      }
    }

    if (userMsgIndex === -1) return;

    const userMessage = messages[userMsgIndex];
    const userText = (() => {
      if (typeof userMessage.content === 'string') {
        const trimmed = userMessage.content.trim();
        if (trimmed) return trimmed;
      }
      if (typeof userMessage.text === 'string') {
        const trimmed = userMessage.text.trim();
        if (trimmed) return trimmed;
      }
      return null;
    })();

    if (!userText) return;

    devLog('[ChatPage] retry_message_triggered', {
      errorMessageId,
      userMessageId: userMessage.id,
      textPreview: userText.slice(0, 60),
    });

    void sendWithGuards(userText);
  }, [messages, sendWithGuards]);

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

  const hasEcoStreamingMessage = messages.some(
    (msg) => isEcoMessage(msg) && (msg.streaming === true || msg.status === 'streaming'),
  );
  const shouldShowGlobalTyping =
    hasEcoStreamingMessage || isEcoStreamTyping === true;
  const [globalTypingVisible, setGlobalTypingVisible] = useState(false);
  const [globalTypingState, setGlobalTypingState] = useState<'hidden' | 'enter' | 'visible' | 'exit'>('hidden');
  const globalTypingShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalTypingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalTypingRemoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        if (globalTypingState !== 'visible') setGlobalTypingState('visible');
        return;
      }

      if (globalTypingShowTimeoutRef.current) return;

      globalTypingShowTimeoutRef.current = window.setTimeout(() => {
        globalTypingShowTimeoutRef.current = null;
        globalTypingMinVisibleRef.current = Date.now() + MIN_VISIBLE;
        setGlobalTypingVisible(true);
        setGlobalTypingState('enter');
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => setGlobalTypingState('visible'));
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

    if (!globalTypingVisible || globalTypingHideTimeoutRef.current) return;

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
      if (globalTypingShowTimeoutRef.current) clearTimeout(globalTypingShowTimeoutRef.current);
      if (globalTypingHideTimeoutRef.current) clearTimeout(globalTypingHideTimeoutRef.current);
      if (globalTypingRemoveTimeoutRef.current) clearTimeout(globalTypingRemoveTimeoutRef.current);
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
  const heroSubtitleResetRef = useRef(isEmptyState);
  useEffect(() => {
    if (isEmptyState && !heroSubtitleResetRef.current) setHeroSubtitle(pickHeroSubtitle());
    heroSubtitleResetRef.current = isEmptyState;
  }, [isEmptyState, setHeroSubtitle]);
  const hasComposerText = composerValue.trim().length > 0;

  // herói limpo (sem sugestões em cima)
  const showInitialSuggestions = false;

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
      (erroApi === NETWORK_ERROR_MESSAGE || erroApi === CORS_ERROR_MESSAGE),
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
  }, [scrollInset, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldRenderGlobalTyping || !isAtBottom) return;
    scrollToBottom(false);
  }, [shouldRenderGlobalTyping, isAtBottom, scrollToBottom]);

  // Força scroll para a última mensagem sempre que mensagens mudam
  useEffect(() => {
    if (messages.length === 0) return;

    // Força scroll imediatamente
    scrollToBottom(false);

    // Aguarda render completo e força scroll novamente
    const scrollTimeout = setTimeout(() => {
      scrollToBottom(false);
    }, 50);

    return () => clearTimeout(scrollTimeout);
  }, [messages.length, scrollToBottom]);

  // Detecta quando ECO termina de responder (streaming → done)
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    const isCurrentlyStreaming = streaming || isEcoStreamTyping;

    // Se estava streaming e parou = ECO terminou de responder
    if (wasStreamingRef.current && !isCurrentlyStreaming) {
      // Força scroll para mostrar resposta completa da ECO
      scrollToBottom(false);

      // Retry após 100ms para garantir
      setTimeout(() => scrollToBottom(false), 100);

      // Retry após 300ms para garantir imagens/conteúdo
      setTimeout(() => scrollToBottom(false), 300);
    }

    wasStreamingRef.current = isCurrentlyStreaming;
  }, [streaming, isEcoStreamTyping, scrollToBottom]);

  // Scroll para o input quando o teclado abre (disabled - footer is now fixed on mobile)
  // useEffect(() => {
  //   if (!isKeyboardOpen || !chatInputWrapperRef.current) return;

  //   const timeoutId = setTimeout(() => {
  //     chatInputWrapperRef.current?.scrollIntoView({
  //       behavior: 'smooth',
  //       block: 'end'
  //     });
  //   }, 100);

  //   return () => clearTimeout(timeoutId);
  // }, [isKeyboardOpen]);

  // Haptic feedback quando Eco começa/termina de digitar
  useEffect(() => {
    if (isEcoStreamTyping) {
      haptic.light(); // Feedback leve ao começar a digitar
      setEcoTypingStartedAt(Date.now());
      setEcoTypingElapsed(0);
    } else {
      setEcoTypingStartedAt(null);
      setEcoTypingElapsed(0);
    }
  }, [isEcoStreamTyping, haptic]);

  // Timer para atualizar tempo de digitação da Eco
  useEffect(() => {
    if (!isEcoStreamTyping || !ecoTypingStartedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - ecoTypingStartedAt) / 1000);
      setEcoTypingElapsed(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [isEcoStreamTyping, ecoTypingStartedAt]);

  const feedbackPromptNode =
    showFeedback && lastEcoInfo?.msg ? (
      <Suspense fallback={null}>
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
            if (lastPromptFeedbackContext.messageId) payload.message_id = lastPromptFeedbackContext.messageId;
            if (lastPromptFeedbackContext.moduleCombo?.length) payload.module_combo = lastPromptFeedbackContext.moduleCombo;
            if (lastPromptFeedbackContext.promptHash) payload.prompt_hash = lastPromptFeedbackContext.promptHash;
            if (typeof lastPromptFeedbackContext.latencyMs === 'number') payload.latency_ms = lastPromptFeedbackContext.latencyMs;
            trackFeedbackEvent('FE: Feedback Prompt Closed', payload);
          handleFeedbackSubmitted();
        }}
      />
      </Suspense>
    ) : null;



  const footerStyle: CSSProperties = {
    paddingBottom: safeAreaBottom + 16,
  } as CSSProperties;

  // ---------------------------------------------------------------------------
  // ÚNICO indicador global de "digitando" (evita duplicidade)
  // ---------------------------------------------------------------------------
  const typingIndicatorNode = useMemo(() => {
    if (!(shouldShowGlobalTyping || isEcoStreamTyping)) return null;
    return (
      <div className="mt-1" role="status" aria-live="polite">
        <TypingDots
          variant="bubble"
          size="md"
          tone="auto"
          withLabel={true}
          elapsedTime={ecoTypingElapsed}
        />
      </div>
    );
  }, [shouldShowGlobalTyping, isEcoStreamTyping, ecoTypingElapsed]);

  const navigate = useNavigate();

  const handleBackToHome = useCallback(() => {
    // Volta para a HomePage sem fazer logout
    // Mantém o usuário logado ou em modo convidado
    navigate('/app');
  }, [navigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-white via-blue-50/20 to-purple-50/10">
      {/* Desktop Sidebar */}
      <Sidebar variant="desktop" isGuest={isGuest} onLogout={handleBackToHome} />

      {/* Mobile Bottom Nav */}
      <Sidebar variant="bottom" isGuest={isGuest} onLogout={handleBackToHome} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar - APENAS DESKTOP */}
        <div className="hidden lg:block">
          <TopBar onMenuClick={() => setSidebarOpen(true)} showMenuButton={false} />
        </div>

        {/* Chat Area */}
        <main
          ref={scrollerRef}
          className="flex-1 overflow-y-auto bg-transparent pt-14 lg:pt-0 pb-20 lg:pb-0"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            paddingBottom: Math.max(120, keyboardHeight + computedInputHeight + 80), // Padding para input
          }}
        >
          <div role="feed" aria-busy={isWaitingForEco || isSendingToEco} className="flex-1">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="mx-auto flex w-full max-w-3xl flex-col">
                {isEmptyState && (
                  <motion.div
                    className="w-full pt-12 pb-8"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <div className="text-center space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-medium text-gray-900">
                        {saudacao}, {displayName || rawUserName}
                      </h1>
                      <p className="text-base text-gray-600" data-testid="chat-hero-subtitle">
                        {heroSubtitle || OPENING_VARIATIONS[0] || ''}
                      </p>
                    </div>
                  </motion.div>
                )}

                {erroApi && (
                  <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-red-200/60 bg-red-50/50 backdrop-blur-sm px-4 py-3 text-center text-red-600">
                    <span className="text-sm">{erroApi}</span>
                    {canRetry && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={composerPending}
                        className="text-sm font-medium text-red-700 underline underline-offset-2 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </div>
                )}

                <div className={clsx("w-full", isEmptyState ? "mt-4" : "mt-6")}>
                  <MessageList
                    messages={messages}
                    prefersReducedMotion={prefersReducedMotion}
                    ecoActivityTTS={ecoActivity.onTTS}
                    feedbackPrompt={feedbackPromptNode}
                    typingIndicator={typingIndicatorNode}
                    isEcoTyping={isEcoStreamTyping}
                    endRef={endRef}
                    onRetryMessage={handleRetryMessage}
                  />
                </div>
              </div>
            </div>
          </div>

          {showNewMessagesChip && (
            <div
              className="fixed z-30 flex justify-center px-4 sm:px-6 lg:px-8 pointer-events-none left-0 right-0"
              style={{
                bottom: safeAreaBottom + computedInputHeight + 24,
                // Garantir que fica acima do conteúdo sem sobrepor
                marginBottom: '8px'
              }}
            >
              <button
                type="button"
                onClick={handleJumpToBottom}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-eco-baby to-eco-babyDark px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-eco-baby/50 active:scale-95 pointer-events-auto"
                aria-label="Rolar para novas mensagens"
              >
                Novas mensagens
              </button>
            </div>
          )}
        </main>

        {/* Footer Input */}
        <footer
          ref={chatInputWrapperRef}
          className="fixed lg:sticky z-40 w-full border-t border-black/5 bg-white/80 backdrop-blur-xl px-4 pt-3 pb-3 sm:px-6 lg:px-8 bottom-0 left-0 right-0"
          style={{
            ...footerStyle,
            paddingBottom: `calc(${safeAreaBottom + 12}px + env(safe-area-inset-bottom))`,
          }}
        >
          <div className="mx-auto w-full max-w-3xl space-y-2">
            <Suspense fallback={null}>
              <QuickSuggestions
                variant="footer"
                visible={showQuick && !composerPending && !erroApi && !voicePanelOpen}
                onPickSuggestion={handlePickSuggestion}
                rotatingItems={ROTATING_ITEMS}
                rotationMs={5000}
                showRotating={true}
                disabled={composerPending}
                className="-mb-1"
              />
            </Suspense>

            <SuggestionChips
              visible={shouldShowSuggestionChips}
              onPick={(suggestion, index) =>
                handlePickSuggestion(suggestion, { source: 'pill', index })
              }
              disabled={composerPending}
              className="-mt-1"
            />

            {/* FREE TIER: Indicador de mensagens restantes */}
            {user && !isPremium && !isGuest && freeLimits.remaining <= 10 && (
              <div className="text-xs text-center py-2 px-4 text-eco-muted">
                {freeLimits.remaining > 0 ? (
                  <>
                    {freeLimits.remaining} {freeLimits.remaining === 1 ? 'mensagem restante' : 'mensagens restantes'} hoje
                    {freeLimits.remaining <= 5 && (
                      <button
                        onClick={() => {
                          setLoginGateContext('chat_soft_limit');
                          setLoginGateOpen(true);
                        }}
                        className="ml-2 text-eco-primary font-semibold underline"
                      >
                        Upgrade
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    Limite diário atingido.{' '}
                    <button
                      onClick={() => {
                        setLoginGateContext('chat_daily_limit');
                        setLoginGateOpen(true);
                      }}
                      className="text-eco-primary font-semibold underline"
                    >
                      Upgrade para ilimitadas
                    </button>
                  </>
                )}
              </div>
            )}

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
                  mixpanel.track('signup_clicked', {
                    guestId: guestGate.guestId,
                    context: loginGateContext,
                  });
                }
                setLoginGateOpen(false);
                window.location.href = '/?returnTo=/app';
              }}
              count={guestGate.count}
              limit={guestGate.limit}
              context={loginGateContext}
              isSoftPrompt={loginGateContext === 'chat_soft_prompt'}
            />
          </div>
        </footer>
      </div>

      <Suspense fallback={null}>
        <VoiceRecorderPanel
          open={voicePanelOpen}
          bottomOffset={voicePanelBottomOffset}
          onCancel={handleVoicePanelClose}
          onConfirm={handleVoiceConfirm}
          onError={(error) => console.error('Painel de voz', error)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <EcoLoopHud />
      </Suspense>
    </div>
  );
};

export default ChatPage;
