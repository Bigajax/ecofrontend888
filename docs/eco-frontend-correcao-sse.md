# ECO Frontend — Correção de falha SSE (Failed to Fetch, duplicação e loop “digitando…”)

## Problema original

- Duas bolhas “digitando…” apareciam ao mesmo tempo.
- `TypeError: Failed to fetch` no console.
- Estado de “digitando…” não parava após erro.
- Ocorre principalmente quando o front roda em HTTPS e o backend em HTTP (mixed content).

## Causas

- React StrictMode duplicando efeitos (`useEffect` executa duas vezes em ambiente de desenvolvimento).
- `VITE_ECO_BACKEND_URL` configurado com `http://` enquanto o front rodava em `https://`.
- Estado da mensagem não atualizado no bloco `finally` dos handlers SSE/JSON.

## Soluções aplicadas

- Adicionado `inflight: Map<clientMessageId, AbortController>` para impedir duplo envio.
- Função `resolveBackendUrl()` para validar URL e bloquear `http://` em HTTPS.
- `finally` garante `stopTyping()` e `status: 'error'` em falhas.
- SSE e fallback JSON reutilizam o mesmo `clientMessageId`.

## Configuração

`.env`:

```
VITE_ECO_BACKEND_URL=https://api.seueco.app
```

- Produção deve usar HTTPS.
- CORS já liberado para `*.vercel.app`.

---

## Checklist — Teste Frontend

| Teste | Comando / Ação | Esperado |
| --- | --- | --- |
| 1. Protocolo | `console.log(location.protocol, import.meta.env.VITE_ECO_BACKEND_URL)` | HTTPS + HTTPS |
| 2. Requests por mensagem | Enviar “oi”, “teste” e “eco”. | 1 request `/api/ask-eco` por mensagem |
| 3. Mixed Content | Abrir DevTools → aba “Network”. | Nenhum erro “Mixed Content” |
| 4. Console errors | Filtrar “Failed to fetch”. | Nenhum erro após o fix |
| 5. StrictMode | Enviar 3 mensagens seguidas. | Nunca aparecem 2 bolhas “digitando…” |
| 6. Timeout | Simular backend lento (5s). | Front mostra “…” e depois encerra |
| 7. Fallback JSON | Derrubar SSE temporariamente. | Fallback retorna resposta sem loop |

### Critério de sucesso

- Nenhum erro `Failed to fetch`.
- Apenas 1 bolha “digitando…”.
- Resposta em ≤ 3 s no ambiente local, ≤ 6 s em produção.
