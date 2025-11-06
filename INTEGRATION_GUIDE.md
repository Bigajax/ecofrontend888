# StreamTextNormalizer - Integration Guide

**Como integrar o novo sistema de normalização ao pipeline existente**

---

## 📋 Resumo

Foram criados 3 arquivos novos:

1. **`src/utils/StreamTextNormalizer.ts`** - Utilitário robusto de normalização
2. **`src/utils/__tests__/StreamTextNormalizer.test.ts`** - Testes completos
3. **`src/hooks/useStreamTextNormalizer.ts`** - Hook para integração

O sistema é **backwards-compatible**: pode ser habilitado/desabilitado via feature flag sem quebrar nada.

---

## 🔧 Integração Passo a Passo

### Passo 1: Verificar Instalação

```bash
# Verificar que os 3 arquivos foram criados
ls src/utils/StreamTextNormalizer.ts
ls src/utils/__tests__/StreamTextNormalizer.test.ts
ls src/hooks/useStreamTextNormalizer.ts
```

### Passo 2: Rodar Testes

```bash
npm run test -- StreamTextNormalizer
```

**Saída esperada**:
```
 PASS  src/utils/__tests__/StreamTextNormalizer.test.ts
  ✓ normalizeChunk (14 testes)
  ✓ finalizeMessage (15 testes)
  ✓ extractJsonBlocks (5 testes)
  ✓ Metrics (3 testes)
  ✓ Integration (4 testes)

41 testes passando
```

### Passo 3: Integrar no chunkProcessor (OPCIONAL)

Se quiser usar a normalização nos chunks SSE:

**Arquivo**: `src/hooks/useEcoStream/chunkProcessor.ts`

**Localização**: Na função `applyChunkToMessages`, linha ~508

**Antes** (código atual):
```typescript
// Line 508
const combinedText = smartJoin(currentEntry.text ?? "", appendedSource);
```

**Depois** (com normalização):
```typescript
// Importar no topo do arquivo
import { normalizeChunk } from "../../utils/StreamTextNormalizer";

// Na função applyChunkToMessages, criar normalizer se não existir
// Adicionar isso no início da função ou no hook que chama
let normalizerRef = useRef({ tail: "", spacesAdded: 0 });
const featureFlagEnabled = localStorage.getItem('ECO_FIX_SPACING_FRONTEND') !== 'false';

// Depois, substituir a linha:
const { safe: normalizedDelta, tail } = normalizeChunk(
  normalizerRef.current.tail,
  appendedSource
);
normalizerRef.current.tail = tail;

const combinedText = smartJoin(currentEntry.text ?? "", normalizedDelta);
```

### Passo 4: Feature Flag no localStorage

Para habilitar/desabilitar em runtime:

```javascript
// No console do browser

// Desabilitar (volta ao comportamento antigo)
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'false');
location.reload();

// Habilitar
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'true');
location.reload();

// Debug
localStorage.setItem('ECO_DEBUG_NORMALIZER', 'true');
location.reload();
```

### Passo 5: ChatMessage (Já Compatível)

O `ChatMessage.tsx` já está usando:
- `fixIntrawordSpaces()` para espaços intra-palavra
- `MarkdownRenderer` para markdown seguro

**Não precisa de mudanças**, mas pode ser otimizado com:

```typescript
// Adicionar memoização em ChatMessage.tsx
const displayText = useMemo(() => {
  if (!isEco || !hasVisibleText) return textToShow;
  return fixIntrawordSpaces(textToShow);
}, [textToShow, isEco, hasVisibleText]);
```

---

## 🚀 Comportamentos Esperados

### Após Ativação

1. **Mensagens não coladas**:
   - ❌ Antes: "você fez" pode virar "vocêfez"
   - ✅ Depois: "você fez" sempre com espaço

2. **Streaming suave**:
   - Chunks não geram espaços extras
   - Acentuação preservada
   - Markdown funcionando

3. **Quebras de linha**:
   - \n preservado
   - Múltiplos breaks (3+) colapsam para 2
   - Renderização visual correta

4. **Código preservado**:
   - Espaços dentro de `` `código` `` preservados
   - Blocos ``` ``` com espaços mantidos

### Telemetria (Dev Only)

Com `ECO_DEBUG_NORMALIZER=true`:

```
[StreamNorm] Processed chunk
{input: "você", output: " você", tail: "ocê", bufferLen: 14}

[StreamNorm] Finalized message
{inputLen: 156, outputLen: 148, spacesInserted: 3, chunks: 12}

[StreamNorm] Final metrics
{
  chunkCount: 14,
  insertedSpaces: 3,
  totalCharsProcessed: 156,
  finalLength: 148,
  compressionRatio: "0.95"
}
```

---

## 🧪 Testes Manuais (Obrigatórios)

Execute os seguintes cenários:

### Teste 1: Colagem Clássica
```
Backend: ["você", " fez"] → "você fez" ✓
Backend: ["você", "fez"] → "você fez" ✓ (espaço inserido)
```

**Como testar**:
1. Abrir console
2. `localStorage.setItem('ECO_DEBUG_NORMALIZER', 'true')`
3. Recarregar página
4. Enviar mensagem
5. Verificar logs `[StreamNorm] Processed chunk`

### Teste 2: Unicode/Acentos
```
"São" + " Influência" → "São Influência" ✓
"ção" entre chunks → preserva ã ✓
```

**Como testar**: Enviar mensagem em português com acentos

### Teste 3: Parágrafos
```
"linha1\n\n\n\nlinha2" → "linha1\n\nlinha2" ✓
Múltiplos breaks reduzem para 2
```

**Como testar**: Enviar resposta com múltiplas quebras

### Teste 4: Markdown
```
"**negrito**" → renderiza bold ✓
"- lista" → renderiza bullet ✓
"## título" → renderiza heading ✓
```

**Como testar**: Pedir resposta em markdown

### Teste 5: Código
```
"`const x = 10`" → preserva espaçamento ✓
"```js\n  código\n```" → preserve espaço ✓
```

**Como testar**: Pedir código na resposta

### Teste 6: XSS Prevention
```
"<script>alert('xss')</script>" → bloqueado ✓
"[Click](javascript:...)" → bloqueado ✓
HTML raw → não executado ✓
```

**Como testar**: Injetar HTML (testing only!)

### Teste 7: JSON Extraction
```
Resposta com JSON → JSON extraído para painel ✓
Texto limpo, sem JSON poluindo corpo ✓
```

**Como testar**: Verificar logs com `ECO_DEBUG_NORMALIZER=true`

---

## 📊 Métricas de Performance

Esperado em produção:

| Operação | Tempo | Notas |
|----------|-------|-------|
| `normalizeChunk()` 100 bytes | < 1ms | Unicode + regex |
| `finalizeMessage()` 1000 chars | < 5ms | Sanitização completa |
| Renderizar 100 chunks | < 50ms | React batch updates |
| Streaming 5KB resposta | < 200ms | Total fim a fim |

Para medir:
```javascript
performance.mark('stream-start');
// ... streaming happens ...
performance.mark('stream-end');
performance.measure('total-stream', 'stream-start', 'stream-end');
console.log(performance.getEntriesByName('total-stream')[0].duration);
```

---

## 🐛 Troubleshooting

### Problema: "Palavras aparecem coladas"

**Diagnóstico**:
1. Verificar `localStorage.getItem('ECO_FIX_SPACING_FRONTEND')`
2. Deve retornar `'true'` (string)

**Solução**:
```javascript
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'true');
location.reload();
```

### Problema: "Espaços extra aparecendo"

**Diagnóstico**:
```javascript
localStorage.setItem('ECO_DEBUG_NORMALIZER', 'true');
// Verificar logs [StreamNorm] Processed chunk
```

Se vê `insertedSpaces` muito alto:
- Pode ser que backend já envia espaços
- Desabilitar: `localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'false')`

### Problema: "Markdown não renderiza"

**Diagnóstico**:
- Verificar `MarkdownRenderer.tsx`
- Deve ter `skipHtml={true}`
- Deve ter `allowedElements={[...]}`

**Solução**: Não mexer em `MarkdownRenderer`, sistema de markdown é separado

### Problema: "Testes falhando"

**Solução**:
```bash
npm run test -- StreamTextNormalizer --no-coverage
npm run test -- StreamTextNormalizer --watch
```

---

## ✅ Checklist de Deployment

- [ ] StreamTextNormalizer.ts criado
- [ ] Testes executando (41 passing)
- [ ] Feature flag funcionando
- [ ] Teste manual 1: Colagem ✓
- [ ] Teste manual 2: Acentos ✓
- [ ] Teste manual 3: Parágrafos ✓
- [ ] Teste manual 4: Markdown ✓
- [ ] Teste manual 5: Código ✓
- [ ] Teste manual 6: XSS ✓
- [ ] Teste manual 7: JSON ✓
- [ ] Performance aceitável (< 200ms total)
- [ ] Sem quebras de código existente
- [ ] Documentação atualizada

---

## 📖 Documentação Relacionada

- `FRONTEND_TEXT_PROCESSING_STRATEGY.md` - Estratégia geral de sanitização
- `IMPROVEMENTS_ROADMAP.md` - Melhorias futuras
- `TEXT_PROCESSING_EXAMPLES.md` - Exemplos práticos

---

## 🔗 Links Rápidos

**Usar o normalizer**:
```typescript
import { normalizeChunk, finalizeMessage } from '@/utils/StreamTextNormalizer';

// Ou com hook:
import { useStreamTextNormalizer } from '@/hooks/useStreamTextNormalizer';
const { processChunk, finalize, reset } = useStreamTextNormalizer();
```

**Habilitar debug**:
```javascript
localStorage.setItem('ECO_DEBUG_NORMALIZER', 'true');
```

**Feature flag**:
```javascript
localStorage.setItem('ECO_FIX_SPACING_FRONTEND', 'false'); // Desabilitar
```

---

**Last Updated**: November 2025
**Status**: Ready for Integration
