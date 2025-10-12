# Revisão do fluxo Eco API / Stream

## Checklist detalhado
| Item | Status | Evidência | Observações |
| --- | --- | --- | --- |
| 1a. Headers & credentials | OK | `buildRequestInit` aplica `credentials` conforme `guest.isGuest` e só envia `Authorization` quando autenticado. | Mantém `omit` p/ convidados, `include` p/ autenticados. |
| 1b. Header `Accept` dinâmico | OK | `buildRequestInit` alterna entre `text/event-stream` e `application/json`. | Condicionado via `isStreaming`. |
| 1c. Corpo JSON válido | OK | Payload montado e serializado com `JSON.stringify`. | Inclui campos obrigatórios (`mensagens`, `nome_usuario`, hora/timezone). |
| 1d. Persistência `X-Guest-Id` | OK | Resposta lê `x-guest-id` e salva via `safeLocalStorageSet`. | GuestId normalizado antes de persistir. |
| 1e. Tratamento HTTP 401/429/5xx | OK | `mapStatusToFriendlyMessage` + `EcoApiError`; mensagens reutilizadas em `useEcoStream`. | Surface amigável + Retry-After preservado. |
| 1f. Fallback SSE → JSON | OK | `useEcoStream` tenta `stream: true` e, em caso de falha, refaz com `stream: false`. | Loga aviso em DEV. |
| 1g. Cookies convidados | OK | `credentials: 'omit'` quando `isGuest`. | Garante navegação guest sem cookies. |
| 1h. Authorization convidados | OK | Bearer só é enviado quando `!guest.isGuest && token`. | Evita header indevido. |
| 1i. JSON sempre válido | OK | Corpo é sempre `JSON.stringify` sobre objeto montado. | Evita erros "Bad escaped character". |
| 2a. CORS allowlist backend | AJUSTAR | Configuração backend não está neste repositório; não há como confirmar inclusão de `https://ecofrontend888.vercel.app`. | Recomendar revisar `ecobackend888` para garantir origem autorizada. |
| 2b. CORS c/ credentials | AJUSTAR | Falta de visibilidade sobre política backend; necessário confirmar `Access-Control-Allow-Credentials` condicional. | Risco de expor cookies indevidamente ou bloquear convidados. |
| 2c. Endpoint `/api/ask-eco` (Accept/headers) | AJUSTAR | Backend fora do repo; confirmar suporte a SSE (`text/event-stream`) e fallback JSON, além de retorno `x-guest-id`. | Sem garantia de compatibilidade lado servidor. |

## Riscos e recomendações backend
- Sem validação do CORS no backend, o front ainda pode enfrentar bloqueios (preflight 403) ou vazamento de cookies se `Access-Control-Allow-Credentials` estiver sempre ligado. Recomenda-se auditar `ecobackend888`.
- Confirmar que `/api/ask-eco` responde com `Content-Type: text/event-stream` quando solicitado e devolve `x-guest-id` para sincronizar com o front.

## Testes sugeridos
### Convidado (SSE)
```bash
curl -N \
  -X POST "https://ecobackend888.onrender.com/api/ask-eco" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-Guest-Id: guest_abcd1234" \
  -H "X-Guest-Mode: 1" \
  --data '{"mensagens":[{"role":"user","content":"Olá"}],"nome_usuario":null,"clientHour":12,"clientTz":"America/Sao_Paulo","isGuest":true,"guestId":"guest_abcd1234"}'
```

### Autenticado (JSON fallback)
```bash
curl -X POST "https://ecobackend888.onrender.com/api/ask-eco" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Guest-Id: guest_abcd1234" \
  -H "X-Guest-Mode: 0" \
  --cookie "session=<SESSION_COOKIE>" \
  --data '{"mensagens":[{"role":"user","content":"Olá"}],"nome_usuario":"Usuário","clientHour":12,"clientTz":"America/Sao_Paulo","usuario_id":"<USER_ID>"}'
```

## Mensagens de erro recomendadas
- **401 Não autorizado**: "Faça login para continuar a conversa com a Eco."
- **429 Limite excedido**: "Muitas requisições. Aguarde alguns segundos antes de tentar novamente."
- **5xx Erro interno**: "A Eco está indisponível no momento. Tente novamente em instantes."

