# 🔄 Migração @nivo → Recharts - ProfileSection.tsx

**Arquivo:** `src/pages/memory/ProfileSection.tsx`
**Tempo:** 15-20 minutos
**Economia:** -550 kB (-180 kB gzip)

---

## 📝 **MUDANÇAS NECESSÁRIAS**

### **Passo 1: Atualizar imports (linhas 13-21)**

**❌ ANTES:**
```typescript
/* ===== Lazy Nivo (tipado) ===== */
const LazyResponsiveLine = lazy(async () => {
  const mod = await import('@nivo/line');
  return { default: mod.ResponsiveLine as unknown as React.ComponentType<any> };
});
const LazyResponsiveBar = lazy(async () => {
  const mod = await import('@nivo/bar');
  return { default: mod.ResponsiveBar as unknown as React.ComponentType<any> };
});
```

**✅ DEPOIS:**
```typescript
/* ===== Lazy Recharts (replacement for Nivo) ===== */
import { LazyBarChart } from '../../components/charts/LazyRechartsWrapper';
// LazyResponsiveLine → usar Recharts LineChart (se necessário)
```

---

### **Passo 2: Atualizar uso de LazyResponsiveBar (linha 481)**

**Localizar:**
```typescript
<LazyResponsiveBar
  data={emotionChart}
  keys={['value']}
  indexBy="name"
  // ... props Nivo
/>
```

**Substituir por:**
```typescript
<LazyBarChart
  data={emotionChart}
  height={230}
  barSize={37}
  colorAccessor={(item) => colorForEmotion(item.name)}
/>
```

---

### **Passo 3: Atualizar uso de LazyResponsiveBar (linha 550)**

**Mesmo padrão da etapa anterior.**

---

### **Passo 4: Atualizar uso de LazyResponsiveLine (linha 416)**

**Opção A - Usar Recharts LineChart:**

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// No JSX:
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={lineChartData}>
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
```

**Opção B - Comentar temporariamente (se não for crítico):**

```typescript
{/* TODO: Migrar LazyResponsiveLine para Recharts LineChart */}
<div className="text-center py-8 text-gray-500">
  Gráfico de linha em manutenção
</div>
```

---

## 🗑️ **Passo 5: Remover dependências**

```bash
npm uninstall @nivo/bar @nivo/line @nivo/core
```

---

## ⚙️ **Passo 6: Atualizar vite.config.ts**

**Remover do manualChunks (linha 143):**

```typescript
// ❌ DELETAR ESTA LINHA:
'nivo-charts': ['@nivo/bar', '@nivo/line', '@nivo/core'],
```

---

## 🗂️ **Passo 7: Deletar arquivos antigos**

```bash
rm src/components/charts/LazyCharts.tsx
rm src/types/nivo.d.ts
```

---

## 🧪 **Passo 8: Testar**

```bash
# Limpar cache
rm -rf node_modules package-lock.json .vite
npm install

# Build
npm run build

# Verificar que nivo-charts.js NÃO existe
ls dist/assets/ | grep nivo
# (deve retornar vazio)

# Preview local
npm run preview
# Abrir http://localhost:4173/app/memory/profile
```

---

## ✅ **Checklist de validação**

- [ ] Imports atualizados
- [ ] LazyResponsiveBar substituído por LazyBarChart (2x)
- [ ] LazyResponsiveLine substituído ou comentado (1x)
- [ ] `npm uninstall @nivo/bar @nivo/line @nivo/core`
- [ ] vite.config.ts atualizado (remover 'nivo-charts')
- [ ] LazyCharts.tsx deletado
- [ ] nivo.d.ts deletado
- [ ] `npm run build` sem erros
- [ ] Gráficos renderizam em `/app/memory/profile`
- [ ] Cores estão corretas
- [ ] Tooltip funciona
- [ ] Bundle NÃO contém `nivo-charts-*.js`

---

## 📊 **Validação de sucesso**

**Antes:**
```
dist/assets/nivo-charts-DXjvRW60.js: 641.58 kB (gzip: 217.19 kB)
```

**Depois:**
```
dist/assets/nivo-charts-*.js: REMOVIDO ✅
```

**Bundle total reduzido em ~550 kB (-180 kB gzip)** 🎉

---

## 🔧 **Se algo der errado:**

```bash
# Reverter git
git reset --hard HEAD

# Reinstalar deps
rm -rf node_modules package-lock.json
npm install

# Build limpo
npm run build
```

---

**Tempo total:** 15-20 minutos
**Próximo Quick Win:** Lazy load html2canvas (ver OPTIMIZATION_CHECKLIST.md)
