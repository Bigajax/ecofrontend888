/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — white + saudação limpa + teclado mobile                    */
/*  - Greeting/despedida curtas: sem memórias/systems                         */
/*  - Scroll estável (visualViewport + overscroll contain)                    */
/*  - Envia clientHour + clientTz p/ backend                                  */
/*  - Boas-vindas apenas como texto                                           */
/*  - Mede barra de input e seta --input-h                                    */
/*  - 🔹 Feedback minimalista (glass) após 3 respostas da ECO                 */
/* -------------------------------------------------------------------------- */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';

import Header from '../components/Header';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import EcoBubbleIcon from '../components/EcoBubbleIcon';
import EcoMessageWithAudio from '../components/EcoMessageWithAudio';

import { enviarMensagemParaEco } from '../api/ecoApi';
import {
  buscarUltimasMemoriasComTags,
  buscarMemoriasSimilares,
} from '../api/memoriaApi';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { salvarMensagem } from '../api/mensagem';

import { differenceInDays } from 'date-fns';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import mixpanel from '../lib/mixpanel';

/* 🔹 IMPORTS DO FEEDBACK */
import { FeedbackPrompt } from '../components/FeedbackPrompt';
import { getOrCreateSessionId } from '../utils/session';

/* ------------------------- Saudação/despedida regex ------------------------ */
type Msg = { role?: string; content?: string; text?: string; sender?: 'user' | 'eco' };

const MAX_LEN_FOR_GREETING = 64;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const GREET_RE =
  /^(?:oi+|oie+|ola+|alo+|opa+|salve|e\s*a[ei]|eai|eae|fala(?:\s*ai)?|falae|hey+|hi+|hello+|yo+|sup|bom\s*dia+|boa\s*tarde+|boa\s*noite+|boa\s*madrugada+|good\s*(?:morning|afternoon|evening|night)|tudo\s*(?:bem|bom|certo)|td\s*bem|beleza|blz|suave|de\s*boa|tranq(?:s)?|tranquilo(?:\s*ai)?|como\s*(?:vai|vc\s*esta|voce\s*esta|ce\s*ta|c[eu]\s*ta))(?:[\s,]*(?:@?eco|eco|bot|assistente|ai|chat))?\s*[!?.…]*$/i;

// "boa noite" removido da despedida para não conflitar com saudação noturna
const FAREWELL_RE =
  /^(?:tchau+|ate\s+mais|ate\s+logo|valeu+|vlw+|obrigad[oa]+|brigad[oa]+|falou+|fui+|bom\s*descanso|durma\s*bem|ate\s*amanha|ate\s*breve|ate)\s*[!?.…]*$/i;

const isGreetingShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && GREET_RE.test(t);
};
const isFarewellShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && FAREWELL_RE.test(t);
};
/* -------------------------------------------------------------------------- */

/* 🔹 CHAVE PARA NÃO REPETIR O FEEDBACK NA MESMA SESSÃO */
const FEEDBACK_KEY = 'eco_feedback_given';

/* 🔹 Saudação coerente com o backend */
const saudacaoDoDiaFromHour = (h: number) => {
  if (h < 6) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const ChatPage: React.FC = () => {
  const { messages, addMessage, clearMessages } = useChat();
  const { userId, userName = 'Usuário', signOut, user } = useAuth();
  const navigate = useNavigate();

  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null); // mede barra sticky

  /* 🔹 ESTADO DO FEEDBACK + SESSION ID */
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionId = getOrCreateSessionId();

  /* 🔹 ÚLTIMA MENSAGEM DA ECO E CONTAGEM */
  const aiMessages = (messages || []).filter((m: any) => m.sender === 'eco');
  const lastAi = aiMessages[aiMessages.length - 1];

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

  const clientHourNow = new Date().getHours();
  const saudacao = saudacaoDoDiaFromHour(clientHourNow);
  const mensagemBoasVindas = `${saudacao}, ${userName}`;

  // scrollToBottom mais robusto (dois frames no iOS)
  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    el.scrollTo({ top: el.scrollHeight, behavior });
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  };

  // Reagir a mudanças de mensagens/estado de digitação
  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(true), 0);
    return () => clearTimeout(t);
  }, [messages, digitando]);

  // Medir a barra sticky e setar --input-h dinamicamente
  useEffect(() => {
    if (!inputBarRef.current) return;
    const el = inputBarRef.current;

    const update = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--input-h', `${h}px`);
      // garantir que o fundo do chat respeite a nova altura
      scrollToBottom(false);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // iOS/Android teclado + visualViewport
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;

    const handleFocusIn = () => document.body.classList.add('keyboard-open');
    const handleFocusOut = () => document.body.classList.remove('keyboard-open');

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    const onVVChange = () => {
      // pequeno atraso evita "pulos" no Safari
      setTimeout(() => scrollToBottom(false), 30);
    };

    if (vv) {
      vv.addEventListener('resize', onVVChange);
      vv.addEventListener('scroll', onVVChange);
    }

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (vv) {
        vv.removeEventListener('resize', onVVChange);
        vv.removeEventListener('scroll', onVVChange);
      }
    };
  }, []);

  /* 🔹 MOSTRAR FEEDBACK APÓS 3 RESPOSTAS DA ECO (1x por sessão) */
  useEffect(() => {
    const already = sessionStorage.getItem(FEEDBACK_KEY);
    if (!already && aiMessages.length >= 3) {
      setShowFeedback(true);
      mixpanel.track('Feedback Shown', { aiCount: aiMessages.length });
    }
  }, [aiMessages.length]);

  const gerarMensagemRetorno = (mem: any): string | null => {
    if (!mem) return null;
    const dias = differenceInDays(new Date(), new Date(mem.created_at));
    if (dias === 0) return null;
    const resumo = mem.resumo_eco || 'algo que foi sentido';
    return `O usuário retorna após ${dias} dias. Na última interação significativa, compartilhou: “${resumo}”. Use isso para acolher o reencontro com sensibilidade.`;
  };

  const handleSendMessage = async (text: string) => {
    const raw = text ?? '';
    const trimmed = raw.trim();
    if (!trimmed || digitando) return;

    setDigitando(true);
    setErroApi(null);

    const userLocalId = uuidv4();
    addMessage({ id: userLocalId, text: trimmed, sender: 'user' });

    mixpanel.track('Eco: Mensagem Enviada', {
      userId,
      userName,
      mensagem: trimmed,
      timestamp: new Date().toISOString(),
    });

    try {
      const saved = await salvarMensagem({
        usuarioId: userId!,
        conteudo: trimmed,
        sentimento: '',
        salvarMemoria: true,
      });
      const mensagemId = saved?.[0]?.id || userLocalId;

      const baseHistory = [
        ...messages,
        { id: mensagemId, role: 'user', content: trimmed },
      ];

      const greetingLike = isGreetingShort(trimmed) || isFarewellShort(trimmed);

      let mensagensComContexto: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

      if (greetingLike) {
        mensagensComContexto = baseHistory.slice(-1).map((m: any) => ({
          role: (m.role as any) || (m.sender === 'eco' ? 'assistant' : 'user'),
          content: m.content || m.text || '',
        }));
      } else {
        const tags = extrairTagsRelevantes(trimmed);
        const [similar, porTag] = await Promise.all([
          buscarMemoriasSimilares(trimmed, 2).catch(() => []),
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
            return `(${data}) ${m.resumo_eco}${tgs}`;
          })
          .join('\n');

        const memSignif = (mems || []).find((m: any) => (m.intensidade ?? 0) >= 7);
        const retorno = gerarMensagemRetorno(memSignif);

        const preSistema: any[] = [];
        if (retorno) preSistema.push({ role: 'system', content: retorno });
        if (ctxMems) preSistema.push({ role: 'system', content: `Memórias recentes relevantes:\n${ctxMems}` });

        const janelaHistorico = baseHistory.slice(-3);

        mensagensComContexto = [
          ...preSistema,
          ...janelaHistorico.map((m: any) => ({
            role: (m.role as any) || (m.sender === 'eco' ? 'assistant' : 'user'),
            content: m.content || m.text || '',
          })),
        ];
      }

      // Hora + timezone do cliente
      const clientHour = new Date().getHours();
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone; // ex.: "America/Sao_Paulo"

      const resposta = await enviarMensagemParaEco(
        mensagensComContexto,
        userName,
        userId!,
        clientHour,
        clientTz
      );

      const textoEco = (resposta || '').replace(/\{[\s\S]*?\}$/, '').trim();
      if (textoEco) addMessage({ id: uuidv4(), text: textoEco, sender: 'eco' });

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
        } catch { /* no-op */ }
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
    } finally {
      setDigitando(false);
      setTimeout(() => scrollToBottom(true), 0);
    }
  };

  /* 🔹 CALLBACK QUANDO ENVIAR O FEEDBACK */
  function handleFeedbackSubmitted() {
    sessionStorage.setItem(FEEDBACK_KEY, '1');
    setShowFeedback(false);
  }

  return (
    <div className="w-full min-h-[100svh] flex flex-col bg-white">
      <Header
        title="ECO"
        showBackButton={false}
        onOpenMemoryHistory={() => navigate('/memory')}
        onLogout={async () => {
          await signOut();
          clearMessages();
          navigate('/login');
        }}
      />

      {/* SCROLLER */}
      <div
        ref={scrollerRef}
        className="chat-scroller flex-1 overflow-y-auto px-3 sm:px-6 pt-2"
        style={{
          paddingBottom: 'calc(var(--input-h,72px) + env(safe-area-inset-bottom) + 12px)',
          WebkitOverflowScrolling: 'touch',
          scrollPaddingBottom: '12px',
          overscrollBehaviorY: 'contain',
        }}
      >
        <div className="max-w-2xl w-full mx-auto">
          {messages.length === 0 && !erroApi && (
            <motion.div
              className="text-center mb-16 mt-12 px-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="text-3xl md:text-4xl font-light text-gray-800">{mensagemBoasVindas}</h2>
              <p className="text-base md:text-lg font-light text-gray-600 mt-2">Aqui, você se escuta.</p>
            </motion.div>
          )}

          {erroApi && (
            <div className="glass-panel text-red-600 text-center mb-4 px-4 py-2">{erroApi}</div>
          )}

          <div className="w-full space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'eco' && (
                  <div className="mr-2 mt-1.5">
                    <EcoBubbleIcon />
                  </div>
                )}

                {m.sender === 'eco' ? (
                  <EcoMessageWithAudio message={m as any} />
                ) : (
                  <ChatMessage message={m} />
                )}
              </div>
            ))}

            {digitando && (
              <div className="flex items-start justify-start">
                <div className="mr-2 mt-1.5">
                  <EcoBubbleIcon />
                </div>
                <ChatMessage message={{ id: 'typing', text: '...', sender: 'eco' } as any} isEcoTyping />
              </div>
            )}

            {/* 🔹 BALÃO DE FEEDBACK (central, glass), aparece logo abaixo da ÚLTIMA resposta da ECO */}
            {showFeedback && lastAi && (
              <div className="flex justify-center">
                <div
                  className="
                    w-full max-w-[560px] mx-auto
                    rounded-2xl border border-gray-200/60
                    bg-white/50 backdrop-blur-md shadow-sm
                    px-4 py-3 mt-2
                  "
                >
                  <FeedbackPrompt
                    sessaoId={sessionId}
                    usuarioId={userId || undefined}
                    /* 🔧 Não enviamos mensagemId para evitar erro de FK enquanto a msg da ECO não estiver no banco */
                    // mensagemId={(lastAi as any).id}
                    /* opcional: meta extra com id de UI */
                    // @ts-ignore - se seu componente aceitar extraMeta, ele usará isso
                    extraMeta={{ ui_message_id: (lastAi as any).id }}
                    onSubmitted={handleFeedbackSubmitted}
                  />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>
      </div>

      {/* BARRA DE INPUT: sticky com hairline no topo */}
      <div
        ref={inputBarRef}
        className="sticky bottom-[max(env(safe-area-inset-bottom),0px)] z-40 px-3 sm:px-6 pb-2 pt-2
                   bg-white/80 backdrop-blur-md border-t border-gray-200/80
                   supports-[backdrop-filter:blur(0)]:bg-white/95"
      >
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            onMoreOptionSelected={(opt) => {
              if (opt === 'go_to_voice_page') navigate('/voice');
            }}
            onSendAudio={() => console.log('Áudio enviado')}
            disabled={digitando}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
