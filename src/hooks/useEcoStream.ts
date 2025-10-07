import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { enviarMensagemParaEco, EcoEventHandlers } from '../api/ecoApi';
import { buscarUltimasMemoriasComTags, buscarMemoriasSemelhantesV2 } from '../api/memoriaApi';
import { salvarMensagem } from '../api/mensagem';
import { celebrateFirstMemory } from '../utils/celebrateFirstMemory';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import { extractDeepQuestionFlag } from '../utils/chat/deepQuestion';
import { gerarMensagemRetorno } from '../utils/chat/memory';
import type { Message as ChatMessageType } from '../contexts/ChatContext';
import mixpanel from '../lib/mixpanel';
import { useLLMSettings } from '../contexts/LLMSettingsContext';

interface UseEcoStreamOptions {
  messages: ChatMessageType[];
  addMessage: (message: ChatMessageType) => void;
  setMessages: Dispatch<SetStateAction<ChatMessageType[]>>;
  userId: string;
  userName: string;
  sessionId: string;
  scrollToBottom: (smooth?: boolean) => void;
  isAtBottom: boolean;
}

type BuscarSimilaresResult = Awaited<ReturnType<typeof buscarMemoriasSemelhantesV2>>;
type BuscarPorTagResult = Awaited<ReturnType<typeof buscarUltimasMemoriasComTags>>;

const isDev = Boolean((import.meta as any)?.env?.DEV);
const CONTEXT_FETCH_TIMEOUT_MS = 1500;

const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => T | PromiseLike<T>,
): Promise<T> => {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, ms);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(onTimeout());
      });
  });
};

export const useEcoStream = ({
  messages,
  addMessage,
  setMessages,
  userId,
  userName,
  sessionId,
  scrollToBottom,
  isAtBottom,
}: UseEcoStreamOptions) => {
  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const messagesRef = useRef(messages);
  const isAtBottomRef = useRef(isAtBottom);
  const { autonomy } = useLLMSettings();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const handleSendMessage = useCallback(
    async (text: string, systemHint?: string) => {
      const raw = text ?? '';
      const trimmed = raw.trim();
      if (!trimmed || digitando) return;

      setDigitando(true);
      setErroApi(null);

      const userLocalId = uuidv4();
      addMessage({ id: userLocalId, text: trimmed, sender: 'user' });

      requestAnimationFrame(() => scrollToBottom(true));

      mixpanel.track('Eco: Mensagem Enviada', {
        userId,
        userName,
        mensagem: trimmed,
        timestamp: new Date().toISOString(),
      });

      const messagesSnapshot = messagesRef.current;

      let metricsReported = false;
      let doneAt: number | undefined;
      let logAndSendStreamMetrics: (
        outcome: 'success' | 'error',
        extra?: Record<string, unknown>
      ) => void = () => {};
      let resetEcoMessageTracking = () => {};

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

        const contextFetchStartedAt = getNow();
        let contextFetchDurationMs: number | null = null;
        let similaresTimedOut = false;
        let tagsTimedOut = false;

        const buscarSimilaresPromise = withTimeout<BuscarSimilaresResult>(
          buscarMemoriasSemelhantesV2(trimmed, {
            k: 3,
            threshold: 0.12,
            usuario_id: userId!,
          }).catch(() => [] as BuscarSimilaresResult),
          CONTEXT_FETCH_TIMEOUT_MS,
          () => {
            similaresTimedOut = true;
            if (isDev) {
              console.warn(
                `[ChatPage] Timeout de ${CONTEXT_FETCH_TIMEOUT_MS}ms ao buscar memórias semelhantes`,
              );
            }
            return [];
          },
        );

        const buscarPorTagPromise = tags.length
          ? withTimeout<BuscarPorTagResult>(
              buscarUltimasMemoriasComTags(userId!, tags, 2).catch(
                () => [] as BuscarPorTagResult,
              ),
              CONTEXT_FETCH_TIMEOUT_MS,
              () => {
                tagsTimedOut = true;
                if (isDev) {
                  console.warn(
                    `[ChatPage] Timeout de ${CONTEXT_FETCH_TIMEOUT_MS}ms ao buscar memórias por tag`,
                  );
                }
                return [];
              },
            )
          : Promise.resolve<BuscarPorTagResult>([]);

        const [similar, porTag] = await Promise.all([
          buscarSimilaresPromise,
          buscarPorTagPromise,
        ]);

        contextFetchDurationMs = Math.max(
          Math.round(getNow() - contextFetchStartedAt),
          0,
        );
        const contextTimedOut = similaresTimedOut || tagsTimedOut;

        const baseHistory = [...messagesSnapshot, { id: userLocalId, role: 'user', content: trimmed }];

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

        const requestStartedAt = getNow();
        let promptReadyAt: number | undefined;
        let firstTokenAt: number | undefined;
        doneAt = undefined;
        metricsReported = false;

        logAndSendStreamMetrics = (
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
            sessionId,
            outcome,
            mensagem_id: persistedMensagemId,
            mensagem_local_id: userLocalId,
            latency_from_stream_ms:
              typeof latencyFromStream === 'number' ? latencyFromStream : null,
            latency_source: latencySource,
            ...(contextFetchDurationMs !== null
              ? { context_fetch_duration_ms: contextFetchDurationMs }
              : {}),
            ...(contextTimedOut ? { context_fetch_timed_out: true } : {}),
            ...(similaresTimedOut ? { context_fetch_similares_timed_out: true } : {}),
            ...(tagsTimedOut ? { context_fetch_tags_timed_out: true } : {}),
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

        resetEcoMessageTracking = () => {
          ecoMessageId = null;
          ecoMessageIndex = null;
        };

        const syncScroll = () => {
          if (isAtBottomRef.current) {
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
          handlers,
          { autonomy }
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
                sessionId,
                mensagemId: mensagemIdFinal,
                metadata: finalMixpanelMetadata,
              });
            })
            .catch(() => {
              mixpanel.track('Eco: Resposta Metadata', {
                userId,
                sessionId,
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
          const now =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
              ? performance.now()
              : Date.now();
          if (doneAt === undefined) {
            doneAt = now;
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
    },
    [
      addMessage,
      digitando,
      isAtBottom,
      scrollToBottom,
      setMessages,
      sessionId,
      userId,
      userName,
      autonomy,
    ]
  );

  return { handleSendMessage, digitando, erroApi, setErroApi } as const;
};
