/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — scroll estável + sem bolinha fantasma + saudação alinhada  */
/* -------------------------------------------------------------------------- */

import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';

import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import EcoBubbleOneEye from '../components/EcoBubbleOneEye';
import EcoMessageWithAudio from '../components/EcoMessageWithAudio';
import QuickSuggestions, { Suggestion, SuggestionPickMeta } from '../components/QuickSuggestions';
import TypingDots from '../components/TypingDots';

import { enviarMensagemParaEco, EcoEventHandlers } from '../api/ecoApi';
import { buscarUltimasMemoriasComTags, buscarMemoriasSemelhantesV2 } from '../api/memoriaApi';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import type { Message as ChatMessageType } from '../contexts/ChatContext';
import { salvarMensagem } from '../api/mensagem';

import { differenceInDays } from 'date-fns';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import { celebrateFirstMemory } from '../utils/celebrateFirstMemory';
import mixpanel from '../lib/mixpanel';

import { FeedbackPrompt } from '../components/FeedbackPrompt';

const FEEDBACK_KEY = 'eco_feedback_given';
const SESSION_STORAGE_KEY = 'eco.session';
const isDev = Boolean((import.meta as any)?.env?.DEV);

const ensureSessionId = () => {
  const generated = `sess_${uuidv4()}`;
  if (typeof window === 'undefined') return generated;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return generated;
  }
};

const saudacaoDoDiaFromHour = (h: number) => {
  if (h < 6) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const isTruthyDeepFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 'sim', 'yes', '1', 'ativa', 'ativada'].includes(normalized);
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const detectDeepQuestionInObject = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  if (Array.isArray(payload)) {
    return payload.some((item) => detectDeepQuestionInObject(item));
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (
      normalizedKey.includes('perguntaprofunda') ||
      normalizedKey.includes('deepquestion')
    ) {
      if (isTruthyDeepFlag(value)) return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (detectDeepQuestionInObject(value)) return true;
    }
  }
  return false;
};

const detectDeepQuestionInText = (text?: string | null): boolean => {
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized.includes('#pergunta_profunda') || normalized.includes('#perguntaprofunda')) return true;
  if (normalized.includes('[pergunta_profunda]') || normalized.includes('[perguntaprofunda]')) return true;
  if (/pergunta[_\s-]?profunda\s*[:=]\s*(true|sim|yes|1|ativa|ativada)/.test(normalized)) return true;
  if (/deep[_\s-]?question\s*[:=]\s*(true|yes|1)/.test(normalized)) return true;
  if (/"pergunta_profunda"\s*:\s*(true|"true"|"sim"|1)/.test(normalized)) return true;
  if (/"deep_question"\s*:\s*(true|"true"|1)/.test(normalized)) return true;
  if (normalized.includes('flag:pergunta_profunda') || normalized.includes('flag:perguntaprofunda')) return true;
  return false;
};

const extractDeepQuestionFlag = ({
  block,
  responseText,
  messageText,
}: {
  block?: unknown;
  responseText?: string | null;
  messageText?: string | null;
}): boolean => {
  if (detectDeepQuestionInObject(block)) return true;
  if (detectDeepQuestionInText(responseText)) return true;
  if (detectDeepQuestionInText(messageText)) return true;
  return false;
};

/* ====== Frases rotativas ====== */
const ROTATING_ITEMS: Suggestion[] = [
  { id: 'rot_presenca_scan', icon: '🌬️', label: 'Vamos fazer um mini-scan de presença agora?', modules: ['eco_observador_presente', 'eco_presenca_silenciosa', 'eco_corpo_emocao'], systemHint: 'Conduza um body scan curto (2–3 minutos), com foco gentil em respiração, pontos de contato e 1 pensamento.' },
  { id: 'rot_kahneman_check', icon: '🧩', label: 'Quero checar se caí em algum atalho mental hoje', modules: ['eco_heuristica_ancoragem','eco_heuristica_disponibilidade','eco_heuristica_excesso_confianca'], systemHint: 'Explique heurísticas em linguagem simples, faça 1 pergunta diagnóstica e proponha 1 reframe prático.' },
  { id: 'rot_vulnerabilidade', icon: '💗', label: 'Posso explorar coragem & vulnerabilidade em 1 situação', modules: ['eco_vulnerabilidade_defesas','eco_vulnerabilidade_mitos','eco_emo_vergonha_combate'], systemHint: 'Brené Brown: diferencie vulnerabilidade de exposição. Nomeie 1 defesa ativa e proponha 1 micro-ato de coragem.' },
  { id: 'rot_estoico', icon: '🏛️', label: 'O que está sob meu controle hoje?', modules: ['eco_presenca_racional','eco_identificacao_mente','eco_fim_do_sofrimento'], systemHint: 'Marco Aurélio: conduza 3 perguntas (controle / julgamento / ação mínima) e feche com 1 compromisso simples.' },
  { id: 'rot_regressao_media', icon: '📉', label: 'Talvez ontem foi exceção — quero revisar expectativas', modules: ['eco_heuristica_regressao_media','eco_heuristica_certeza_emocional'], systemHint: 'Explique regressão à média e convide a recalibrar expectativas com 1 evidência observável para hoje.' },
];

/* ====== Variações de abertura ====== */
const OPENING_VARIATIONS = [
  'Pronto para começar?',
  'O que está vivo em você agora?',
  'Quer explorar algum pensamento ou emoção?',
  'Vamos começar de onde você quiser.',
  'Um passo de cada vez: por onde vamos?',
];

const ChatPage: React.FC = () => {
  const { messages, addMessage, setMessages } = useChat();
  const { userId, userName = 'Usuário', user } = useAuth();
  const navigate = useNavigate();

  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);

  const [showFeedback, setShowFeedback] = useState(false);
  const [sessaoId] = useState(() => ensureSessionId());
  const aiMessages = useMemo(
    () => (messages || []).filter((m): m is ChatMessageType => m.sender === 'eco'),
    [messages]
  );

  const lastEcoInfo = useMemo<{ index: number; message?: ChatMessageType }>(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const current = messages[i];
      if (current.sender === 'eco') {
        return { index: i, message: current };
      }
    }
    return { index: -1 };
  }, [messages]);

  const [showQuick, setShowQuick] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const nearBottom = (el: HTMLDivElement, pad = 16) =>
    el.scrollTop + el.clientHeight >= el.scrollHeight - pad;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    mixpanel.track('Eco: Entrou no Chat', { userId, userName, timestamp: new Date().toISOString() });
  }, [user, navigate, userId, userName]);

  if (!user) return null;

  const clientHourNow = new Date().getHours();
  const saudacao = saudacaoDoDiaFromHour(clientHourNow);

  /* ====================== SCROLL CORE (estável) ====================== */

  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
      const at = nearBottom(el, 8);
      setIsAtBottom(at);
      setShowScrollBtn(!at);
    });
  };

  // início no fundo
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  // se já estava perto do fundo, mantenha no fundo ao chegar msg nova / estado de digitação mudar
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (nearBottom(el, 120)) scrollToBottom(true);
  }, [messages, digitando]);

  const handleScroll = () => {
    const el = scrollerRef.current!;
    const at = nearBottom(el, 16);
    setIsAtBottom(at);
    setShowScrollBtn(!at);
  };

  // iOS keyboard / visualViewport — sem jitter (opcional manter)
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const wasAtBottomRef = { current: true };

    const handleFocusIn = () => {
      document.body.classList.add('keyboard-open');
      const el = scrollerRef.current;
      wasAtBottomRef.current = !!el && nearBottom(el, 120);
    };
    const handleFocusOut = () => {
      document.body.classList.remove('keyboard-open');
    };
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    if (!vv) return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };

    let raf = 0; let scheduled = false;
    const measure = () => { scheduled = false; if (wasAtBottomRef.current) scrollToBottom(false); };
    const scheduleMeasure = () => { if (!scheduled) { scheduled = true; raf = requestAnimationFrame(measure); } };

    vv.addEventListener('resize', scheduleMeasure);
    vv.addEventListener('scroll', scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      vv.removeEventListener('resize', scheduleMeasure);
      vv.removeEventListener('scroll', scheduleMeasure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* ====================== LÓGICA DO CHAT ====================== */

  useEffect(() => {
    const already = sessionStorage.getItem(FEEDBACK_KEY);
    if (already || showFeedback) return;

    const lastEco = aiMessages[aiMessages.length - 1];
    if (!lastEco?.deepQuestion) return;

    if (aiMessages.length >= 3) {
      setShowFeedback(true);
      mixpanel.track('Feedback Shown', { aiCount: aiMessages.length });
    }
  }, [aiMessages, showFeedback]);

  const clearLastEcoDeepQuestion = useCallback(() => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        const current = prev[i];
        if (current.sender === 'eco') {
          if (!current.deepQuestion) return prev;
          const updated = [...prev];
          updated[i] = { ...current, deepQuestion: false };
          return updated;
        }
      }
      return prev;
    });
  }, [setMessages]);

  const handleFeedbackSubmitted = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(FEEDBACK_KEY, '1');
      }
    } catch {}
    clearLastEcoDeepQuestion();
    setShowFeedback(false);
  }, [clearLastEcoDeepQuestion, setShowFeedback]);

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) setShowQuick(false);
  }, [messages]);

  useEffect(() => {
    const onUserTypes = (ev: Event) => {
      const t = ev.target as HTMLElement | null;
      if (!t) return;
      const isTyping =
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.getAttribute('contenteditable') === 'true';
      if (isTyping) setShowQuick(false);
    };
    window.addEventListener('input', onUserTypes, { passive: true });
    window.addEventListener('paste', onUserTypes, { passive: true });
    return () => {
      window.removeEventListener('input', onUserTypes);
      window.removeEventListener('paste', onUserTypes);
    };
  }, []);

  const gerarMensagemRetorno = (mem: any): string | null => {
    if (!mem) return null;
    const dias = differenceInDays(new Date(), new Date(mem.created_at));
    if (dias === 0) return null;
    const resumo = mem.resumo_eco || 'algo que foi sentido';
    return `O usuário retorna após ${dias} dias. Na última interação significativa, compartilhou: “${resumo}”. Use isso para acolher o reencontro com sensibilidade.`;
  };

  const handleSendMessage = async (text: string, systemHint?: string) => {
    const raw = text ?? '';
    const trimmed = raw.trim();
    if (!trimmed || digitando) return;

    setDigitando(true);
    setErroApi(null);

    const userLocalId = uuidv4();
    addMessage({ id: userLocalId, text: trimmed, sender: 'user' });

    requestAnimationFrame(() => scrollToBottom(true));

    mixpanel.track('Eco: Mensagem Enviada', { userId, userName, mensagem: trimmed, timestamp: new Date().toISOString() });

    try {
      const tags = extrairTagsRelevantes(trimmed);

      let persistedMensagemId = userLocalId;

      const salvarMensagemPromise = salvarMensagem({
        usuarioId: userId!,
        conteudo: trimmed,
        sentimento: '',
        salvarMemoria: true,
      })
        .then((saved) => saved?.[0]?.id ?? null)
        .catch(() => null);

      const mensagemIdPromise = salvarMensagemPromise
        .then((savedMensagemId) => {
          if (savedMensagemId && savedMensagemId !== userLocalId) {
            persistedMensagemId = savedMensagemId;
            setMessages((prev) =>
              prev.map((m) => (m.id === userLocalId ? { ...m, id: savedMensagemId } : m))
            );
            return savedMensagemId;
          }
          return userLocalId;
        })
        .catch(() => userLocalId);

      const buscarSimilaresPromise = buscarMemoriasSemelhantesV2(trimmed, {
        k: 3,
        threshold: 0.12,
        usuario_id: userId!,
      }).catch(() => []);

      const buscarPorTagPromise = tags.length
        ? buscarUltimasMemoriasComTags(userId!, tags, 2).catch(() => [])
        : Promise.resolve([]);

      const [similar, porTag] = await Promise.all([
        buscarSimilaresPromise,
        buscarPorTagPromise,
      ]);

      const baseHistory = [...messages, { id: userLocalId, role: 'user', content: trimmed }];

      // mescla e deduplica (por id ou hash simples de data+resumo)
      const vistos = new Set<string>();
      const mems = [...(similar || []), ...(porTag || [])].filter((m: any) => {
        const key = m.id || `${m.created_at}-${m.resumo_eco}`;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
      });

      const ctxMems = (mems || [])
        .map((m: any) => {
          const data = new Date(m.created_at || '').toLocaleDateString();
          const tgs = m.tags?.length ? ` [tags: ${m.tags.join(', ')}]` : '';
          // inclui similaridade quando disponível (0–1 → %)
          const sim = typeof m.similarity === 'number' ? ` ~${Math.round(m.similarity * 100)}%` : '';
          return `(${data}) ${m.resumo_eco}${tgs}${sim}`;
        })
        .join('\n');

      const memSignif = (mems || []).find((m: any) => (m.intensidade ?? 0) >= 7);
      const retorno = gerarMensagemRetorno(memSignif);

      const preSistema: any[] = [];
      if (systemHint) preSistema.push({ role: 'system', content: systemHint });
      if (retorno) preSistema.push({ role: 'system', content: retorno });
      if (ctxMems) preSistema.push({ role: 'system', content: `Memórias recentes relevantes:\n${ctxMems}` });

      // reduz histórico enviado (mantém comportamento estável)
      const janelaHistorico = baseHistory.slice(-3);

      const mensagensComContexto = [
        ...preSistema,
        ...janelaHistorico.map((m: any) => ({
          role: (m.role as any) || (m.sender === 'eco' ? 'assistant' : 'user'),
          content: m.content || m.text || '',
        })),
      ];

      const clientHour = new Date().getHours();
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      let ecoMessageId: string | null = null;
      let ecoMessageIndex: number | null = null;
      let resolvedEcoMessageId: string | null = null;
      let resolvedEcoMessageIndex: number | null = null;
      let aggregatedEcoText = '';
      let latestMetadata: unknown;
      let pendingMetadata: unknown;
      let donePayload: unknown;
      let memoryFromStream: unknown;
      let primeiraMemoriaFlag = false;
      let trackedMemory = false;
      let latencyFromStream: number | undefined;
      let firstContentReceived = false;

      const getNow = () =>
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();

      const requestStartedAt = getNow();
      let promptReadyAt: number | undefined;
      let firstTokenAt: number | undefined;
      let doneAt: number | undefined;
      let metricsReported = false;

      const logAndSendStreamMetrics = (
        outcome: 'success' | 'error',
        extra: Record<string, unknown> = {},
      ) => {
        if (metricsReported) return;
        metricsReported = true;

        const markers = {
          eco_prompt_ready_at: promptReadyAt ?? null,
          eco_first_token_at: firstTokenAt ?? null,
          eco_done_at: doneAt ?? null,
        };

        const latencySource =
          typeof latencyFromStream === 'number' ? 'server' : 'client';

        const ttfbRaw =
          typeof latencyFromStream === 'number'
            ? latencyFromStream
            : typeof firstTokenAt === 'number'
            ? firstTokenAt - requestStartedAt
            : undefined;
        const ttfbMs =
          typeof ttfbRaw === 'number' ? Math.max(Math.round(ttfbRaw), 0) : null;

        const firstTokenLatencyRaw =
          typeof promptReadyAt === 'number' && typeof firstTokenAt === 'number'
            ? firstTokenAt - promptReadyAt
            : undefined;
        const firstTokenLatencyMs =
          typeof firstTokenLatencyRaw === 'number'
            ? Math.max(Math.round(firstTokenLatencyRaw), 0)
            : null;

        const basePayload = {
          ...markers,
          userId,
          sessionId: sessaoId,
          outcome,
          mensagem_id: persistedMensagemId,
          mensagem_local_id: userLocalId,
          latency_from_stream_ms:
            typeof latencyFromStream === 'number' ? latencyFromStream : null,
          latency_source: latencySource,
          ...extra,
        };

        console.log('[ChatPage] Eco stream markers', {
          ...basePayload,
          request_started_at: requestStartedAt,
        });

        mixpanel.track('Eco: Stream TTFB', {
          ...basePayload,
          ttfb_ms: ttfbMs,
        });

        mixpanel.track('Eco: Stream First Token Latency', {
          ...basePayload,
          first_token_latency_ms: firstTokenLatencyMs,
        });

        const mixpanelAny = mixpanel as any;
        if (ttfbMs !== null && typeof mixpanelAny?.people?.set === 'function') {
          mixpanelAny.people.set({ eco_ttfb_ms: ttfbMs });
        }
        if (
          firstTokenLatencyMs !== null &&
          typeof mixpanelAny?.people?.set === 'function'
        ) {
          mixpanelAny.people.set({ eco_first_token_latency_ms: firstTokenLatencyMs });
        }
      };

      const ensureEcoMessage = () => {
        if (ecoMessageId) return;
        const newId = uuidv4();
        ecoMessageId = newId;
        resolvedEcoMessageId = newId;
        setMessages((prev) => {
          const index = prev.length;
          const placeholder: ChatMessageType = { id: newId, sender: 'eco', text: ' ' };
          ecoMessageIndex = index;
          resolvedEcoMessageIndex = index;
          return [...prev, placeholder];
        });
      };

      const patchEcoMessage = (patch: Partial<ChatMessageType>) => {
        const targetId = ecoMessageId ?? resolvedEcoMessageId;
        if (!targetId) return;
        if (Object.keys(patch).length === 0) return;
        setMessages((prev) => {
          const cachedIndex = ecoMessageIndex ?? resolvedEcoMessageIndex;
          let index = cachedIndex ?? prev.findIndex((m) => m.id === targetId);
          if (index < 0) return prev;
          const existing = prev[index];
          if (!existing) return prev;
          if (ecoMessageId && ecoMessageIndex === null) {
            ecoMessageIndex = index;
          }
          resolvedEcoMessageId = targetId;
          resolvedEcoMessageIndex = index;
          let changed = false;
          for (const [key, value] of Object.entries(patch)) {
            if ((existing as any)[key] !== value) {
              changed = true;
              break;
            }
          }
          if (!changed) return prev;
          const updated = { ...existing, ...patch };
          const next = [...prev];
          next[index] = updated;
          return next;
        });
      };

      const resetEcoMessageTracking = () => {
        ecoMessageId = null;
        ecoMessageIndex = null;
      };

      const syncScroll = () => {
        if (isAtBottom) {
          requestAnimationFrame(() => scrollToBottom(true));
        }
      };

      const trackMemoryIfSignificant = (bloco: any) => {
        if (trackedMemory || !bloco || typeof bloco !== 'object') return;
        const intensidade = (bloco as any).intensidade;
        if (typeof intensidade === 'number' && intensidade >= 7) {
          trackedMemory = true;
          mixpanel.track('Memória Registrada', {
            intensidade,
            emocao_principal: (bloco as any).emocao_principal || 'desconhecida',
            modulo_ativado: (bloco as any).modulo_ativado || 'não informado',
            dominio_vida: (bloco as any).dominio_vida || 'geral',
            padrao_comportamental: (bloco as any).padrao_comportamental || 'não identificado',
          });
        }
      };

      const handlers: EcoEventHandlers = {
        onPromptReady: () => {
          if (promptReadyAt === undefined) {
            promptReadyAt = getNow();
          }
          ensureEcoMessage();
          patchEcoMessage({ text: ' ' });
          syncScroll();
        },
        onLatency: (event) => {
          if (typeof event.latencyMs === 'number') {
            latencyFromStream = event.latencyMs;
            ensureEcoMessage();
            patchEcoMessage({ latencyMs: event.latencyMs });
          }
        },
        onFirstToken: (event) => {
          if (firstTokenAt === undefined) {
            firstTokenAt = getNow();
          }
          ensureEcoMessage();
          const texto = event.text ?? '';
          aggregatedEcoText = texto;
          const hasSubstantiveContent = texto.trim().length > 0;
          firstContentReceived = hasSubstantiveContent;
          patchEcoMessage({ text: texto.length > 0 ? texto : ' ' });
          if (hasSubstantiveContent) {
            setDigitando(false);
          }
          syncScroll();
        },
        onChunk: (event) => {
          if (!event.text) return;
          ensureEcoMessage();
          aggregatedEcoText += event.text;
          if (!firstContentReceived && aggregatedEcoText.trim().length > 0) {
            firstContentReceived = true;
            setDigitando(false);
          }
          patchEcoMessage({ text: aggregatedEcoText });
          syncScroll();
        },
        onMetaPending: (event) => {
          const meta = event.metadata ?? event.payload;
          pendingMetadata = meta;
          ensureEcoMessage();
          patchEcoMessage({ metadata: meta });
        },
        onMeta: (event) => {
          const meta = event.metadata ?? event.payload;
          latestMetadata = meta;
          ensureEcoMessage();
          patchEcoMessage({ metadata: meta });
          trackMemoryIfSignificant(meta);
        },
        onMemorySaved: (event) => {
          const memoria = event.memory ?? (event.payload as any)?.memory ?? (event.payload as any)?.memoria ?? event.payload;
          memoryFromStream = memoria;
          if ((event.payload as any)?.primeiraMemoriaSignificativa || (event.payload as any)?.primeira) {
            primeiraMemoriaFlag = true;
          }
          ensureEcoMessage();
          patchEcoMessage({ memory: memoria });
          trackMemoryIfSignificant(memoria);
        },
        onDone: (event) => {
          if (doneAt === undefined) {
            doneAt = getNow();
          }
          donePayload = event.payload;
          const meta = event.metadata ?? latestMetadata ?? pendingMetadata ?? event.payload?.response ?? event.payload?.metadata;
          if (meta !== undefined) {
            latestMetadata = meta;
            ensureEcoMessage();
            patchEcoMessage({ metadata: meta, donePayload: event.payload });
            trackMemoryIfSignificant(meta);
          } else {
            ensureEcoMessage();
            patchEcoMessage({ donePayload: event.payload });
          }
          if (event.text && aggregatedEcoText.length === 0) {
            aggregatedEcoText = event.text;
            patchEcoMessage({ text: aggregatedEcoText });
          }
          if (event.payload?.primeiraMemoriaSignificativa || event.payload?.primeira) {
            primeiraMemoriaFlag = true;
          }
          setDigitando(false);
          syncScroll();
          const metricsExtra: Record<string, unknown> = { stage: 'on_done' };
          if (meta !== undefined) {
            metricsExtra.final_metadata = meta;
          }
          logAndSendStreamMetrics('success', metricsExtra);
          resetEcoMessageTracking();
        },
        onError: (error) => {
          if (doneAt === undefined) {
            doneAt = getNow();
          }
          setDigitando(false);
          const message =
            typeof error?.message === 'string' ? error.message : undefined;
          const normalizedMessage = message?.toLowerCase() ?? '';
          const reason =
            error?.name === 'AbortError'
              ? 'aborted'
              : normalizedMessage.includes('expirou')
              ? 'timeout'
              : 'error';
          logAndSendStreamMetrics('error', {
            stage: 'stream_error',
            error_name: error?.name ?? 'Error',
            error_message: message ?? 'Erro desconhecido na stream.',
            error_reason: reason,
          });
          resetEcoMessageTracking();
        },
      };

      const resposta = await enviarMensagemParaEco(
        mensagensComContexto,
        userName,
        userId!,
        clientHour,
        clientTz,
        handlers
      );

      const finalText = (resposta?.text || aggregatedEcoText || '').trim();
      const finalMetadata =
        latestMetadata ||
        pendingMetadata ||
        (resposta?.metadata && typeof resposta.metadata === 'object' ? resposta.metadata : undefined) ||
        (resposta?.done && typeof resposta.done === 'object' ? resposta.done : undefined);

      if (!resolvedEcoMessageId) {
        if (finalText) {
          const newId = uuidv4();
          resolvedEcoMessageId = newId;
          const ecoMessage: ChatMessageType = {
            id: newId,
            text: finalText,
            sender: 'eco',
            ...(finalMetadata !== undefined ? { metadata: finalMetadata } : {}),
            ...(resposta?.done ? { donePayload: resposta.done } : {}),
            ...(memoryFromStream ? { memory: memoryFromStream } : {}),
            ...(typeof latencyFromStream === 'number' ? { latencyMs: latencyFromStream } : {}),
          };
          setMessages((prev) => {
            const index = prev.length;
            resolvedEcoMessageIndex = index;
            return [...prev, ecoMessage];
          });
        }
      } else {
        if (finalText) {
          patchEcoMessage({ text: finalText });
        }
        const patch: Partial<ChatMessageType> = {};
        if (finalMetadata !== undefined) patch.metadata = finalMetadata;
        if (resposta?.done) patch.donePayload = resposta.done;
        if (memoryFromStream) patch.memory = memoryFromStream;
        if (typeof latencyFromStream === 'number') patch.latencyMs = latencyFromStream;
        if (Object.keys(patch).length > 0) {
          patchEcoMessage(patch);
        }
      }

      donePayload = donePayload || resposta?.done;

      const bloco =
        (finalMetadata && typeof finalMetadata === 'object' ? finalMetadata : undefined) ||
        (donePayload && typeof donePayload === 'object' ? donePayload : undefined);

      if (!bloco && isDev) {
        console.debug('[ChatPage] Resposta da Eco sem metadata estruturada', resposta?.metadata);
      }

      const deepQuestionFlag = extractDeepQuestionFlag({
        block: bloco,
        responseText:
          typeof finalMetadata === 'string'
            ? (finalMetadata as string)
            : bloco
              ? JSON.stringify(bloco)
              : undefined,
        messageText: finalText,
      });

      if (resolvedEcoMessageId && deepQuestionFlag) {
        patchEcoMessage({ deepQuestion: true });
      }

      if (resposta?.primeiraMemoriaSignificativa || primeiraMemoriaFlag) {
        celebrateFirstMemory();
      }

      const memoriaParaTracking = memoryFromStream || bloco;
      trackMemoryIfSignificant(memoriaParaTracking);

      const finalMixpanelMetadata =
        finalMetadata !== undefined
          ? finalMetadata
          : pendingMetadata !== undefined
          ? pendingMetadata
          : donePayload;

      if (finalMixpanelMetadata !== undefined) {
        mensagemIdPromise
          .then((mensagemIdFinal) => {
            mixpanel.track('Eco: Resposta Metadata', {
              userId,
              sessionId: sessaoId,
              mensagemId: mensagemIdFinal,
              metadata: finalMixpanelMetadata,
            });
          })
          .catch(() => {
            mixpanel.track('Eco: Resposta Metadata', {
              userId,
              sessionId: sessaoId,
              mensagemId: userLocalId,
              metadata: finalMixpanelMetadata,
            });
          });
      }

      if (!metricsReported) {
        if (doneAt === undefined) {
          doneAt = getNow();
        }
        logAndSendStreamMetrics('success', { stage: 'post_stream' });
      }
    } catch (err: any) {
      console.error('[ChatPage] erro:', err);
      setErroApi(err?.message || 'Falha ao enviar mensagem.');
      mixpanel.track('Eco: Erro ao Enviar Mensagem', {
        userId,
        erro: err?.message || 'desconhecido',
        mensagem: (text || '').slice(0, 120),
        timestamp: new Date().toISOString(),
      });
      resetEcoMessageTracking();
      if (!metricsReported) {
        if (doneAt === undefined) {
          doneAt = getNow();
        }
        const reason = err?.name === 'AbortError' ? 'aborted' : 'error';
        logAndSendStreamMetrics('error', {
          stage: 'request_catch',
          error_name: err?.name ?? 'Error',
          error_message: err?.message ?? 'Erro desconhecido ao enviar mensagem.',
          error_reason: reason,
        });
      }
    } finally {
      setDigitando(false);
      scrollToBottom(true);
    }
  };

  const handlePickSuggestion = async (s: Suggestion, meta?: SuggestionPickMeta) => {
    setShowQuick(false);
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
    await handleSendMessage(userText, hint);
  };

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
              <motion.div className="px-4 w-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
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
            <div className="glass rounded-xl text-red-600 text-center mb-4 px-4 py-2">{erroApi}</div>
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

            {showFeedback && lastEcoInfo.message && (
              <div className="flex justify-center pt-3">
                <div className="mx-auto flex max-w-xl items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                  <FeedbackPrompt
                    sessaoId={sessaoId}
                    usuarioId={userId}
                    mensagemId={lastEcoInfo.message.id}
                    extraMeta={{
                      ecoMessageIndex: lastEcoInfo.index,
                      uiMessageId: lastEcoInfo.message.id,
                    }}
                    onSubmitted={handleFeedbackSubmitted}
                  />
                </div>
              </div>
            )}

            {digitando && (
              <div className="w-full flex justify-start">
                <div className="max-w-3xl w-full min-w-0 flex items-start gap-3">
                  <div className="flex-shrink-0 translate-y-[2px]">
                    <EcoBubbleOneEye variant="message" state="thinking" size={30} />
                  </div>
                  <div className="min-w-0">
                    <TypingDots variant="bubble" size="md" />
                  </div>
                </div>
              </div>
            )}

            {/* Âncora explícita para reancoragem do scroll */}
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
      </div> {/* <- fecha o scroller */}

      {/* BARRA DE INPUT */}
      <div ref={inputBarRef} className="sticky bottom-0 z-40 bg-gradient-to-t from-white via-white/95 to-white/80 px-4 pb-3 pt-3 sm:px-6 lg:px-10">
        <div className="w-full mx-auto max-w-3xl">
          <QuickSuggestions
            visible={showQuick && messages.length === 0 && !digitando && !erroApi}
            onPickSuggestion={handlePickSuggestion}
            rotatingItems={ROTATING_ITEMS}
            rotationMs={5000}
            className="mt-1 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
          />
          <ChatInput
            onSendMessage={(t) => handleSendMessage(t)}
            onMoreOptionSelected={(opt) => { if (opt === 'go_to_voice_page') navigate('/voice'); }}
            onSendAudio={() => console.log('Áudio enviado')}
            disabled={digitando}
            onTextChange={(t) => setShowQuick(t.trim().length === 0)}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
