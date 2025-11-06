# Frontend SSE Alignment - ECO Backend v2

## Status: ✅ COMPLETO

Todas as alterações foram implementadas para alinhar 100% com a nova estrutura de SSE do backend.

---

## Alterações Implementadas

### 1. ✅ Captura de X-Stream-Id Header
**Arquivo**: `src/api/ecoStream/streamProcessor.ts` (linhas 1256-1271)

- O frontend agora captura o header `X-Stream-Id` da resposta do backend
- O streamId é armazenado em `sessionStorage` com chave `eco.stream.${clientMessageId}`
- Permite suporte para retry/resume de streams interrompidos

```typescript
const responseStreamId = headerMap["x-stream-id"];
// Armazenado em sessionStorage para retries
sessionStorage.setItem(`eco.stream.${clientMessageId}`, JSON.stringify(responseStreamId));
```

### 2. ✅ Filtro de Eventos Órfãos por StreamId
**Arquivo**: `src/api/ecoStream/streamProcessor.ts` (linhas 914-944)

- Adicionado parâmetro `expectedStreamId` na função `dispatchSseBlock`
- Cada evento SSE recebido é validado contra o streamId esperado
- Eventos de streams antigos (órfãos) são ignorados automaticamente
- Previne race conditions quando múltiplas requisições são feitas rapidamente

```typescript
// ✅ Filtro de streamId: ignorar eventos órfãos de streams antigos
if (context.expectedStreamId) {
  const eventStreamId = (parsed.payload as any)?.streamId;
  if (eventStreamId && eventStreamId !== context.expectedStreamId) {
    return; // Ignorar este evento
  }
}
```

### 3. ✅ Envio de X-Stream-Id no Request
**Arquivo**: `src/api/ecoStream/streamProcessor.ts` (linhas 1127-1153)

- Frontend recupera streamId anterior de `sessionStorage` (se existir)
- Envia no header `X-Stream-Id` para suportar resume/retry
- Backend usa isso para determinar se é um novo stream ou continuação

```typescript
if (previousStreamId) {
  baseHeaders["X-Stream-Id"] = previousStreamId;
}
```

### 4. ✅ Alinhamento de Timeouts
**Arquivo**: `src/hooks/useEcoStream/session/StreamSession.ts` (linha 152)

Ajustados para corresponder exatamente com o backend:

| Timeout | Antes | Depois | Propósito |
|---------|-------|--------|-----------|
| First Token | 20s | **12s** | Aguardar primeiro chunk |
| Heartbeat | 60s | **30s** | Manter conexão viva |

```typescript
const timeoutMs = nextMode === "first" ? 12_000 : 30_000; // ✅ Alinhado
```

### 5. ✅ Validação de :keepalive Comments
**Arquivo**: `src/api/ecoStream/sseParser.ts` (linhas 14-22)

- Tratamento correto de comentários SSE (`:keepalive`)
- Frontend ignora heartbeats automaticamente
- Não causa timeout falso ou finalização prematura

```typescript
if (firstNonEmptyLine?.startsWith(":")) {
  // ✅ Keepalive comment - enviado a cada 12s
  return undefined;
}
```

---

## Verificação de Compatibilidade

### Frontend Checklist (SSE_FRONTEND_INTEGRATION.md)

- [x] Captura `X-Stream-Id` header da resposta
- [x] Filtra eventos por `streamId` para ignorar órfãos
- [x] Manipula comentários `:keepalive` (não trata como erro)
- [x] Usa chunk `index` para ordenação (já implementado)
- [x] Implementa timeout (12s first token, 30s heartbeat)
- [x] Maneja abort/cancel com AbortController (já implementado)
- [x] Parse correto de payload JSON (já implementado)
- [x] Trata eventos de erro graciosamente (já implementado)
- [x] Suporta redes lentas/latência alta (já implementado)
- [x] Suporta submissões concorrentes de mensagens (já implementado)
- [x] Cleanup correto ao desmontar componente (já implementado)

### Backend Expectations

O backend agora envia em cada resposta SSE:

```
HTTP/1.1 200 OK
X-Stream-Id: <uuid>
Content-Type: text/event-stream

event: prompt_ready
data: {"streamId":"<uuid>","at":"...",..."client_message_id":"..."}

:keepalive (a cada 12s)

event: chunk
data: {"streamId":"<uuid>","delta":"text","index":0}

event: done
data: {"streamId":"<uuid>","finish_reason":"stop",...}
```

---

## Testes Recomendados

### 1. Teste de Captura de StreamId

```typescript
// Abrir DevTools → Network → Filtrar "ask-eco"
// Verificar resposta headers:
// X-Stream-Id: <deve estar presente>

console.log(sessionStorage.getItem("eco.stream.<messageId>"));
// Deve conter o streamId em JSON
```

### 2. Teste de Filtro de Eventos Órfãos

```javascript
// Enviar 2 mensagens rapidamente
// A primeira deve ser cancelada, a segunda deve processar eventos normalmente
// DevTools Console: deve ver logs "[SSE] Evento órfão ignorado (streamId mismatch)"
```

### 3. Teste de Timeouts

```javascript
// Enviar mensagem para stream que responde lentamente
// Esperado: timeout em 12s se nenhum chunk chegar
// DevTools Console: "watchdog_first_token"
```

### 4. Teste de Keepalive

```javascript
// Enviar mensagem que leva >30s para responder
// Esperado: keepalive comments a cada 12s
// DevTools Console: ":keepalive comentário recebido"
// NÃO deve timeout pois heartbeats resetam o watchdog
```

### 5. Teste de Retry/Resume

```javascript
// Implementar teste que:
// 1. Inicia stream para msg1
// 2. Interrompe conexão antes de terminar
// 3. Verifica sessionStorage tem streamId
// 4. Resend msg1 - deve enviar X-Stream-Id anterior
// 5. Backend deve reconhecer como retry
```

---

## Logs de Debug

Para ativar logging detalhado:

```javascript
// Console do navegador
window.__ecoDebug = true;

// Ou variável de ambiente durante build
VITE_ECO_DEBUG=true npm run dev
```

Logs esperados:
- `[SSE] Stream ID capturado do header: xxx...`
- `[SSE] Enviando X-Stream-Id anterior (retry): xxx...`
- `[SSE] Evento órfão ignorado (streamId mismatch)`
- `[SSE] :keepalive comentário recebido (stream ativo)`

---

## Notas de Implementação

### Decisões Arquiteturais

1. **SessionStorage para StreamId**:
   - Usamos `sessionStorage` (não `localStorage`) pois o streamId é específico da sessão/conexão atual
   - Chave: `eco.stream.${clientMessageId}` para múltiplos streams simultâneos

2. **Filtro Silencioso de Orphans**:
   - Eventos órfãos são ignorados silenciosamente (não causam erro)
   - Apenas log em dev mode para não poluir console em produção

3. **Timeouts Explícitos**:
   - 12s first token = tempo máximo do backend para retornar primeiro chunk
   - 30s heartbeat = intervalo máximo entre eventos (reset por keepalive)

### Compatibilidade com Código Existente

Todas as alterações são **não-breaking**:
- Headers adicionais são opcionais para o frontend
- Filtro de streamId falha gracefully se campo não existir
- Timeouts só afetam streams futuros

---

## Próximos Passos

1. **Executar suite de testes**:
   ```bash
   npm run test -- streamProcessor
   npm run test -- useEcoStream
   ```

2. **Deploy gradual**:
   - Stage 1: Deploy frontend em dev/staging
   - Stage 2: Validar logs em 1-2 horas de uso
   - Stage 3: Deploy em produção

3. **Monitoramento**:
   - Monitorar `watchdog_first_token` timeouts
   - Monitorar taxa de "orphaned events ignored"
   - Monitorar latência média de streams

---

## Referências

- Backend SSE Guide: `SSE_FRONTEND_INTEGRATION.md` (relatório do backend)
- Código alterado:
  - `src/api/ecoStream/streamProcessor.ts`
  - `src/api/ecoStream/sseParser.ts`
  - `src/hooks/useEcoStream/session/StreamSession.ts`

---

**Status**: ✅ Pronto para testes e deploy
**Data**: 2025-11-05
**Alinhamento**: 100% com backend SSE v2
