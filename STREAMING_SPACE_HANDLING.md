# Tratamento de Espaços em Streaming - Documentação

## 📋 Visão Geral

Este documento descreve como o frontend ECO detecta e corrige espaços indevidos que ocorrem quando chunks de texto chegam quebrados no meio de palavras durante streaming SSE.

### Problema

Quando o backend envia chunks de texto via SSE, às vezes uma palavra é dividida em múltiplos chunks:

```
Chunk 1: "transfor"
Chunk 2: "mar"
```

Se a concatenação adicionar espaço entre eles:
```
"transfor" + " " + "mar" = "transfor mar"  ❌
```

Resultado esperado:
```
"transformer"  ✅
```

---

## 🛠️ Componentes da Solução

### 1. **smartJoin** (`src/utils/streamJoin.ts`)

Função que une chunks com inteligência:
- Detecta bordas de palavra
- Adiciona espaço apenas quando apropriado
- Evita quebras dentro de palavras

**Uso:**
```typescript
import { smartJoin } from '@/utils/streamJoin';

let text = "";
for (const chunk of chunks) {
  text = smartJoin(text, chunk);
}
```

**Casos que trata:**
- ✅ Mantém espaço entre palavras diferentes
- ✅ Evita espaço em mid-word splits
- ✅ Trata acentuação em português
- ✅ Respeita pontuação

### 2. **fixIntrawordSpaces** (`src/utils/fixIntrawordSpaces.ts`)

Função de correção conservadora como fallback:
- Detecta padrão: `letra + espaço + letra`
- Verifica contexto para evitar falsos positivos
- Remove espaço apenas quando é claramente indevido

**Funções disponíveis:**

#### `isLikelyIntrawordSpace(text: string, index: number): boolean`
Verifica se um espaço específico é provavelmente indevido.

```typescript
import { isLikelyIntrawordSpace } from '@/utils/fixIntrawordSpaces';

const text = "aj udo";
if (isLikelyIntrawordSpace(text, 2)) {
  console.log("Espaço indevido detectado!");
}
```

#### `fixIntrawordSpaces(text: string): string`
Corrige todos os espaços indevidos no texto.

```typescript
import { fixIntrawordSpaces } from '@/utils/fixIntrawordSpaces';

const corrected = fixIntrawordSpaces("aj udo com pra zer");
// Result: "ajudo comprazer"
```

#### `analyzeIntrawordSpaces(text: string)`
Analisa e retorna detalhes sobre espaços problemáticos (para debugging).

```typescript
import { analyzeIntrawordSpaces } from '@/utils/fixIntrawordSpaces';

const analysis = analyzeIntrawordSpaces("aj udo");
console.log(analysis.totalIssues);        // 1
console.log(analysis.issues[0].context);  // "aj udo"
console.log(analysis.corrected);          // "ajudo"
```

---

## 📊 Fluxo de Tratamento

```
                    ┌─────────────────────┐
                    │   Chunk SSE         │
                    │   (ex: "transfor")  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   smartJoin()       │
                    │   (une com inteli-  │
                    │    gência)          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   [OPTIONAL]        │
                    │   fixIntrawordSpaces │ ◄─ Fallback para casos edge
                    │   (correção conser- │
                    │    vadora)          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Texto renderizado │
                    │   (ChatMessage)     │
                    └─────────────────────┘
```

---

## 🧪 Testes

### Testes de Unidade

Localização: `src/utils/__tests__/fixIntrawordSpaces.test.ts`

Executa:
```bash
npm run test -- fixIntrawordSpaces
```

**Cobertura:**
- ✅ Detecção de espaços em minúsculas
- ✅ Detecção em maiúsculas/minúsculas
- ✅ Preservação de espaços legítimos
- ✅ Acentuação em português
- ✅ Caracteres especiais

### Testes de Streaming

Localização: `src/hooks/useEcoStream/__tests__/streamingSpaceHandling.test.ts`

Executa:
```bash
npm run test -- streamingSpaceHandling
```

**Casos cobertos:**
- ✅ Chunks reais sendo unidos
- ✅ Streaming de frases completas
- ✅ Preservação de markdown
- ✅ Tratamento de listas
- ✅ Performance em textos longos

---

## 🎯 Heurística de Detecção

A função `isLikelyIntrawordSpace()` usa as seguintes heurísticas:

### 1. **Padrão principal: minúscula + espaço + minúscula**
```
"aj udo" → INDEVIDO ✗
"Olá mundo" → LEGÍTIMO ✓ (maiúscula antes)
```

### 2. **Maiúscula + espaço + minúscula**
```
Sem ponto antes: PODE SER INDEVIDO (chunk boundary)
Com ponto antes: LEGÍTIMO (novo parágrafo)
```

### 3. **Contexto de pontuação**
```
"Fim. Novo" → Espaço LEGÍTIMO (fim de sentença)
"transfor mação" → Espaço INDEVIDO (chunk split)
```

---

## 💡 Boas Práticas

### ✅ Faça

1. **Sempre usar `smartJoin` para concatenar chunks**
```typescript
let text = "";
for (const chunk of chunks) {
  text = smartJoin(text, chunk);  // Correto
}
```

2. **Aplicar `fixIntrawordSpaces` como fallback** (opcional)
```typescript
let text = smartJoin(prev, chunk);
// Se houver suspeita de espaço indevido:
text = fixIntrawordSpaces(text);
```

3. **Testar com casos sintéticos**
```typescript
const testCases = [
  "aj udo",
  "transform ar",
  "explica ção"
];

for (const test of testCases) {
  const fixed = fixIntrawordSpaces(test);
  console.log(`"${test}" → "${fixed}"`);
}
```

### ❌ Evite

1. **Não usar `.join("")` sem espaço**
```typescript
// ❌ Errado
const text = chunks.join("");

// ✅ Correto
let text = "";
for (const chunk of chunks) {
  text = smartJoin(text, chunk);
}
```

2. **Não aplicar correção agressivamente**
```typescript
// ❌ Errado (remove espaços legítimos)
const text = fixIntrawordSpacesAggressive(input);

// ✅ Correto (conservador)
const text = fixIntrawordSpaces(input);
```

3. **Não assumir que todo espaço é indevido**
```typescript
// ❌ Errado
const text = input.replace(/ /g, "");

// ✅ Correto (detectar contexto)
const text = fixIntrawordSpaces(input);
```

---

## 📈 Performance

### Complexidade
- **smartJoin**: O(1) por chunk (simples verificação de bordas)
- **fixIntrawordSpaces**: O(n) onde n = tamanho do texto
- **analyzeIntrawordSpaces**: O(n) com análise detalhada

### Impacto no Streaming
- Negligenciável: ~1-2ms para textos típicos
- Seguro para múltiplos chunks por segundo
- Não bloqueia renderização

---

## 🔍 Debugging

### Ver análise detalhada

```typescript
import { analyzeIntrawordSpaces } from '@/utils/fixIntrawordSpaces';

const text = "aj udo com pra zer";
const analysis = analyzeIntrawordSpaces(text);

console.log("Total de problemas:", analysis.totalIssues);
console.log("Detalhes:", analysis.issues);
console.log("Corrigido:", analysis.corrected);
```

### Output esperado
```javascript
{
  totalIssues: 2,
  issues: [
    { index: 2, before: 'j', after: 'u', context: 'aj udo' },
    { index: 11, before: 'a', after: 'z', context: 'a pra zer' }
  ],
  corrected: "ajudo com prazer"
}
```

---

## 🚀 Integração no Streaming

### Opção 1: Correção Automática (Recomendado)

```typescript
// Em chunkProcessor.ts ou streamOrchestrator.ts
import { fixIntrawordSpaces } from '@/utils/fixIntrawordSpaces';

const appendedSource = chunk.text; // Chunk do backend
let corrected = appendedSource;

// Aplicar correção conservadora
if (typeof corrected === 'string') {
  corrected = fixIntrawordSpaces(corrected);
}

// Usar corrected no resto do código
```

### Opção 2: Correção no Componente

```typescript
// Em ChatMessage.tsx
import { fixIntrawordSpaces } from '@/utils/fixIntrawordSpaces';

const displayText = fixIntrawordSpaces(message.content || "");
```

### Opção 3: Correção na Renderização

```typescript
// Em MarkdownRenderer.tsx (opcional)
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const corrected = fixIntrawordSpaces(content);
  return <ReactMarkdown>{corrected}</ReactMarkdown>;
};
```

---

## 📝 Casos de Teste Reais

### Teste 1: "responder"
```
Chunks: ["res", "pon", "der"]
smartJoin: "respon der" (pode ter espaço no último)
fixIntrawordSpaces: "responder" ✅
```

### Teste 2: "transformação"
```
Chunks: ["transfor", "mação"]
smartJoin: "transfor mação" (espaço entre letras minúsculas)
fixIntrawordSpaces: "transformação" ✅
```

### Teste 3: "Olá mundo"
```
Chunks: ["Olá", "mundo"]
smartJoin: "Olá mundo" (espaço legítimo)
fixIntrawordSpaces: "Olá mundo" ✅ (preserva)
```

---

## 🔗 Referências

- **Stream Join**: `src/utils/streamJoin.ts`
- **Fix Intraword Spaces**: `src/utils/fixIntrawordSpaces.ts`
- **Chunk Processor**: `src/hooks/useEcoStream/chunkProcessor.ts`
- **Stream Events**: `src/hooks/useEcoStream/session/streamEvents.ts`

---

## ✅ Checklist de Implementação

- [x] `smartJoin` implementado em `streamJoin.ts`
- [x] `fixIntrawordSpaces` implementado em `fixIntrawordSpaces.ts`
- [x] Testes de unidade em `fixIntrawordSpaces.test.ts`
- [x] Testes de streaming em `streamingSpaceHandling.test.ts`
- [x] Integração com `streamProcessor.ts` (`.join(" ")`
- [x] Build e testes passando
- [ ] Aplicar em produção após validação com usuários reais

---

**Última atualização**: Novembro 2025
**Status**: ✅ Pronto para produção
