# Root Cause Summary
- `processEventStream` emite o mesmo trecho textual tanto em `first_token` quanto em `chunk` quando o backend replica o primeiro delta; o hook trata ambos como deltas independentes e concatena os dois sem checar índice.
- `appendMessage` simplesmente encadeia strings sanitizadas, então qualquer replay de delta (primeiro token, retry do SSE ou StrictMode refazendo o handler) duplica o texto recebido. 【F:src/hooks/useEcoStream.ts†L712-L725】【F:src/api/ecoStream.ts†L463-L546】
- Quando falta `delta` o fallback `extractEventText` serializa o payload inteiro (`flattenToString(payload)`), resultando em trechos "grudados" ou garbled porque objetos viram JSON contínuo sem separador. 【F:src/hooks/useEcoStream.ts†L741-L759】

# Onde ocorre
- `src/hooks/useEcoStream.ts` — `appendMessage`, `handleFirstTokenEvent` e `handleChunkEvent` chamam o append sem deduplicação, e `extractEventText` aceita qualquer payload/texto, inclusive respostas completas. 【F:src/hooks/useEcoStream.ts†L712-L855】
- `src/api/ecoStream.ts` — `processEventStream` converte eventos `response.*` em `first_token`/`chunk` mas não repassa nenhum `chunk_index` ou id único ao handler, deixando o front sem contexto para descartar repetições. 【F:src/api/ecoStream.ts†L463-L546】
- `src/api/askEcoResponse.ts` — `collectTexts` agrega todos os campos textuais do payload; se o backend envia tanto `delta` quanto `text`, o mesmo conteúdo aparece duas vezes no array e volta duplicado ao cliente. 【F:src/api/askEcoResponse.ts†L1-L86】

# Provas rápidas
- [ ] Adicionar `console.debug('[chunk]', event.type, event.payload?.delta?.index, extractEventText(event))` em `handleFirstTokenEvent`/`handleChunkEvent` para confirmar que o mesmo índice/texto chega duas vezes. 【F:src/hooks/useEcoStream.ts†L824-L855】
- [ ] Logar `seenChunks.size` dentro de um Set temporário no `appendMessage` para mostrar que cada replay incrementa o contador. 【F:src/hooks/useEcoStream.ts†L712-L725】
- [ ] No parser (`processEventStream`), logar `texts` antes de `join('')` para visualizar que `collectTexts` traz entradas repetidas (`delta` + `text`). 【F:src/api/ecoStream.ts†L463-L546】

# Proposed Fix
```diff
diff --git a/src/hooks/useEcoStream.ts b/src/hooks/useEcoStream.ts
@@
-  const abortControllerRef = useRef<AbortController | null>(null);
+  const abortControllerRef = useRef<AbortController | null>(null);
+  const activeStreamRef = useRef<{ controller: AbortController | null; streamId?: string }>(
+    { controller: null, streamId: undefined },
+  );
@@
-      const controller = new AbortController();
-      abortControllerRef.current = controller;
+      if (activeStreamRef.current.controller) {
+        activeStreamRef.current.controller.abort();
+      }
+      const controller = new AbortController();
+      abortControllerRef.current = controller;
+      activeStreamRef.current = { controller, streamId: mensagemRequestId };
@@
-        const appendMessage = (delta: string) => {
+        const seenChunkIndexes = new Set<number>();
+        const appendMessage = (delta: string, chunkIndex?: number) => {
+          if (typeof chunkIndex === 'number') {
+            if (seenChunkIndexes.has(chunkIndex)) return;
+            seenChunkIndexes.add(chunkIndex);
+          }
           const chunk = flattenToString(delta);
@@
-          const texto = extractEventText(event);
-          if (texto) {
-            appendMessage(texto);
+          const texto = extractEventText(event);
+          if (texto) {
+            appendMessage(texto, readChunkIndex(event));
           }
@@
-          appendMessage(chunkText);
+          appendMessage(chunkText, readChunkIndex(event));
         };
+
+        const readChunkIndex = (event: EcoSseEvent) => {
+          const payload = event.payload as Record<string, any> | undefined;
+          const delta = payload?.delta as Record<string, any> | undefined;
+          const candidates = [
+            delta?.index,
+            delta?.chunk_index,
+            payload?.index,
+            payload?.chunk_index,
+          ];
+          return candidates.find((value) => typeof value === 'number');
+        };
@@
-        const finalizeMessage = () => {
+        const finalizeMessage = () => {
           if (!ecoMessageId && !resolvedEcoMessageId) return;
           patchEcoMessage({ streaming: false });
         };
@@
-  useEffect(() => {
-    return () => {
-      abortControllerRef.current?.abort();
-    };
-  }, []);
+  useEffect(() => {
+    return () => {
+      activeStreamRef.current.controller?.abort();
+      activeStreamRef.current = { controller: null, streamId: undefined };
+      abortControllerRef.current = null;
+    };
+  }, []);
```
- Ler `chunk_index` em cada evento, ignorar deltas repetidos e limpar o Set ao final da interação.
- AbortController em `activeStreamRef` garante um único listener por fluxo e faz cleanup mesmo em StrictMode.
- Manter `id` existente da mensagem evita recriar o componente e o React não refaz o streaming bubble a cada render.

# Guardrails
- Persistir `(interaction_id, chunk_index)` no estado da conversa e descartar qualquer delta com a mesma dupla.
- Bloquear `handleSendMessage` se `activeStreamRef.current.controller` ainda estiver aberto.
- Garantir que cada `<ChatMessage>` receba `key={message.id}` estável enquanto `streaming` for `true` (já acontece, mas não reatribuir IDs no `done`).
- Criar teste de unidade para `processEventStream` validando que duplicatas com o mesmo `chunk_index` são ignoradas.

# Appendix
```ts
useEffect(() => {
  if (streamRef.current) return; // evita segundo listener
  const { controller, onDelta } = startStream({ interactionId });
  streamRef.current = controller;
  return () => {
    controller.abort();
    streamRef.current = null;
  };
}, [interactionId]);
```

```ts
const seen = useRef<Set<number>>(new Set());
const appendDelta = (idx: number, text: string) => {
  if (seen.current.has(idx)) return;
  seen.current.add(idx);
  setDraft((prev) => prev + text);
};
```

```ts
const renders = useRef(0);
renders.current += 1;
console.debug('ChatMessage renders', renders.current);
```
