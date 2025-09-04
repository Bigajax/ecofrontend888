/* -------------------------------------------------------------------------- */
/*  ChatPage.tsx — versão ajustada p/ saudação limpa + teclado mobile         */
/*  - Se msg for saudação/despedida curta, NÃO injeta memórias/systems        */
/*  - Scroll estável em mobile (visualViewport + overscroll contain)          */
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

/* ------------------------- Saudação/despedida regex ------------------------ */
// Mesmo espírito do utils/respostaSaudacaoAutomatica.ts (com sufixo opcional “eco”, “@eco”, etc.)
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

const FAREWELL_RE =
  /^(?:tchau+|ate\s+mais|ate\s+logo|valeu+|vlw+|obrigad[oa]+|brigad[oa]+|falou+|fui+|bom\s*descanso|boa\s*noite|durma\s*bem|ate\s*amanha|ate\s*breve|ate)\s*[!?.…]*$/i;

const isGreetingShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && GREET_RE.test(t);
};
const isFarewellShort = (raw: string) => {
  const t = normalize(raw);
  return t.length <= MAX_LEN_FOR_GREETING && FAREWELL_RE.test(t);
};
/* -------------------------------------------------------------------------- */

const ChatPage: React.FC = () => {
  const { messages, addMessage, clearMessages } = useChat();
  const { userId, userName = 'Usuário', signOut, user } = useAuth();
  const navigate = useNavigate();

  const [digitando, setDigitando] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Redireciona se não autenticado + track
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

  const saudacao =
    new Date().getHours() < 12
      ? 'Bom dia'
      : new Date().getHours() < 18
      ? 'Boa tarde'
      : 'Boa noite';
  const mensagemBoasVindas = `${saudacao}, ${userName}`;

  // Mantém scroll no fim quando chegam mensagens
  const scrollToBottom = (smooth = true) => {
    const el = scrollerRef.current;
    if (!el) return;
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(true), 0);
    return () => clearTimeout(t);
  }, [messages, digitando]);

  // Ajuda extra no iOS: quando o teclado muda o viewport, rola pro fim
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;
    const handleVV = () => scrollToBottom(false);
    vv.addEventListener('resize', handleVV);
    vv.addEventListener('scroll', handleVV);
    return () => {
      vv.removeEventListener('resize', handleVV);
      vv.removeEventListener('scroll', handleVV);
    };
  }, []);

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

    if (!trimmed) return;       // ignora vazio
    if (digitando) return;      // evita requisições sobrepostas

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
      // Salva no backend
      const saved = await salvarMensagem({
        usuarioId: userId!,
        conteudo: trimmed,
        sentimento: '',
        salvarMemoria: true,
      });
      const mensagemId = saved?.[0]?.id || userLocalId;

      // Histórico base com a última mensagem do usuário
      const baseHistory = [
        ...messages, // pode estar um "tick" atrasado
        { id: mensagemId, role: 'user', content: trimmed },
      ];

      // Se for saudação/despedida curta, NÃO injeta memórias/systems — deixa o fast-path do backend agir
      const greetingLike = isGreetingShort(trimmed) || isFarewellShort(trimmed);

      let mensagensComContexto: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;

      if (greetingLike) {
        mensagensComContexto = baseHistory.slice(-1).map((m: any) => ({
          role: (m.role as any) || (m.sender === 'eco' ? 'assistant' : 'user'),
          content: m.content || m.text || '',
        }));
      } else {
        // Contexto leve (memórias por similaridade e por tags)
        const tags = extrairTagsRelevantes(trimmed);
        const [similar, porTag] = await Promise.all([
          buscarMemoriasSimilares(trimmed, 2).catch(() => []),
          tags.length ? buscarUltimasMemoriasComTags(userId!, tags, 2).catch(() => []) : Promise.resolve([]),
        ]);

        // merge de memórias (sem duplicar)
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

      const resposta = await enviarMensagemParaEco(mensagensComContexto, userName, userId!);

      // parte textual (sem JSON final, se houver)
      const textoEco = (resposta || '').replace(/\{[\s\S]*?\}$/, '').trim();
      if (textoEco) {
        addMessage({ id: uuidv4(), text: textoEco, sender: 'eco' });
      }

      // bloco técnico para analytics (se veio junto no final)
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
        } catch (e) {
          console.warn('Erro ao extrair bloco técnico para Mixpanel', e);
        }
      }
    } catch (err: any) {
      console.error('[ChatPage] erro:', err);
      setErroApi(err?.message || 'Falha ao enviar mensagem.');
      mixpanel.track('Eco: Erro ao Enviar Mensagem', {
        userId,
        erro: err?.message || 'desconhecido',
        mensagem: trimmed,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setDigitando(false);
      setTimeout(() => scrollToBottom(true), 0);
    }
  };

  return (
    <div className="w-full min-h-[100svh] flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
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

      {/* SCROLLER: padding-bottom reserva espaço p/ a barra de input (var --input-h) + safe area */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 pt-2"
        style={{
          paddingBottom: 'calc(var(--input-h,72px) + env(safe-area-inset-bottom) + 12px)',
          WebkitOverflowScrolling: 'touch',
          scrollPaddingBottom: '12px',
          overscrollBehaviorY: 'contain', // evita “puxões” em mobile
        }}
      >
        <div className="max-w-2xl w-full mx-auto">
          {messages.length === 0 && !erroApi && (
            <motion.div
              className="text-center text-gray-600 mb-16 mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-light text-gray-600">
                {mensagemBoasVindas}
              </h2>
              <p className="text-base md:text-lg font-light text-gray-400 mt-2">
                Aqui, você se escuta.
              </p>
            </motion.div>
          )}

          {erroApi && (
            <div className="text-red-500 text-center mb-4">Erro: {erroApi}</div>
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
                {/* bolha com indicador de digitação */}
                <ChatMessage message={{ id: 'typing', text: '...', sender: 'eco' } as any} isEcoTyping />
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>
      </div>

      {/* BARRA DE INPUT: sticky + safe-area. Não é fixed, então não “corta” o conteúdo. */}
      <div className="sticky bottom-[max(env(safe-area-inset-bottom),0px)] z-40 px-3 sm:px-6 pb-2 pt-1 bg-gradient-to-t from-[rgba(248,245,240,0.92)] to-transparent backdrop-blur-sm">
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
