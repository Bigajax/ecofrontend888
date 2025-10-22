# ECO Frontend — Runtime & Network Contract

## 1. Overview
- Aplicação React/Vite implantada na Vercel.
- Todas as chamadas de API utilizam caminhos relativos de **mesma origem**: `"/api/..."` (rewrites da Vercel encaminham para o backend na Render).
- Não há dependências de variáveis `VITE_API_*` para configurar o backend.
- Suporte a respostas em JSON e SSE; o fluxo SSE tolera encerramento sem evento explícito de conclusão.

## 2. Base de API & Configuração
- `getApiBase()` retorna sempre a string vazia (`""`).
- `resolveApiUrl(base = "", path)` monta URLs no formato `"/api/<rota>"`.
- Variáveis removidas: `VITE_API_URL`, `VITE_BACKEND_URL`, `VITE_API_BASE`.
- Opcional: `VITE_METABASE_URL` é usado apenas pelo HUD em desenvolvimento.

## 3. Chamadas de API (1:1)
| Função (frontend)             | Rota                | Método | Tipo de resposta | Cabeçalhos essenciais                                                                 | Status esperado |
|-------------------------------|---------------------|--------|------------------|---------------------------------------------------------------------------------------|-----------------|
| `enviarMensagemParaEco()`     | `/api/ask-eco`      | POST   | **SSE**          | `Accept: text/event-stream`, `Content-Type: application/json`, `X-Eco-Guest-Id`, `X-Eco-Client` | 200 streaming   |
| `registrarMensagem()`         | `/api/mensagem`     | POST   | JSON             | `Content-Type: application/json`, `Authorization: Bearer <token>` (quando disponível) | 200/204         |
| `buscarMemoriasSimilares()`   | `/api/similares_v2` | GET    | JSON             | `Authorization: Bearer <token>` (quando disponível)                                    | 200             |
| `sendFeedback()`              | `/api/feedback`     | POST   | Sem conteúdo     | `Content-Type: application/json`, `X-Eco-Guest-Id`                                    | **204**         |
| `enviarSinalPassivo()`        | `/api/signal`       | POST   | Sem conteúdo     | `Content-Type: application/json`, `X-Eco-Guest-Id`                                    | **204**         |

Notas:
- Não utiliza `credentials: "include"` nem `mode: "no-cors"` nas requisições.
- Identidade de convidado: cabeçalho `X-Eco-Guest-Id` armazenado no `localStorage`.
- Usuário autenticado: incluir `Authorization: Bearer <token>` quando aplicável.

## 4. SSE — Protocolo no Frontend
- Requisição: cabeçalho `Accept: text/event-stream` com body JSON contendo o prompt ou mensagem do usuário.
- Processamento:
  - Consome tokens incrementais prefixados com `data:`.
  - Considera o stream concluído quando recebe `event: done`, `data: [DONE]` **ou** quando a conexão é encerrada sem esse evento.
  - Em encerramento sem `done`, registra aviso: `"Fluxo SSE encerrado sem evento 'done'."` sem lançar exceção.
- UI:
  - Remove placeholder ao receber o primeiro token.
  - Mantém o campo de entrada habilitado; o aviso é não bloqueante.

## 5. Estados & UX
- Flags principais: `pending`, `digitando`, `erroApi`.
- Feedback: debounce de 300 ms por `interaction_id`, com até 2 tentativas em falhas de rede.
- Toasts/banners para erros de rede, CORS, 401, 429 e 5xx.

## 6. Erros & Tolerâncias
- A UI não deve quebrar se o stream for encerrado sem `done`; apenas loga aviso e mostra toast.
- Respostas 404 indicam divergência de rota ou método conforme tabela da seção 3.
- Respostas 204 são esperadas em `feedback` e `signal`.

## 7. Checklist de Validação
- [ ] Todas as chamadas iniciam com `https://<app>.vercel.app/api/...`.
- [ ] Nenhuma requisição direta do navegador para domínios `onrender.com`.
- [ ] `/api/ask-eco` responde com status 200 e stream SSE.
- [ ] `/api/feedback` responde 204.
- [ ] Encerramento sem `done` gera aviso, sem exceção.
- [ ] Nenhum uso de `VITE_API_*` no bundle.

## 8. Traço de Exemplo
```
POST https://ecofrontend888.vercel.app/api/ask-eco
Accept: text/event-stream

data: "olá"
data: "..."
event: done
data: ok
```

## 9. Apêndice
- HUD de desenvolvimento (F12) exibe `interaction_id`, último feedback e link do Metabase quando `VITE_METABASE_URL` está definido.
