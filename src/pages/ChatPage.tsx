/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — eco-vibe + glass + saudação limpa + teclado + scroll btn   */
/* -------------------------------------------------------------------------- */

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';

// ❌ Header é renderizado no MainLayout
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import EcoBubbleIcon from '../components/EcoBubbleIcon';
import EcoMessageWithAudio from '../components/EcoMessageWithAudio';
import QuickSuggestions, { Suggestion } from '../components/QuickSuggestions';

import { enviarMensagemParaEco } from '../api/ecoApi';
import { buscarUltimasMemoriasComTags, buscarMemoriasSimilares } from '../api/memoriaApi';

import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { salvarMensagem } from '../api/mensagem';

import { differenceInDays } from 'date-fns';
import { extrairTagsRelevantes } from '../utils/extrairTagsRelevantes';
import mixpanel from '../lib/mixpanel';

import { FeedbackPrompt } from '../components/FeedbackPrompt';
import { getOrCreateSessionId } from '../utils/session';

/* ------------------------- Saudação/despedida regex ------------------------ */
type Msg = { role?: string; content?: string; text?: string; sender?: 'user' | 'eco' };

const MAX_LEN_FOR_GREETING = 80;

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

// ✅ versão enxuta (menos “robotizada”)
const GREET_RE =
  /^(oi+|oie+|ola+|al[oó]+|opa+|salve|eai|falae?|hey+|hi+|hello+|yo+|sup|bom dia|boa tarde|boa noite|tudo bem|td bem|beleza|blz|suave|tranq|tranquilo)([!?.…]*)$/i;

const FAREWELL_RE =
  /^(tchau+|ate logo|ate mais|valeu+|vlw+|obrigad[oa]+|brigad[oa]+|falou+|fui+|bom descanso|durma bem|ate amanha)([!?.…]*)$/i;

const isGreetingShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && GREET_RE.test(t);
};
const isFarewellShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && FAREWELL_RE.test(t);
};
/* -------------------------------------------------------------------------- */

const FEEDBACK_KEY = 'eco_feedback_given';

const saudacaoDoDiaFromHour = (h: number) => {
  if (h < 6) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

/* ====== Frases rotativas (ligadas aos módulos existentes) ====== */
const ROTATING_ITEMS: Suggestion[] = [
  {
    id: 'rot_presenca_scan',
    icon: '🌬️',
    label: 'Vamos fazer um mini-scan de presença agora?',
    modules: ['eco_observador_presente', 'eco_presenca_silenciosa', 'eco_corpo_emocao'],
    systemHint:
      'Conduza um body scan curto (2–3 minutos), com foco gentil em respiração, pontos de contato e 1 pensamento.',
  },
  {
    id: 'rot_kahneman_check',
    icon: '🧩',
    label: 'Quero checar se caí em algum atalho mental hoje',
    modules: [
      'eco_heuristica_ancoragem',
      'eco_heuristica_disponibilidade',
      'eco_heuristica_excesso_confianca',
    ],
    systemHint:
      'Explique heurísticas em linguagem simples, faça 1 pergunta diagnóstica e proponha 1 reframe prático.',
  },
  {
    id: 'rot_vulnerabilidade',
    icon: '💗',
    label: 'Posso explorar coragem & vulnerabilidade em 1 situação',
    modules: ['eco_vulnerabilidade_defesas', 'eco_vulnerabilidade_mitos', 'eco_emo_vergonha_combate'],
    systemHint:
      'Brené Brown: diferencie vulnerabilidade de exposição. Nomeie 1 defesa ativa e proponha 1 micro-ato de coragem.',
  },
  {
    id: 'rot_estoico',
    icon: '🏛️',
    label: 'O que está sob meu controle hoje?',
    modules: ['eco_presenca_racional', 'eco_identificacao_mente', 'eco_fim_do_sofrimento'],
    systemHint:
      'Marco Aurélio: conduza 3 perguntas (controle / julgamento / ação mínima) e feche com 1 compromisso simples.',
  },
  {
    id: 'rot_regressao_media',
    icon: '📉',
    label: 'Talvez ontem foi exceção — quero revisar expectativas',
    modules: ['eco_heuristica_regressao_media', 'eco_heuristica_certeza_emocional'],
    systemHint:
      'Explique regressão à média e convide a recalibrar expectativas com 1 evidência observável para hoje.',
  },
];

/* ====== Variações de abertura (deixa menos “scripted”) ====== */
const OPENING_VARIATIONS = [
  'Pronto para começar?',
  'O que está vivo em você agora?',
  'Quer explorar algum pensamento ou emoção?',
  'Vamos começar de onde você quiser.',
  'Um passo de cada vez: por onde vamos?',
];

const ChatPage: React.FC = () => {
  const { messages, addMessage } = useChat();
  const { userId, userName = 'Usuário', user } = useAuth();
  const navigate = useNavigate();

  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);

  /* 🔹 ESTADO DO FEEDBACK + SESSION ID */
  const [showFeedback, setShowFeedback] = useState(false);
  const sessionId = getOrCreateSessionId();

  /* 🔹 ÚLTIMA MENSAGEM DA ECO E CONTAGEM */
  const aiMessages = (messages || []).filter((m: any) => m.sender === 'eco');
  const lastAi = aiMessages[aiMessages.length - 1];

  /* 🔹 QUICK SUGGESTIONS */
  const [showQuick, setShowQuick] = useState(true);

  /* 🔹 NOVO: controle de scroll/botão */
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const nearBottom = (el: HTMLDivElement, pad = 16) =>
    el.scrollTop + el.clientHeight >= el.scrollHeight - pad;

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

  /* ====================== SCROLL CORE ====================== */

  // Anchor-based scroll (mais confiável em mobile)
  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    const end = endRef.current;
    if (!el || !end) return;

    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

    // espera o DOM assentar antes de rolar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        end.scrollIntoView({ behavior, block: 'end' });
        const at = nearBottom(el, 8);
        setIsAtBottom(at);
        setShowScrollBtn(!at);
      });
    });
  };

  // Auto-scroll quando chegam novas msgs / muda "digitando"
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (nearBottom(el, 120)) {
      scrollToBottom(true);
    }
  }, [messages, digitando]);

  // Observer do fim para detectar se estamos no fundo
  useEffect(() => {
    const root = scrollerRef.current;
    const end = endRef.current;
    if (!root || !end) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setIsAtBottom(visible);
        setShowScrollBtn(!visible);
      },
      { root, threshold: 0.98 }
    );

    io.observe(end);
    return () => io.disconnect();
  }, []);

  // medir input fixo (altura total: quick suggestions + input)
  useEffect(() => {
    if (!inputBarRef.current) return;
    const el = inputBarRef.current;

    const update = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--input-h', `${h}px`);
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

    const onVVChange = () => scrollToBottom(false);

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

  /* ====================== LÓGICA DO CHAT ====================== */

  /* 🔹 FEEDBACK após 3 respostas da ECO (1x por sessão) */
  useEffect(() => {
    const already = sessionStorage.getItem(FEEDBACK_KEY);
    if (!already && aiMessages.length >= 3) {
      setShowFeedback(true);
      mixpanel.track('Feedback Shown', { aiCount: aiMessages.length });
    }
  }, [aiMessages.length]);

  /* 🔹 QUICK SUGESTIONS: esconder quando houver mensagens */
  useEffect(() => {
    if ((messages?.length ?? 0) > 0) setShowQuick(false);
  }, [messages]);

  useEffect(() => {
    const onUserTypes = (ev: Event) => {
      const t = ev.target as HTMLElement | null;
      if (!t) return;
      const isTyping =
        t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.getAttribute('contenteditable') === 'true';
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

  /* ===== helper para sugestões ricas ===== */
  const buildModuleHint = (modules?: string[], extra?: string) => {
    if (!modules?.length && !extra) return '';
    const mod = modules?.length ? `Ative módulos: ${modules.join(', ')}.` : '';
    const tip = extra ? ` ${extra}` : '';
    return `${mod}${tip}`.trim();
  };

  /* ===== handleSendMessage aceita systemHint opcional ===== */
  const handleSendMessage = async (text: string, systemHint?: string) => {
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

      const baseHistory = [...messages, { id: mensagemId, role: 'user', content: trimmed }];

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
        if (systemHint) preSistema.push({ role: 'system', content: systemHint });
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

      const clientHour = new Date().getHours();
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
        } catch {}
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
      // garante que desce após a resposta/typing
      scrollToBottom(true);
    }
  };

  function handleFeedbackSubmitted() {
    sessionStorage.setItem(FEEDBACK_KEY, '1');
    setShowFeedback(false);
  }

  /* ===== quando o usuário toca numa sugestão ===== */
  const handlePickSuggestion = async (s: Suggestion) => {
    setShowQuick(false);
    mixpanel.track('Eco: QuickSuggestion Click', { id: s.id, label: s.label, modules: s.modules });
    const hint = buildModuleHint(s.modules, s.systemHint);
    const userText = `${s.icon ? s.icon + ' ' : ''}${s.label}`;
    await handleSendMessage(userText, hint);
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-eco-vibe">
      {/* SCROLLER */}
      <div
        ref={scrollerRef}
        onScroll={() => {
          const el = scrollerRef.current!;
          const at = nearBottom(el, 16);
          setIsAtBottom(at);
          setShowScrollBtn(!at);
        }}
        className="chat-scroller flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-2 [scrollbar-gutter:stable]"
        style={{
          paddingBottom: 'calc(var(--input-h,72px) + env(safe-area-inset-bottom) + 12px)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
        }}
      >
        <div className="max-w-2xl w-full mx-auto">
          {messages.length === 0 && !erroApi && (
            <motion.div
              className="text-center mb-8 mt-[12svh] md:mt-[14svh] lg:mt-[16svh] px-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
            >
              <div className="flex items-center justify-center gap-2.5">
                <EcoBubbleIcon size={26} className="opacity-0 pointer-events-none" />
                <h2 className="text-3xl md:text-4xl font-light text-gray-800 leading-tight">
                  {saudacao}, {userName}
                </h2>
                <EcoBubbleIcon size={26} className="translate-y-[2px] md:scale-[1.15]" />
              </div>

              <p className="text-base md:text-lg font-light text-slate-500 mt-2">
                {OPENING_VARIATIONS[Math.floor(Math.random() * OPENING_VARIATIONS.length)]}
              </p>
            </motion.div>
          )}

          {erroApi && (
            <div className="glass rounded-xl text-red-600 text-center mb-4 px-4 py-2">{erroApi}</div>
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
                <ChatMessage
                  message={{ id: 'typing', text: '...', sender: 'eco' } as any}
                  isEcoTyping
                />
              </div>
            )}

            {showFeedback && lastAi && (
              <div className="flex justify-center">
                <div
                  className="
                    w-full max-w-[560px] mx-auto
                    glass rounded-2xl
                    px-4 py-3 mt-2
                  "
                >
                  <FeedbackPrompt
                    sessaoId={sessionId}
                    usuarioId={userId || undefined}
                    // @ts-ignore
                    extraMeta={{ ui_message_id: (lastAi as any).id }}
                    onSubmitted={handleFeedbackSubmitted}
                  />
                </div>
              </div>
            )}

            {/* âncora do fim */}
            <div ref={endRef} />
          </div>
        </div>

        {/* BOTÃO “DESCER” */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom(true)}
            className="
              fixed right-4 sm:right-8
              bottom-[calc(var(--input-h,72px)+18px)]
              z-40 h-9 w-9 rounded-full
              glass-soft hover:bg-white/24
              flex items-center justify-center transition
            "
            aria-label="Descer para a última mensagem"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-700">
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* BARRA DE INPUT — FIXA NO RODAPÉ */}
      <div
        ref={inputBarRef}
        className="fixed left-0 right-0 bottom-[max(env(safe-area-inset-bottom),0px)]
                   z-40 px-3 sm:px-6 pb-2 pt-2 glass border-t-0"
      >
        <div className="max-w-2xl mx-auto">
          <QuickSuggestions
            visible={showQuick && messages.length === 0 && !digitando && !erroApi}
            onPickSuggestion={handlePickSuggestion}
            rotatingItems={ROTATING_ITEMS}
            rotationMs={5000}
            className="mt-1 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
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
