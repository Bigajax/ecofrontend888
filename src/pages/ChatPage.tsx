/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — Apple-inspired glass UI with virtualization and retries    */
/* -------------------------------------------------------------------------- */

import React, {
  Dispatch,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';

import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import QuickSuggestions, { Suggestion } from '../components/QuickSuggestions';
import TypingDots from '../components/TypingDots';
import EcoBubbleIcon from '../components/EcoBubbleIcon';
import { GlassToolbar } from '../components/ui/Primitives';

import { enviarMensagemParaEco } from '../api/ecoApi';
import { buscarUltimasMemoriasComTags, buscarMemoriasSemelhantesV2 } from '../api/memoriaApi';
import { salvarMensagem } from '../api/mensagem';

import { useAuth } from '../contexts/AuthContext';
import { useChat, Message } from '../contexts/ChatContext';

import { differenceInDays } from 'date-fns';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import mixpanel from '../lib/mixpanel';

import { FeedbackPrompt } from '../components/FeedbackPrompt';

const EcoMessageWithAudio = lazy(() => import('../components/EcoMessageWithAudio'));

const FEEDBACK_KEY = 'eco_feedback_given';
const ESTIMATED_ROW_HEIGHT = 132;
const ROW_GAP = 16;
const OVERSCAN = 8;

const saudacaoDoDiaFromHour = (h: number) => {
  if (h < 6) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const ROTATING_ITEMS: Suggestion[] = [
  { id: 'rot_presenca_scan', icon: '🌬️', label: 'Vamos fazer um mini-scan de presença agora?', modules: ['eco_observador_presente', 'eco_presenca_silenciosa', 'eco_corpo_emocao'], systemHint: 'Conduza um body scan curto (2–3 minutos), com foco gentil em respiração, pontos de contato e 1 pensamento.' },
  { id: 'rot_kahneman_check', icon: '🧩', label: 'Quero checar se caí em algum atalho mental hoje', modules: ['eco_heuristica_ancoragem', 'eco_heuristica_disponibilidade', 'eco_heuristica_excesso_confianca'], systemHint: 'Explique heurísticas em linguagem simples, faça 1 pergunta diagnóstica e proponha 1 reframe prático.' },
  { id: 'rot_vulnerabilidade', icon: '💗', label: 'Posso explorar coragem & vulnerabilidade em 1 situação', modules: ['eco_vulnerabilidade_defesas', 'eco_vulnerabilidade_mitos', 'eco_emo_vergonha_combate'], systemHint: 'Brené Brown: diferencie vulnerabilidade de exposição. Nomeie 1 defesa ativa e proponha 1 micro-ato de coragem.' },
  { id: 'rot_estoico', icon: '🏛️', label: 'O que está sob meu controle hoje?', modules: ['eco_presenca_racional', 'eco_identificacao_mente', 'eco_fim_do_sofrimento'], systemHint: 'Marco Aurélio: conduza 3 perguntas (controle / julgamento / ação mínima) e feche com 1 compromisso simples.' },
  { id: 'rot_regressao_media', icon: '📉', label: 'Talvez ontem foi exceção — quero revisar expectativas', modules: ['eco_heuristica_regressao_media', 'eco_heuristica_certeza_emocional'], systemHint: 'Explique regressão à média e convide a recalibrar expectativas com 1 evidência observável para hoje.' },
];

const OPENING_VARIATIONS = [
  'Pronto para começar?',
  'O que está vivo em você agora?',
  'Quer explorar algum pensamento ou emoção?',
  'Vamos começar de onde você quiser.',
  'Um passo de cada vez: por onde vamos?',
];

type PositionedMessage = {
  message: Message;
  index: number;
  top: number;
  height: number;
};

const findIndexForOffset = (items: PositionedMessage[], offset: number) => {
  let low = 0;
  let high = items.length - 1;
  let answer = items.length;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const item = items[mid];
    if (item.top + item.height > offset) {
      answer = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return answer;
};

const parseStatus = (error: any): number | undefined => {
  if (typeof error?.status === 'number') return error.status;
  const match = String(error?.message ?? '').match(/(\d{3})/);
  const parsed = match ? Number(match[1]) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MessageRow = memo(
  ({
    meta,
    virtualization,
    onMeasure,
  }: {
    meta: PositionedMessage;
    virtualization: boolean;
    onMeasure: (id: string, height: number) => void;
  }) => {
    const rowRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      const el = rowRef.current;
      if (!el) return;
      const measure = () => {
        const rect = el.getBoundingClientRect();
        if (rect.height) onMeasure(meta.message.id, rect.height);
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, [meta.message.id, onMeasure]);

    return (
      <div
        ref={rowRef}
        className="message-row"
        data-virtual={virtualization ? 'true' : 'false'}
        style={virtualization ? { transform: `translateY(${meta.top}px)` } : undefined}
      >
        <div className="flex justify-center pt-1">
          {meta.message.sender === 'eco' ? (
            <EcoBubbleIcon size={28} />
          ) : (
            <span className="message-row__spacer" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          {meta.message.sender === 'eco' ? (
            <Suspense fallback={<ChatMessage message={meta.message} />}>
              <EcoMessageWithAudio message={meta.message} />
            </Suspense>
          ) : (
            <ChatMessage message={meta.message} />
          )}
        </div>
        <span className="message-row__spacer" aria-hidden />
      </div>
    );
  }
);
MessageRow.displayName = 'MessageRow';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { messages, addMessage, updateMessage, setMessages } = useChat();
  const { userId, userName = 'Usuário', user } = useAuth();

  const setMessagesDispatch = useMemo(
    () => setMessages as unknown as Dispatch<SetStateAction<Message[]>>,
    [setMessages]
  );

  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [showQuick, setShowQuick] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const requestAbortRef = useRef<AbortController | null>(null);
  const streamMessageRef = useRef<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    mixpanel.track('Eco: Entrou no Chat', {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });
  }, [user, navigate, userId, userName]);

  if (!user) return null;

  const aiMessages = useMemo(() => messages.filter((m) => m.sender === 'eco'), [messages]);

  useEffect(() => {
    const already = sessionStorage.getItem(FEEDBACK_KEY);
    if (!already && aiMessages.length >= 3) {
      setShowFeedback(true);
      mixpanel.track('Feedback Shown', { aiCount: aiMessages.length });
    }
  }, [aiMessages.length]);

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

  const measurementCache = useRef<Map<string, number>>(new Map());
  const [measureVersion, setMeasureVersion] = useState(0);

  const updateMeasurement = useCallback((id: string, height: number) => {
    const cache = measurementCache.current;
    const rounded = Math.round(height);
    if (rounded <= 0) return;
    if (cache.get(id) !== rounded) {
      cache.set(id, rounded);
      setMeasureVersion((v) => v + 1);
    }
  }, []);

  const virtualizationEnabled = useMemo(() => messages.length > 200, [messages.length]);

  const { positionedMessages, virtualHeight } = useMemo(() => {
    let offset = 0;
    const metas = messages.map((message, index) => {
      const cached = measurementCache.current.get(message.id) ?? ESTIMATED_ROW_HEIGHT;
      const height = cached + ROW_GAP;
      const meta: PositionedMessage = {
        message,
        index,
        top: offset,
        height,
      };
      offset += height;
      return meta;
    });
    return { positionedMessages: metas, virtualHeight: offset };
  }, [messages, measureVersion]);

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: messages.length });

  const updateVirtualWindow = useCallback(() => {
    if (!virtualizationEnabled) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const scrollTop = scroller.scrollTop;
    const viewHeight = scroller.clientHeight;
    const startIndex = Math.max(0, findIndexForOffset(positionedMessages, scrollTop) - OVERSCAN);
    const endIndex = Math.min(
      positionedMessages.length,
      findIndexForOffset(positionedMessages, scrollTop + viewHeight) + OVERSCAN
    );
    setVisibleRange({ start: startIndex, end: endIndex });
  }, [positionedMessages, virtualizationEnabled]);

  useEffect(() => {
    if (!virtualizationEnabled) {
      setVisibleRange({ start: 0, end: positionedMessages.length });
      return;
    }
    setVisibleRange({
      start: Math.max(0, positionedMessages.length - 60),
      end: positionedMessages.length,
    });
  }, [positionedMessages.length, virtualizationEnabled]);

  useEffect(() => {
    if (virtualizationEnabled) updateVirtualWindow();
  }, [virtualizationEnabled, updateVirtualWindow, positionedMessages]);

  const visibleItems = useMemo(() => {
    if (!virtualizationEnabled) return positionedMessages;
    return positionedMessages.slice(visibleRange.start, visibleRange.end);
  }, [positionedMessages, visibleRange, virtualizationEnabled]);

  const nearBottom = useCallback((el: HTMLDivElement, pad = 16) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - pad;
  }, []);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const el = scrollerRef.current;
      if (!el) return;
      const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
      const target = virtualizationEnabled ? Math.max(virtualHeight - el.clientHeight, 0) : el.scrollHeight;
      requestAnimationFrame(() => {
        el.scrollTo({ top: target, behavior });
        const at = nearBottom(el, 24);
        setIsAtBottom(at);
        setShowScrollBtn(!at);
        if (virtualizationEnabled) updateVirtualWindow();
      });
    },
    [nearBottom, virtualizationEnabled, virtualHeight, updateVirtualWindow]
  );

  useEffect(() => {
    scrollToBottom(false);
  }, []); // mount

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (nearBottom(el, 120)) scrollToBottom(true);
  }, [messages.length, digitando, nearBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const at = nearBottom(el, 18);
    setIsAtBottom(at);
    setShowScrollBtn(!at);
    if (virtualizationEnabled) updateVirtualWindow();
  }, [nearBottom, updateVirtualWindow, virtualizationEnabled]);

  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;
    let raf = 0;
    const handle = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (isAtBottom) scrollToBottom(false);
      });
    };
    vv.addEventListener('resize', handle);
    vv.addEventListener('scroll', handle);
    return () => {
      vv.removeEventListener('resize', handle);
      vv.removeEventListener('scroll', handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isAtBottom, scrollToBottom]);

  const clearPendingAssistant = useCallback(() => {
    const pendingId = streamMessageRef.current;
    if (!pendingId) return;
    streamMessageRef.current = null;
    setMessagesDispatch((prev) => prev.filter((msg) => msg.id !== pendingId));
  }, [setMessagesDispatch]);

  const commitAssistantMessage = useCallback(
    (text: string) => {
      const pendingId = streamMessageRef.current;
      if (pendingId) {
        updateMessage(pendingId, text);
        streamMessageRef.current = null;
      } else if (text) {
        addMessage({ id: uuidv4(), text, sender: 'eco' });
      }
    },
    [addMessage, updateMessage]
  );

  const gerarMensagemRetorno = useCallback((mem: any): string | null => {
    if (!mem) return null;
    const dias = differenceInDays(new Date(), new Date(mem.created_at));
    if (dias === 0) return null;
    const resumo = mem.resumo_eco || 'algo que foi sentido';
    return `O usuário retorna após ${dias} dias. Na última interação significativa, compartilhou: “${resumo}”. Use isso para acolher o reencontro com sensibilidade.`;
  }, []);

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const trimmed = (text ?? '').trim();
      if (!trimmed || digitando) return;

      setDigitando(true);
      setErroApi(null);
      setShowQuick(false);

      const userLocalId = uuidv4();
      addMessage({ id: userLocalId, text: trimmed, sender: 'user' });
      requestAnimationFrame(() => scrollToBottom(true));

      mixpanel.track('Eco: Mensagem Enviada', {
        userId,
        userName,
        mensagem: trimmed,
        timestamp: new Date().toISOString(),
      });

      const controller = new AbortController();
      requestAbortRef.current?.abort();
      requestAbortRef.current = controller;

      try {
        const saved = await salvarMensagem({
          usuarioId: userId!,
          conteudo: trimmed,
          sentimento: '',
          salvarMemoria: true,
        });
        const mensagemId = saved?.[0]?.id || userLocalId;

        const baseHistory = [...messagesRef.current, { id: mensagemId, role: 'user', content: trimmed }];
        const tags = extrairTagsRelevantes(trimmed);

        const [similar, porTag] = await Promise.all([
          buscarMemoriasSemelhantesV2(trimmed, { k: 3, threshold: 0.12, usuario_id: userId! }).catch(() => []),
          tags.length ? buscarUltimasMemoriasComTags(userId!, tags, 2).catch(() => []) : Promise.resolve([]),
        ]);

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

        const maxAttempts = 3;
        let attempt = 0;
        let resposta = '';
        let lastError: any = null;

        while (attempt < maxAttempts) {
          try {
            resposta = await enviarMensagemParaEco(
              mensagensComContexto,
              userName,
              userId!,
              clientHour,
              clientTz,
              { signal: controller.signal }
            );
            lastError = null;
            break;
          } catch (err: any) {
            if (controller.signal.aborted) throw err;
            lastError = err;
            const status = parseStatus(err);
            if (status === 429 || (status && status >= 500 && status < 600)) {
              const backoff = Math.min(1500 * 2 ** attempt, 6000);
              await delay(backoff);
              attempt += 1;
              continue;
            }
            throw err;
          }
        }

        if (lastError) throw lastError;

        const textoEco = (resposta || '').replace(/\n\{[\s\S]*\}\s*$/m, '').trim();
        if (textoEco) commitAssistantMessage(textoEco);

        const match = (resposta || '').match(/\{[\s\S]*\}$/);
        if (match) {
          try {
            const bloco = JSON.parse(match[0]);
            if (typeof bloco?.intensidade === 'number' && bloco.intensidade >= 7) {
              mixpanel.track('Memória Registrada', {
                intensidade: bloco.intensidade,
                emocao_principal: bloco.emocao_principal || 'desconhecida',
                modulo_ativado: bloco.modulo_ativado || 'não informado',
                dominio_vida: bloco.dominio_vida || 'geral',
                padrao_comportamental: bloco.padrao_comportamental || 'não identificado',
              });
            }
          } catch {}
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error('[ChatPage] erro:', err);
        const msg = err?.message || 'Falha ao enviar mensagem.';
        setErroApi(msg);
        mixpanel.track('Eco: Erro ao Enviar Mensagem', {
          userId,
          erro: msg,
          mensagem: (text || '').slice(0, 120),
          timestamp: new Date().toISOString(),
        });
        clearPendingAssistant();
      } finally {
        requestAbortRef.current = null;
        setDigitando(false);
        scrollToBottom(true);
      }
    },
    [
      addMessage,
      clearPendingAssistant,
      commitAssistantMessage,
      digitando,
      gerarMensagemRetorno,
      scrollToBottom,
      setShowQuick,
      updateMessage,
      userId,
      userName,
    ]
  );

  const handlePickSuggestion = useCallback(
    async (s: Suggestion) => {
      setShowQuick(false);
      mixpanel.track('Eco: QuickSuggestion Click', { id: s.id, label: s.label, modules: s.modules });
      const hint =
        (s.modules?.length || s.systemHint)
          ? `${s.modules?.length ? `Ative módulos: ${s.modules.join(', ')}.` : ''}${s.systemHint ? ` ${s.systemHint}` : ''}`.trim()
          : '';
      const userText = `${s.icon ? s.icon + ' ' : ''}${s.label}`;
      await handleSendMessage(userText, hint);
    },
    [handleSendMessage]
  );

  const saudacao = saudacaoDoDiaFromHour(new Date().getHours());
  const openingPrompt = useMemo(
    () => OPENING_VARIATIONS[Math.floor(Math.random() * OPENING_VARIATIONS.length)],
    []
  );

  const streamingMessageId = streamMessageRef.current;
  const lastAssistantId = aiMessages.at(-1)?.id;

  const showInlineTyping = Boolean(digitando && streamingMessageId);

  return (
    <div className="chat-page">
      <GlassToolbar className="mx-auto w-full max-w-chat-container rounded-[28px]">
        <div className="flex items-center gap-3">
          <EcoBubbleIcon size={28} />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted">ECO</span>
            <span className="text-sm font-semibold text-[color:var(--ink)]">{saudacao}, {userName}</span>
          </div>
        </div>
        <div className="hidden sm:block text-sm text-muted">{openingPrompt}</div>
      </GlassToolbar>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        role="feed"
        aria-busy={digitando}
        className="chat-scroller"
      >
        <div
          className="message-list"
          style={virtualizationEnabled ? { height: virtualHeight } : undefined}
        >
          {messages.length === 0 && !erroApi && (
            <motion.div
              className="mx-auto flex min-h-[320px] w-full max-w-chat-container flex-col items-center justify-center gap-6 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              <h2 className="max-w-[30ch] text-3xl font-semibold tracking-tight text-[color:var(--ink)] sm:text-4xl">
                {saudacao}, {userName}
              </h2>
              <p className="max-w-[38ch] text-base text-muted sm:text-lg">{openingPrompt}</p>
            </motion.div>
          )}

          {visibleItems.map((meta) => (
            <MessageRow
              key={meta.message.id}
              meta={meta}
              virtualization={virtualizationEnabled}
              onMeasure={updateMeasurement}
            />
          ))}

          {digitando && !showInlineTyping && (
            <div className="message-row" data-virtual="false">
              <div className="flex justify-center pt-1">
                <EcoBubbleIcon size={28} />
              </div>
              <div className="min-w-0">
                <TypingDots />
              </div>
              <span className="message-row__spacer" aria-hidden />
            </div>
          )}

          {erroApi && (
            <div className="mt-6 flex justify-center">
              <div className="surface-card max-w-sm rounded-3xl px-4 py-3 text-center text-sm font-medium text-rose-500">
                {erroApi}
              </div>
            </div>
          )}

          {showFeedback && lastAssistantId && (
            <div className="mt-6 flex justify-center">
              <FeedbackPrompt
                sessaoId={userId || 'anon'}
                usuarioId={userId || undefined}
                mensagemId={lastAssistantId}
                onSubmitted={() => {
                  setShowFeedback(false);
                  sessionStorage.setItem(FEEDBACK_KEY, '1');
                }}
              />
            </div>
          )}
        </div>

        {showScrollBtn && (
          <div className="scroll-to-bottom">
            <button
              onClick={() => scrollToBottom(true)}
              className="h-10 w-10 rounded-full border border-[rgba(255,255,255,0.6)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] text-[color:var(--ink)] shadow-[var(--shadow-xs)] transition-transform duration-200 ease-out hover:-translate-y-0.5"
              aria-label="Descer para a última mensagem"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="composer-shell">
        <div className="composer-content space-y-4">
          <QuickSuggestions
            visible={showQuick && messages.length === 0 && !digitando && !erroApi}
            onPickSuggestion={handlePickSuggestion}
            rotatingItems={ROTATING_ITEMS}
            rotationMs={5000}
            className="quick-row overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
          />
          <ChatInput
            onSendMessage={(t) => handleSendMessage(t)}
            onMoreOptionSelected={(opt) => {
              if (opt === 'go_to_voice_page') navigate('/voice');
            }}
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
