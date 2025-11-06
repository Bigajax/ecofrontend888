# ECO – Guia de Trace & Debug (FE/BE)

> Objetivo: padronizar **o que** e **como** logamos em Frontend e Backend para debugar fluxos (especialmente SSE) com segurança e rapidez.

---

## 1) Chaves de correlação (sempre presentes)

Inclua estas chaves em **todos** os logs relevantes, no FE e no BE:

* `trace_id` – gerado por requisição (frontend cria, backend propaga se vier no header `X-Trace-Id`).
* `client_message_id` – ID da mensagem do usuário (FE). Header: `X-Client-Message-Id`.
* `stream_id` – ID lógico do stream SSE (FE). Header: `X-Stream-Id`.
* `interaction_id` – ID analítico/servidor (BE). Enviado ao FE via evento control:done/meta.
* `guest_id` – identidade convidado (se houver). Header: `X-Eco-Guest-Id`.
* `session_id` – sessão do app (cookie/armazenamento). Header: `X-Eco-Session-Id`.
* `origin` – host do chamador (BE detecta de `Origin`).

> **Regra**: se você não tem todas, logue as que tiver. O importante é **sempre** ter **trace_id** + **client_message_id**.

---

## 2) Níveis e formato

* **Formato**: JSON por linha (facilita grep e ingestão em data lake).
* **Níveis**: `DEBUG`, `INFO`, `WARN`, `ERROR`.
* **Campos comuns**: `ts` (ISO), `level`, `source` (fe|be), `msg` (string curta), `data` (obj opcional).

**Exemplo (qualquer lado):**

```json
{"ts":"2025-10-27T14:35:10.121Z","level":"INFO","source":"be","msg":"ask-eco stream_start","trace_id":"af3b...","client_message_id":"123...","stream_id":"s-77","interaction_id":null,"origin":"https://ecofrontend...","data":{"idleTimeoutMs":55000,"firstTokenTimeoutMs":35000}}
```

---

## 3) Frontend – pontos de log

### 3.1 Envio (pré-requisição)

* Gera `trace_id` (UUID v4).
* Gera `stream_id` (UUID v4) por tentativa.
* Loga `pending_send` e `stream_init`.
* Seta headers: `X-Trace-Id`, `X-Stream-Id`, `X-Client-Message-Id`, `X-Eco-Guest-Id`, `X-Eco-Session-Id`.

**Log sugerido**

```json
{"source":"fe","level":"INFO","msg":"sse:start","trace_id":"...","client_message_id":"...","stream_id":"...","url":"https://.../api/ask-eco","accept":"text/event-stream"}
```

### 3.2 Ciclo SSE

* **OPEN**: loga status e `content-type`.
* **COMMENT**: ignore (debug só em `DEBUG`).
* **EVENT control:prompt_ready**: marca `t0` e loga.
* **EVENT chunk**: agrega bytes/char e loga contadores em `DEBUG` (sem poluir `INFO`).
* **EVENT control:done**: loga o `finishReason` e `interaction_id`.
* **EVENT message {done:true}**: trate como done (tolerância), registre o meta.
* **CLOSE**: loga `stream_completed`, `gotAnyChunk`, `aggregatedLength`, `finishReasonFromMeta`.

### 3.3 Fallback JSON (opcional)

* Se habilitado, logar `fallback_json: start|done|error` com mesmo `trace_id`.

### 3.4 Redações (segurança)

* Nunca logar `Authorization`, tokens de refresh/AccessToken, cookies. Se inevitável, redija: `***`.

---

## 4) Backend – pontos de log

### 4.1 Middleware de request

* **BEGIN**: método, path, `origin`, `ip`, `trace_id` (ou gere se ausente), chaves do usuário (guest, session).
* **CORS**: resultado allow/deny (em `DEBUG`).

### 4.2 `/api/ask-eco` (SSE)

* `stream_start` (antes de emitir headers) com timeouts e **snapshot de headers de resposta**.
* `prompt_ready` (quando emitido).
* `first_token_watchdog_triggered` (se disparar).
* `chunk_emitted` (em `DEBUG`, agregue contadores em memória; não logue cada delta em `INFO`).
* `stream_done` (meta final: `finishReason`, `usage`, `modelo`, `length`, `interaction_id`).
* `stream_close_before_done` com classificação: `client_closed | proxy_closed | server_abort`, bytes enviados.
* `sse_unexpected`/`json_unexpected` (erros não tratados) com `trace_id` e mensagem curta.

### 4.3 Emissão padronizada de conclusão

* Sempre enviar `event: control` + `data: {"name":"done", "meta":{...}}`.
* Opcional manter compat: `message {done:true}`.

### 4.4 Redações

* Remover/mascarar segredos: `Authorization`, cookies, chaves de API, payload sensível.

---

## 5) Estrutura de logs – campos mínimos

```
common: ts, level, source, msg, trace_id, client_message_id, stream_id, interaction_id
fe-only: url, status, content_type, gotAnyChunk, aggregatedLength, finishReasonFromMeta
be-only: path, method, origin, ip, responseHeaders, idleTimeoutMs, firstTokenTimeoutMs
```

---

## 6) Headers canônicos (FE → BE)

* `X-Trace-Id: <uuid>`
* `X-Stream-Id: <uuid>`
* `X-Client-Message-Id: <uuid da msg>`
* `X-Eco-Guest-Id: <id>`
* `X-Eco-Session-Id: <id>`

> **Dica**: backend deve ecoar `X-Trace-Id` e `X-Eco-Interaction-Id` na resposta inicial do SSE.

---

## 7) Feature flags

* `ECO_TRACE=1` (BE): eleva nível de alguns logs para `INFO`.
* `VITE_ECO_TRACE=1` (FE): liga logs `INFO` no console; `VITE_ECO_TRACE_VERBOSE=1` liga `DEBUG`.

---

## 8) Exemplos rápidos

### 8.1 grep – “sem chunks”

```
# backend
kubectl logs <pod> | jq -r 'select(.msg=="stream_close_before_done" or .msg=="stream_done") | .msg, .finishReason, .client_message_id, .trace_id'
```

### 8.2 curl (sanity)

```
curl -N -H 'Accept: text/event-stream' \
  -H 'X-Trace-Id: test-123' -H 'X-Client-Message-Id: test-msg-1' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"oi"}],"isGuest":true}' \
  https://<backend>/api/ask-eco
```

---

## 9) Checklist “sem resposta” (SSE)

1. **FE** recebeu `control:prompt_ready`? Se não, CORS/proxy/headers.
2. Vieram **chunks**? Se não, veja no BE `first_token_watchdog_triggered` e o provider.
3. Chegou `control:done`? Se não, padronize emissão (não apenas `message {done:true}`).
4. `stream_close_before_done`? Classificação `client_closed` → FE abortou cedo (aba mudou, logout, rede) / `proxy_closed` → edge fechou (Content-Length indevida, buffering de proxy)/ `server_abort` → timeouts internos.
5. Motivo final no meta (`finishReason`) bate com comportamento do FE?

---

## 10) Boas práticas

* Logs curtos e consistentes (uma linha JSON). Mensagem humana em `msg`, máquina em `data`.
* Evitar spam: `DEBUG` para itens de alta frequência (chunk), `INFO` para marcos.
* Sempre **correlacione** com `trace_id` + `client_message_id`.

---

## 11) Roadmap sugerido (curto)

* [ ] FE: garantir headers canônicos + tolerância a `message {done:true}`.
* [ ] BE: padronizar `control:done` em 100% dos caminhos.
* [ ] Adicionar `ECO_TRACE`/`VITE_ECO_TRACE` como toggles.
* [ ] Scripts `grep` prontos no repositório (`scripts/debug/*.sh`).
* [ ] Dashboard simples (Supabase/ELK) filtrando por `trace_id`/`client_message_id`.
