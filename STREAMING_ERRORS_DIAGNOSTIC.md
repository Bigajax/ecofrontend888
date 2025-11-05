# Diagnóstico de Erros de Streaming SSE

**Data**: November 2025
**Erros Identificados**: 2 problemas críticos no fluxo de streaming

---

## 🔴 Problema 1: "Nenhum chunk emitido antes do encerramento"

### Sintomas
```
Error: Nenhum chunk emitido antes do encerramento
  at streamOrchestrator.ts:987
```

### Causa Raiz
A stream SSE está recebendo o evento `done` **sem ter recebido nenhum chunk** de dados antes.

### Cenários Possíveis

| Cenário | Evidência | Solução |
|---------|-----------|---------|
| Backend falha no processamento | Vê erro "candidates is not defined" antes | Ver Problema 2 |
| Timeout na primeira requisição | Watchdog dispara antes de dados | ✓ Implementado |
| Connection droppou | Recebe done sem chunks | Retry automático |
| Backend parou de responder | Timeout de heartbeat | Health check |

### Impacto no UX
- Mensagem fica com status `error` (vermelho)
- Usuário não recebe feedback claro do que deu errado
- Não há retry automático

### Solução Implementada ✅
Melhorado o logging em `streamOrchestrator.ts:983-999`:
- Agora registra `finishReason` para identificar a causa exata
- Inclui `lastError` do contexto de stream
- Mensagem de aviso mais clara: "Backend pode estar tendo problemas"

---

## 🔴 Problema 2: "candidates is not defined"

### Sintomas
```
Error: candidates is not defined
streamEvents.ts:488 [SSE-DEBUG] onControl_error_critical
```

### Causa Raiz
**Este erro vem do BACKEND**, não do frontend. Significa que o servidor está lançando um `ReferenceError` durante o processamento da requisição.

### Onde Ocorre o Erro
```
POST /api/ask-eco
  → Backend processa requisição
  → Erro: "candidates is not defined"
  → Envia evento de controle com tipo "error"
  → Frontend captura em onControl handler
```

### Possíveis Origens no Backend

1. **Processamento de Prompt/Heurística**
   - Variável `candidates` não inicializada em `prompt/selector.ts` ou similares
   - Acesso a propriedade de array vazio

2. **Integração com IA (OpenAI/Gemini)**
   - Resposta do modelo em formato inesperado
   - Tentativa de acessar `candidates` quando array está vazio

3. **Módulo de Resposta**
   - `candidates` esperado em estrutura de resposta
   - Backend não recebeu array esperado

### Solução Implementada ✅
Melhorado o diagnóstico em `streamEvents.ts:465-521`:
- Detecta automaticamente erros com "is not defined"
- Classifica como `isBackendError`
- Fornece sugestão no console: "Backend error - check server logs for 'is not defined' errors"

---

## 📋 Checklist de Resolução

### 1️⃣ Investigar o Backend (Prioridade Alta)

```bash
# Verificar logs do backend
# Procure por mensagens com "candidates is not defined"

# Testar endpoint manualmente
curl -X POST http://localhost:3001/api/ask-eco \
  -H "Content-Type: application/json" \
  -H "x-eco-guest-id: test-user" \
  -d '{
    "message": "Olá",
    "userId": "test",
    "userProfile": {}
  }'

# Verificar se há erros de JavaScript
# - Check for variables declared but not initialized
# - Look for array access without bounds checking
```

### 2️⃣ Verificar Configuração Frontend

```bash
# Confirmar que as variáveis de ambiente estão corretas
echo $VITE_API_URL
echo $VITE_SUPABASE_URL

# Rodar com debug ativado
localStorage.setItem('ECO_DEBUG', 'true');

# Verificar identidade
console.log({
  guestId: localStorage.getItem('eco.guestId'),
  sessionId: sessionStorage.getItem('eco.sessionId')
});
```

### 3️⃣ Testar Fluxo Completo

```bash
# 1. Limpar cache
localStorage.clear();
sessionStorage.clear();

# 2. Recarregar página
# 3. Abrir DevTools → Console
# 4. Enviar uma mensagem
# 5. Monitorar erros em tempo real:

# Filtrar logs de streaming
console.log = ((f) => function(...args) {
  if (args[0]?.includes('EcoStream')) f.apply(console, args);
})(console.log);
```

### 4️⃣ Verificar Saúde do Backend

```bash
# Teste o health check
curl http://localhost:3001/health

# Esperado: { status: "ok" }

# Se falhar, o backend não está respondendo
```

---

## 🔧 Melhorias Implementadas

### No Arquivo `streamOrchestrator.ts`
- ✅ Melhor logging quando nenhum chunk é emitido
- ✅ Registra `finishReason` para diagnóstico
- ✅ Inclui `lastError` do contexto
- ✅ Mensagem mais clara para o desenvolvedor

### No Arquivo `streamEvents.ts`
- ✅ Detecta automaticamente erros de backend ("is not defined")
- ✅ Classifica erros como `isBackendError`
- ✅ Fornece sugestão de diagnóstico no console
- ✅ Mantém backward compatibility com erros benignos

---

## 📊 Próximas Etapas Recomendadas

1. **Curto Prazo**
   - [ ] Verificar logs do backend para "candidates is not defined"
   - [ ] Testar endpoint `/api/ask-eco` manualmente
   - [ ] Confirmar variáveis de ambiente corretas

2. **Médio Prazo**
   - [ ] Implementar retry automático para empty streams
   - [ ] Adicionar user-facing error message mais clara
   - [ ] Melhorar documentação de integração com backend

3. **Longo Prazo**
   - [ ] Adicionar health check periódico do backend
   - [ ] Implementar circuit breaker para falhas repetidas
   - [ ] Adicionar telemetria de stream failures

---

## 🔍 Monitoramento

### Logs Importantes para Acompanhar

```javascript
// Erro crítico de backend
[SSE-DEBUG] onControl_error_critical {
  error: "candidates is not defined",
  isBackendError: true,
  suggestion: "Backend error - check server logs..."
}

// Stream sem chunks
[EcoStream] Nenhum chunk emitido antes do encerramento.
Backend pode estar tendo problemas. {
  finishReason: "timeout|connection_lost|...",
  lastError: "..."
}
```

### Como Verificar Status em Tempo Real

```javascript
// No DevTools Console
// Monitorar SSE events
window.addEventListener('eco:stream:event', e => {
  console.log('SSE Event:', e.detail);
});

// Verificar stream status
const stats = window.__ecoStreamStats;
console.log('Stream status:', stats?.status);
console.log('Chunks received:', stats?.chunkCount);
console.log('Last error:', stats?.lastError);
```

---

## 📚 Arquivos Modificados

1. **`src/hooks/useEcoStream/streamOrchestrator.ts`** (Linhas 983-999)
   - Melhorado logging de streams vazias
   - Agora inclui contexto adicional para diagnóstico

2. **`src/hooks/useEcoStream/session/streamEvents.ts`** (Linhas 465-521)
   - Detecta erros de backend automaticamente
   - Fornece sugestões no console

---

## 🚨 Ação Imediata Necessária

**O erro "candidates is not defined" é crítico e vem do backend.**

1. Verifique o servidor em `localhost:3001` ou seu URL configurado
2. Procure nos logs por "candidates is not defined"
3. Verifique a integração com OpenAI/Gemini API
4. Confirme que todas as variáveis estão definidas corretamente

**Sem corrigir o backend, o frontend não pode fazer mais nada.**

