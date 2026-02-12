# 🚀 Quick Win: Remover @nivo e Migrar para Recharts

**Economia estimada:** -550 kB (-180 kB gzip) = **83% de redução no bundle de charts**

---

## 📋 Checklist de Implementação

### Passo 1: Identificar todos os usos de Nivo

**Arquivos que usam Nivo:**
- ✅ `src/components/charts/LazyCharts.tsx` (wrapper)
- ✅ `src/pages/memory/ProfileSection.tsx` (usa LazyCharts)
- ⚠️ Verificar se há outros imports

**Comando para verificar:**
```bash
# Procurar todos os imports de @nivo
grep -r "@nivo" src/
```

---

### Passo 2: Criar componente Recharts equivalente

**Criar:** `src/components/charts/LazyRechartsWrapper.tsx`

```typescript
import { lazy, Suspense } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Chart loading skeleton (reutilizar do LazyCharts)
function ChartSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-xs text-gray-400">Carregando gráfico...</p>
      </div>
    </div>
  );
}

// Custom Tooltip (mesmo estilo do MemoryPage)
const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '8px 12px',
        boxShadow: '0 8px 18px rgba(0,0,0,.06)',
        color: '#374151',
        fontSize: '0.85rem',
      }}
    >
      <div className="font-medium">{label}</div>
      <div>{payload[0].value}</div>
    </div>
  ) : null;

// Wrapper component para BarChart
interface BarChartData {
  name: string;
  value: number;
  color?: string;
}

interface LazyBarChartProps {
  data: BarChartData[];
  height?: number;
  barSize?: number;
  colorAccessor?: (item: BarChartData) => string;
}

export function LazyBarChart({
  data,
  height = 230,
  barSize = 37,
  colorAccessor = (item) => item.color || '#3b82f6',
}: LazyBarChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 5, left: 5, bottom: 40 }}
          barCategoryGap="30%"
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#111827', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 'dataMax + 5']}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" barSize={barSize} radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={colorAccessor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
```

---

### Passo 3: Atualizar ProfileSection.tsx

**Antes:**
```typescript
import { LazyResponsiveBar } from '../../components/charts/LazyCharts';
```

**Depois:**
```typescript
import { LazyBarChart } from '../../components/charts/LazyRechartsWrapper';
```

**Atualizar uso:**
```typescript
// Antes (Nivo)
<LazyResponsiveBar
  data={emotionChart}
  keys={['value']}
  indexBy="name"
  // ... props Nivo
/>

// Depois (Recharts)
<LazyBarChart
  data={emotionChart}
  height={230}
  barSize={37}
  colorAccessor={(item) => chartColorForEmotion(item.name)}
/>
```

---

### Passo 4: Deletar arquivo antigo

```bash
rm src/components/charts/LazyCharts.tsx
```

---

### Passo 5: Remover dependências do package.json

```bash
npm uninstall @nivo/bar @nivo/line @nivo/core
```

**Ou editar manualmente:**
```json
// package.json - REMOVER estas linhas:
"@nivo/bar": "^0.99.0",
"@nivo/core": "0.85.0",
"@nivo/line": "0.85.0",
```

---

### Passo 6: Atualizar vite.config.ts

**Remover do manualChunks:**
```typescript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      'react-vendor': ['react', 'react-dom', 'react-router-dom'],
      // ❌ REMOVER ESTA LINHA:
      // 'nivo-charts': ['@nivo/bar', '@nivo/line', '@nivo/core'],
      'framer-motion': ['framer-motion'],
      'supabase': ['@supabase/supabase-js'],
      // ...
    }
  }
}
```

---

### Passo 7: Deletar tipos de Nivo (opcional)

```bash
rm src/types/nivo.d.ts
```

---

### Passo 8: Rebuild e testar

```bash
# Limpar cache e node_modules
rm -rf node_modules package-lock.json
npm install

# Build e analisar
npm run build:analyze

# Preview local
npm run preview
```

---

## 🧪 Testes necessários

### Testes visuais:
- [ ] Abrir `/app/memory/profile`
- [ ] Verificar que gráficos "Emoções mais frequentes" renderizam
- [ ] Verificar que gráficos "Temas mais recorrentes" renderizam
- [ ] Verificar que cores estão corretas
- [ ] Verificar que tooltip funciona ao hover
- [ ] Verificar que loading skeleton aparece durante lazy load

### Testes funcionais:
- [ ] Verificar que filtros de emoções funcionam
- [ ] Verificar que dados atualizam corretamente
- [ ] Verificar que não há console errors

---

## 📊 Validação de sucesso

**Antes:**
```
nivo-charts-DXjvRW60.js: 641.58 kB (gzip: 217.19 kB)
```

**Depois (esperado):**
```
nivo-charts bundle: REMOVIDO ✅
Recharts já incluído em index-CKUV1g44.js (sem aumento significativo)
```

**Como validar:**
1. Rodar `npm run build`
2. Verificar que **NÃO** existe arquivo `nivo-charts-*.js` em `dist/assets/`
3. Verificar tamanho total do bundle reduziu ~550 kB

---

## 🔧 Troubleshooting

### Problema: Gráficos não aparecem
**Solução:** Verificar que data está no formato correto:
```typescript
// Recharts espera:
const data = [
  { name: 'Alegria', value: 10 },
  { name: 'Tristeza', value: 5 },
];
```

### Problema: Cores não funcionam
**Solução:** Verificar colorAccessor está retornando cor válida (hex/rgb)

### Problema: Build error após remover @nivo
**Solução:**
```bash
rm -rf node_modules package-lock.json .vite
npm install
npm run build
```

---

## ⏱️ Tempo estimado: **30-45 minutos**

- Criar LazyRechartsWrapper: 10 min
- Atualizar ProfileSection: 10 min
- Remover dependências e configs: 5 min
- Rebuild e testar: 10 min
- Validar visualmente: 10 min

---

## 🎯 Resultado esperado

✅ Bundle reduzido em ~550 kB (-180 kB gzip)
✅ Uma única biblioteca de charts (Recharts)
✅ Melhor consistência visual entre páginas
✅ Build time reduzido
✅ Zero breaking changes para usuário final

---

**Próximo Quick Win após este:** Lazy load html2canvas (-201 kB) 🚀
