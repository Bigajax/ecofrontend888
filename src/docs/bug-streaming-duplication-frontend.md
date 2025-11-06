# Bug: Duplicação de mensagens no streaming SSE (frontend)

## Resumo rápido
- **Sintoma**: Durante o chat da Eco, trechos como “ok ok” ou “OOOi, rafael! OOOi, rafael!” apareciam quando a stream SSE entregava o mesmo delta duas vezes.
- **Causa raiz**: `useEcoStream` anexava todo texto recebido sem rastrear qual `chunk_index` (ou identificador similar) já havia sido consumido. Quando o backend replicava o primeiro delta em `first_token` e `chunk`, ou quando o StrictMode registrava dois listeners, os mesmos bytes eram adicionados novamente. Além disso, `extractEventText` acabava transformando payloads inteiros em strings quando não encontrava delta explícito.
- **Fix aplicado**: O hook agora mantém um `AbortController` exclusivo por stream, abortando listeners anteriores, e guarda um conjunto de identificadores de chunk (index/id/cursor) para ignorar repetições. Também removemos o fallback que serializava objetos inteiros, preservando apenas texto real.

## Sequência de eventos (quando o bug aparecia)
1. O backend envia `first_token` com `delta.index = 0`.
2. Em seguida, um evento `chunk` com o mesmo payload chega (retry ou espelhamento).
3. Sem deduplicação, `appendMessage()` concatena as duas entradas, duplicando o texto na mensagem em tela.
4. Quando StrictMode monta/desmonta rapidamente, dois listeners ativos tratam o mesmo evento, agravando a repetição.

## Contramedidas implementadas
- Abortamos qualquer stream anterior antes de iniciar uma nova (`activeStreamRef`).
- A cada delta, geramos um identificador baseado em `delta.chunk_index`, `delta.index`, `delta.id`, etc. Deltas repetidos são descartados silenciosamente (apenas logados em DEV).
- `extractEventText()` ignora o fallback que convertia o payload JSON inteiro em string, evitando lixo textual quando não há delta.
- Os logs de desenvolvimento (`console.debug`) mostram `type`, `identifier` e `chunk` para inspecionar a ordem real dos eventos durante testes com mensagens como “oi oi oi”.

## Como validar
1. Abrir o chat em modo DEV e enviar “oi” repetidas vezes.
2. Observar no console a sequência `first_token` → `chunk` com o mesmo `identifier`; apenas o primeiro deve ser aplicado.
3. Confirmar que a UI exibe o texto correto, sem duplicações, e que a stream encerra com `AbortController` liberado ao finalizar a resposta.

## Próximos passos sugeridos
- Considerar propagar `chunk_index` explicitamente a partir do backend para eliminar qualquer dedupe heurístico.
- Adicionar teste de integração que simule eventos duplicados para garantir que futuros refactors preservem o comportamento.
