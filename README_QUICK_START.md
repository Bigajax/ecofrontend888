# 🚀 Quick Start - StreamTextNormalizer

**Ative e teste em 5 minutos**

---

## 1️⃣ Rodar Testes

```bash
npm run test -- StreamTextNormalizer
```

**Resultado esperado**: ✅ 41 testes passando

---

## 2️⃣ Habilitar Feature

No console do browser:

```javascript
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'true');
localStorage.setItem('ECO_DEBUG_NORMALIZER', 'true');
location.reload();
```

---

## 3️⃣ Testar na Prática

Envie essas mensagens para a ECO:

### Teste 1: Colagem ❌→✅
```
Pergunta: "você fez isso?"
Resposta deve: não virar "vocêfez"
```

### Teste 2: Acentos ✓
```
Pergunta: "como está São Paulo?"
Resposta deve: "São" mantém ã
```

### Teste 3: Markdown ✓
```
Pergunta: "crie uma lista"
Resposta deve: **negrito** e - itens funcionar
```

### Teste 4: Código ✓
```
Pergunta: "escreva código javascript"
Resposta deve: espaçamento preservado em ```código```
```

---

## 4️⃣ Verificar Logs

No console, você verá:

```
[StreamNorm] Processed chunk {input: "você", output: " você", tail: "ocê"}
[StreamNorm] Finalized message {inputLen: 156, outputLen: 148, spacesInserted: 3}
[StreamNorm] Final metrics {chunkCount: 14, insertedSpaces: 3, finalLength: 148}
```

---

## 5️⃣ Desabilitar (Volta ao Normal)

```javascript
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'false');
location.reload();
```

---

## 📋 Arquivos Criados

| Arquivo | Linhas | Teste |
|---------|--------|-------|
| `src/utils/StreamTextNormalizer.ts` | 249 | ✅ |
| `src/utils/__tests__/StreamTextNormalizer.test.ts` | 458 | ✅ |
| `src/hooks/useStreamTextNormalizer.ts` | 154 | ✅ |

---

## 📚 Documentação

- **Entrega**: `DELIVERY_SUMMARY.md` (este arquivo)
- **Integração**: `INTEGRATION_GUIDE.md` (como integrar ao pipeline)
- **Estratégia**: `FRONTEND_TEXT_PROCESSING_STRATEGY.md` (visão completa)
- **Exemplos**: `TEXT_PROCESSING_EXAMPLES.md` (casos práticos)
- **Roadmap**: `IMPROVEMENTS_ROADMAP.md` (melhorias futuras)

---

## ✅ Critérios

- [x] Espaçamento correto (palavras não coladas)
- [x] Acentuação preservada (São, São Influência)
- [x] Markdown funcionando (**negrito**, listas)
- [x] Código preservado (espaços em ` `código` `)
- [x] Quebras de linha corretas (\n\n parágrafos)
- [x] XSS bloqueado (sem scripts executando)
- [x] Feature flag (ativa/desativa)
- [x] Telemetria (logs dev only)

---

## 🆘 Troubleshooting

### Problema: "Ainda vejo colagem"
```javascript
// Verificar flag
localStorage.getItem('ECO_FIX_SPACING_FRONTEND'); // Deve ser 'true'
```

### Problema: "Muitos espaços extras"
```javascript
// Desabilitar
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'false');
location.reload();
```

### Problema: "Testes falhando"
```bash
# Limpar cache e rodar novamente
npm run test -- StreamTextNormalizer --no-coverage --watch
```

---

## 🎯 Próximos Passos

1. ✅ Testar (você está aqui)
2. ⏳ Code review
3. ⏳ Integrar ao chunkProcessor
4. ⏳ Deploy staging
5. ⏳ A/B test com usuários
6. ⏳ Deploy produção

---

**Status**: ✅ Pronto para testar agora
**Tempo esperado**: 5 minutos para rodar testes + 2-3 testes manuais
**Risco**: Nenhum (feature flag permite rollback instantâneo)

