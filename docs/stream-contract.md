# Contrato de Streaming da Eco

> Mantra: **1 mensagem → 1 stream → 1 bolha → 1 interação**.

## Fluxo de Requisição

- O envio de mensagens utiliza `POST /api/ask-eco` com SSE habilitado (`Accept: text/event-stream`).
- Cada envio gera um `client_message_id` exclusivo (UUID v4) compartilhado com o backend e utilizado como chave de dedupe.
- Ao disparar um novo envio, o stream anterior é abortado imediatamente (`AbortController: superseded run`). Eventos tardios são descartados e não atualizam a UI.
- Somente um fetch ativo para `/api/ask-eco` é permitido; cliques rápidos reutilizam o envio em voo.

## Manipulação de Chunks

- O frontend cria a bolha de resposta apenas quando o primeiro chunk (`chunk_index === 0`) é confirmado.
- Updates subsequentes utilizam `replace` em vez de criar novas mensagens.
- Identificadores de chunk (`chunk_index`, `delta_id`, `token_index`, etc.) são deduplicados no nível da API (`processEventStream`) e na UI (`useEcoStream`).
- Chunks duplicados ou fora de ordem são ignorados com logs visíveis no modo dev (`🔁 [EcoStream]` / `[useEcoStream]`).

## Estrutura de Eventos

1. `prompt_ready`
2. `first_token`
3. `chunk*`
4. `meta` / `meta_pending`
5. `memory_saved`
6. `latency`
7. `done`

Todos os eventos atualizam `interaction_id` e `message_id` assim que disponíveis para manter Supabase, Mixpanel e sinais passivos sincronizados.

## Supressão de Paralelismo

- `activeStreamRef` guarda o `streamId` atual. Eventos com `streamId` divergente são descartados (stream superseded).
- O estado de envio (`inFlightRef`) bloqueia cliques duplicados enquanto a requisição não retorna.

## Persistência e Analytics

- A tabela `eco_interactions` recebe exatamente uma linha por `client_message_id`.
- O marcador `stream_done` é gravado uma única vez após `done` (ou abort) por stream.
- Não há inserções duplicadas nem erros de chave única.
- Mixpanel recebe os marcadores `prompt_ready`, `first_token` e `done` apenas uma vez por stream.

## Smoke Test Recomendado

1. Enviar três mensagens em sequência rápida.
2. Confirmar três SSEs independentes sem sobreposição.
3. Verificar três bolhas finais únicas e ordenadas.
4. Validar ausência de erros de duplicidade no console e na aba Network.

## Referências Técnicas

- `src/hooks/useEcoStream.ts` — loop principal do chat e gerenciamento de dedupe.
- `src/api/ecoStream.ts` — normalização SSE e filtragem de chunks duplicados.
- `src/api/__tests__/ecoApi.test.ts` — casos de teste cobrindo dedupe de chunks.
- `src/utils/chat/chunkSignals.ts` — utilitários compartilhados para identificar índice/ID de chunk.
