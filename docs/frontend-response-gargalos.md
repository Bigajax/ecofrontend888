# Documentação do fluxo do front-end para diagnóstico de gargalos

Este guia descreve como a Eco Web monta uma resposta no chat e aponta os principais pontos
onde o tempo de resposta pode aumentar. Use-o para investigar reclamações de lentidão ou
para priorizar melhorias de performance.

## 1. Captura do input e controles de uso

1. O `ChatInput` envia o texto para `handleSendMessage`, que aplica as regras de uso de
   convidados antes de prosseguir. Visitantes acima do limite abrem o `LoginGateModal`
   e não chegam às chamadas de rede.【F:src/pages/ChatPage.tsx†L64-L138】【F:src/pages/ChatPage.tsx†L244-L284】
2. O hook `useEcoStream` ignora mensagens vazias ou repetidas enquanto o assistente ainda
   está digitando (`digitando`). Ele registra o envio com Mixpanel, adiciona a mensagem
   localmente para manter o chat responsivo e dispara o scroll automático.【F:src/hooks/useEcoStream.ts†L60-L116】

**Bottleneck típico:** usuários convidados com bloqueio de envio podem interpretar a ausência
   de resposta como lentidão. Confirme os limites do `guestGate` antes de investigar a camada
   de rede.

## 2. Persistência e enriquecimento de contexto

1. Quando o usuário está autenticado, `useEcoStream` persiste a mensagem em Supabase e
   substitui o `id` local assim que recebe o valor definitivo do banco.【F:src/hooks/useEcoStream.ts†L118-L170】
2. Em paralelo, o hook busca memórias semelhantes (k=3) e por tags, com _timeout_ de 1,5 s
   para cada chamada. Em caso de atraso, ele retorna listas vazias e registra o evento no
   console no modo desenvolvimento. O tempo total do bloco de contexto é medido e anexado às
   métricas de Mixpanel.【F:src/hooks/useEcoStream.ts†L172-L235】【F:src/hooks/useEcoStream.ts†L247-L314】
3. As memórias retornadas são deduplicadas, formatadas em texto e anexadas como mensagens do
   tipo `system`, junto com `systemHint`, retornos celebratórios e a janela das últimas três
   interações.【F:src/hooks/useEcoStream.ts†L316-L357】

**Bottleneck típico:** se as requisições de memória excedem 1,5 s os contextos deixam de ser
   usados, reduzindo a qualidade. O campo `context_fetch_duration_ms` nas métricas indica o
   atraso acumulado e `context_fetch_*_timed_out` mostra qual etapa expirou.

## 3. Montagem do prompt e fluxo de _streaming_

1. O pedido ao backend inicia quando as memórias são preparadas. O hook mantém referências
   para a mensagem do assistente (`ensureEcoMessage` e `patchEcoMessage`) e controla quando
   o placeholder aparece no chat.【F:src/hooks/useEcoStream.ts†L359-L438】
2. Os _handlers_ do `EcoEventStream` registram marcos de tempo (`promptReadyAt`, `firstTokenAt`,
   `doneAt`), atualizam o texto em tempo real e liberam o estado de digitação assim que o
   primeiro conteúdo significativo chega. Eventos de metadados e memórias também alimentam o
   Mixpanel.【F:src/hooks/useEcoStream.ts†L440-L575】
3. Ao final da transmissão o hook envia métricas consolidadas (`Eco: Stream TTFB`,
   `Eco: Stream First Token Latency`), armazena metadados da resposta e dispara celebrações
   como `celebrateFirstMemory` quando necessário.【F:src/hooks/useEcoStream.ts†L512-L575】【F:src/hooks/useEcoStream.ts†L599-L667】

**Bottleneck típico:** atrasos entre `promptReadyAt` e `firstTokenAt` representam tempo de
   espera pelo primeiro token. A métrica `eco_first_token_latency_ms` identifica gargalos no
   backend ou no transporte de SSE.

## 4. Renderização e experiência do usuário

1. O `ChatPage` mantém o scroll estável com `useChatScroll`, exibindo o botão flutuante
   apenas quando o usuário está longe do final do chat. Isto evita repaints desnecessários
   durante o streaming.【F:src/pages/ChatPage.tsx†L88-L115】【F:src/pages/ChatPage.tsx†L146-L242】
2. Enquanto o backend responde, `TypingDots` aparece somente se não houver placeholder vazio.
   Assim, o usuário percebe progresso mesmo quando o primeiro token demora a chegar.【F:src/pages/ChatPage.tsx†L188-L239】
3. Após a resposta, o bloco de feedback, quick suggestions e o `LoginGateModal` podem ser
   reabertos. Esses elementos ficam fora do fluxo principal para não bloquear o streaming.【F:src/pages/ChatPage.tsx†L240-L302】

**Bottleneck típico:** se `digitando` permanece `true` após `onFirstToken`, verifique se há
   espaços em branco nos primeiros _chunks_. O placeholder `' '` impede que o loader suma antes
do texto real.【F:src/hooks/useEcoStream.ts†L470-L526】

## 5. Checklist para investigação

- Verifique os eventos `Eco: Stream TTFB` e `Eco: Stream First Token Latency` no Mixpanel para
  saber se o atraso vem do servidor ou do navegador.【F:src/hooks/useEcoStream.ts†L512-L575】
- Compare `context_fetch_duration_ms` com o tempo total de resposta para medir o impacto das
  memórias.【F:src/hooks/useEcoStream.ts†L497-L575】
- Observe os _logs_ `[ChatPage] Eco stream markers` no console para uma visão imediata dos
  tempos de prompt, primeiro token e conclusão.【F:src/hooks/useEcoStream.ts†L500-L575】
- Em ambiente convidado, confirme `guestGate.inputDisabled` e o número de interações antes
  de concluir que há lentidão real.【F:src/pages/ChatPage.tsx†L64-L138】【F:src/pages/ChatPage.tsx†L244-L284】

Seguindo estas etapas é possível isolar rapidamente se o gargalo está na captura do input,
nas integrações de contexto ou no fluxo de _streaming_ com o backend.
