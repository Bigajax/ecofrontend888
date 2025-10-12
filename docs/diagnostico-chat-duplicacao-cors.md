# Diagnóstico: Mensagens duplicadas e erros CORS no chat

## Mensagens duplicadas na interface
- **Sintoma**: mensagens digitadas pelo usuário aparecem repetidas (ex.: `oláolá`).
- **Causa raiz**: o componente `ChatMessage` utilizava `normalizeMessageContent([message.content, message.text])`. Como as mensagens do usuário são persistidas com `content` e `text` contendo o mesmo valor, o normalizador concatenava as duas entradas, produzindo duplicação na renderização.
- **Correção aplicada**: o componente agora seleciona apenas um valor primário (priorizando `content`) e só consulta alternativas quando o texto principal estiver vazio. Com isso, impedimos a concatenação de duplicatas mantendo compatibilidade com respostas complexas (objetos, arrays, streaming etc.).

## Erros `fetch` com CORS
- **Sintoma**: requisições `ask-eco` e `similares_v2` são bloqueadas por CORS quando executadas fora de um domínio autorizado.
- **Causa provável**: o backend (`resolveApiUrl` aponta para `https://ecobackend888.onrender.com`) não inclui a origem atual na política CORS, retornando erro logo na preflight.

### Plano de ajuste sugerido
1. **Mapear origens necessárias**
   - Levantar todas as URLs de front-end (produção, homologação, desenvolvimento local) que precisam acessar a API.
2. **Atualizar política CORS do backend**
   - Ajustar a configuração do `ecobackend888` para incluir as origens mapeadas.
   - Garantir que os métodos `POST` e cabeçalhos personalizados (`X-Guest-Id`, `x-guest-mode`) estejam liberados no preflight.
3. **Validar em ambiente de testes**
   - Reexecutar o fluxo de chat garantindo ausência de erros CORS e funcionamento do streaming SSE.
4. **Automação/monitoramento**
   - Adicionar check automatizado (por exemplo, healthcheck diário) que testa uma requisição simples a partir do front-end ou monitoramento de logs CORS no backend para detectar regressões cedo.
5. **Fallback no front-end (opcional)**
   - Manter mensagens amigáveis já existentes (`CORS_ERROR_MESSAGE`) e considerar retry automático após alteração da política, evitando múltiplos envios manuais pelo usuário.
