# Fluxo do `useEcoStream` e ponto de falha atual

## 1. Importação e inicialização
1. O hook `useEcoStream` importa o cliente Supabase logo no topo do arquivo (`import { supabase } from '../lib/supabaseClient'`).【F:src/hooks/useEcoStream.ts†L1-L14】
2. O módulo `supabaseClient` lê as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no momento da importação e passa os valores para `createClient` imediatamente.【F:src/lib/supabaseClient.ts†L1-L6】
3. No ambiente atual de testes essas variáveis não estão definidas, portanto `supabaseUrl` e `supabaseAnonKey` recebem `undefined`. Quando `createClient` é chamado com esses valores, a biblioteca do Supabase lança o erro `supabaseUrl is required.` antes mesmo do hook ser executado.【85f38a†L1-L17】

**Conclusão:** a falha acontece ainda na fase de importação: como `supabase` não pode ser criado sem as variáveis, qualquer teste que importe `useEcoStream` cai imediatamente nesse erro. O fluxo interno do hook nem chega a rodar.

## 2. Fluxo esperado do `handleSendMessage`
Mesmo que atualmente o código não avance por causa do erro acima, vale detalhar o caminho que seria seguido com as variáveis corretas:

1. `handleSendMessage` é memoizado com `useCallback` e recebe o texto digitado e, opcionalmente, uma dica de sistema (`systemHint`).【F:src/hooks/useEcoStream.ts†L100-L116】【F:src/hooks/useEcoStream.ts†L200-L214】
2. O texto é normalizado em `raw` e `trimmed`; mensagens vazias ou envios enquanto já há requisições em voo são ignorados.【F:src/hooks/useEcoStream.ts†L214-L223】
3. O estado local é atualizado para indicar que a Eco está "digitando" (`setDigitando(true)`), que existe uma requisição em andamento (`setIsSending(true)`) e que não há erro atual (`setErroApi(null)`).【F:src/hooks/useEcoStream.ts†L225-L229】
4. O hook tenta obter a sessão Supabase atual para definir `authUserId` e descobrir se a mensagem deve ser persistida (`shouldPersist`). Também determina o `analyticsUserId` usado nas métricas.【F:src/hooks/useEcoStream.ts†L231-L242】
5. Um `AbortController` é preparado para cancelar requisições anteriores, e a mensagem do usuário recebe um `uuid` e é inserida otimisticamente no estado via `addMessage` e `setMessages`. O scroll é forçado para o fim.【F:src/hooks/useEcoStream.ts†L244-L265】
6. O fluxo coleta metadados: registra o envio no Mixpanel, tira uma fotografia das mensagens atuais (`messagesSnapshot`) e prepara variáveis auxiliares para métricas, placeholder da Eco e agregação de resposta.【F:src/hooks/useEcoStream.ts†L267-L351】
7. Para usuários autenticados (`shouldPersist === true`), o texto é salvo no Supabase e o ID definitivo substitui o UUID otimista; em paralelo, o hook busca memórias semelhantes e por tag com timeout de 3 s. Cada uma dessas chamadas ajusta `contextFetchDurationMs` e flags de timeout para alimentar as métricas posteriores.【F:src/hooks/useEcoStream.ts†L353-L422】【F:src/hooks/useEcoStream.ts†L424-L478】
8. Com memórias e histórico montados, `enviarMensagemParaEco` é chamado primeiro em modo SSE; se der erro de rede/CORS, o código cai no fallback JSON. Os handlers atualizam a mensagem placeholder, coletam `metadata`, tokens, latência e finalizam os estados assim que a Eco conclui a resposta.【F:src/hooks/useEcoStream.ts†L480-L740】【F:src/hooks/useEcoStream.ts†L780-L873】
9. No final, o texto agregado é consolidado, metadados são persistidos no estado e as métricas finais são enviadas. Se o servidor não devolve texto, o hook mostra um toast amigável e registra o aviso.【F:src/hooks/useEcoStream.ts†L820-L873】【F:src/hooks/useEcoStream.ts†L875-L925】

Esse roteiro evidencia que basta disponibilizar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou adaptar o cliente para lidar com a ausência delas) para que o fluxo inteiro funcione como esperado.
