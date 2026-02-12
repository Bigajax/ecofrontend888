# ✅ Checklist de Otimizações - ECOTOPIA Frontend

**Meta:** Reduzir bundle inicial de ~1.8 MB para ~0.85 MB (-53%)

---

## 🔥 **FASE 1: QUICK WINS** (2-3 horas | -948 kB)

### 1️⃣ Remover @nivo e usar apenas Recharts
**Impacto:** -550 kB (-180 kB gzip)

- [ ] Criar `src/components/charts/LazyRechartsWrapper.tsx`
- [ ] Atualizar `src/pages/memory/ProfileSection.tsx`
- [ ] Deletar `src/components/charts/LazyCharts.tsx`
- [ ] Deletar `src/types/nivo.d.ts`
- [ ] `npm uninstall @nivo/bar @nivo/line @nivo/core`
- [ ] Remover 'nivo-charts' do vite.config.ts manualChunks
- [ ] Testar `/app/memory/profile`
- [ ] `npm run build:analyze` → validar remoção

**Arquivo guia:** `QUICK_WIN_GUIDE.md`

---

### 2️⃣ Lazy Load html2canvas
**Impacto:** -201 kB do bundle inicial (-48 kB gzip)

- [ ] Procurar onde html2canvas é usado:
  ```bash
  grep -r "html2canvas" src/
  ```
- [ ] Substituir import estático por dinâmico:
  ```typescript
  // Antes
  import html2canvas from 'html2canvas';

  // Depois
  const handleShare = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element);
  };
  ```
- [ ] Testar funcionalidade de compartilhamento
- [ ] `npm run build` → validar que html2canvas é chunk separado

**Arquivos prováveis:**
- DiarioEstoicoPage (compartilhar reflexão)
- MemoryCard (compartilhar memória)

---

### 3️⃣ Code-Split ChatPage
**Impacto:** -80 kB (-25 kB gzip)

- [ ] Identificar subcomponents grandes do ChatPage:
  ```bash
  ls -lh src/components/ | grep -i "chat\|voice\|feedback"
  ```

- [ ] Lazy load VoicePanel:
  ```typescript
  // src/pages/ChatPage.tsx
  const VoicePanel = lazy(() => import('../components/VoicePanel'));
  ```

- [ ] Lazy load FeedbackPrompt:
  ```typescript
  const FeedbackPrompt = lazy(() => import('../components/feedback/FeedbackPrompt'));
  ```

- [ ] Envolver em Suspense:
  ```typescript
  <Suspense fallback={<div>Carregando...</div>}>
    <VoicePanel />
  </Suspense>
  ```

- [ ] Testar página de chat completa
- [ ] `npm run build:analyze` → verificar chunks separados

---

### 4️⃣ Lazy Load react-markdown
**Impacto:** -117 kB do bundle inicial (-36 kB gzip)

- [ ] Procurar onde react-markdown é usado:
  ```bash
  grep -r "react-markdown" src/
  ```

- [ ] Criar wrapper com lazy load:
  ```typescript
  // src/components/LazyMarkdown.tsx
  import { lazy, Suspense } from 'react';

  const ReactMarkdown = lazy(() => import('react-markdown'));

  export default function LazyMarkdown({ children, ...props }) {
    return (
      <Suspense fallback={<div className="animate-pulse">...</div>}>
        <ReactMarkdown {...props}>{children}</ReactMarkdown>
      </Suspense>
    );
  }
  ```

- [ ] Substituir imports de react-markdown por LazyMarkdown
- [ ] Testar páginas que usam markdown (Diário Estoico, Meditações)
- [ ] `npm run build` → validar chunk separado

---

## ⚡ **FASE 2: CODE SPLITTING** (3-4 horas | -50 kB)

### 5️⃣ Otimizar CSS com PurgeCSS
**Impacto:** -50 kB (-8 kB gzip)

- [ ] Verificar tailwind.config.js atual:
  ```javascript
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ]
  ```

- [ ] Adicionar safelist para classes dinâmicas:
  ```javascript
  safelist: [
    // Classes geradas dinamicamente (ex: bg-[emotion]-500)
    {
      pattern: /bg-(red|blue|green|yellow|purple|pink)-(100|200|300|400|500|600)/,
    },
    {
      pattern: /text-(red|blue|green|yellow|purple|pink)-(500|600|700|800)/,
    },
  ]
  ```

- [ ] Build e comparar tamanho do CSS
- [ ] Testar visualmente todas as páginas principais

---

### 6️⃣ Melhorar manualChunks no vite.config.ts
**Impacto:** Melhor caching (não reduz tamanho total)

- [ ] Adicionar chunk de analytics:
  ```typescript
  'analytics': ['mixpanel-browser'],
  ```

- [ ] Separar contextos:
  ```typescript
  'contexts': [
    '/src/contexts/AuthContext',
    '/src/contexts/ChatContext',
    '/src/contexts/GuestExperienceContext',
  ],
  ```

- [ ] Separar API clients:
  ```typescript
  'api-clients': [
    '/src/api/ecoApi',
    '/src/api/memoriaApi',
    '/src/api/voiceApi',
  ],
  ```

- [ ] `npm run build:analyze` → verificar distribuição de chunks
- [ ] Validar que nenhum chunk excede 500 kB

---

## 🛠️ **FASE 3: POLIMENTO** (2 horas | -10 kB)

### 7️⃣ Merge Small Chunks
**Impacto:** Reduzir HTTP requests

- [ ] Adicionar ao vite.config.ts:
  ```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: { /* ... */ },
        experimentalMinChunkSize: 5000, // 5 KB mínimo
      }
    }
  }
  ```

- [ ] `npm run build` → verificar que não há chunks < 5 KB
- [ ] Testar que app funciona corretamente

---

### 8️⃣ Tree Shaking de lucide-react
**Impacto:** -10 kB (-3 kB gzip)

- [ ] Verificar se imports são tree-shakeable:
  ```typescript
  // Já está OK (imports nomeados)
  import { ArrowLeft, User } from 'lucide-react';
  ```

- [ ] Se necessário, usar imports diretos:
  ```typescript
  import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
  ```

- [ ] `npm run build:analyze` → verificar tamanho do icons chunk

---

### 9️⃣ Adicionar Preload/Prefetch Hints
**Impacto:** Melhora percebida de performance

- [ ] Adicionar ao `index.html`:
  ```html
  <!-- Preload critical chunks -->
  <link rel="modulepreload" href="/assets/react-vendor.js">
  <link rel="modulepreload" href="/assets/index.js">

  <!-- Prefetch likely next pages -->
  <link rel="prefetch" href="/assets/ChatPage.js">
  <link rel="prefetch" href="/assets/HomePage.js">
  ```

- [ ] Testar com Chrome DevTools Network tab
- [ ] Validar que recursos são preloaded

---

## 🧪 **FASE 4: VALIDAÇÃO** (1 hora)

### 🔍 Análise de Bundle

- [ ] Rodar bundle analyzer:
  ```bash
  npm run build:analyze
  ```

- [ ] Verificar métricas:
  - [ ] Nenhum chunk > 400 kB
  - [ ] Initial bundle < 1 MB (atual: ~1.8 MB)
  - [ ] Gzipped initial < 400 kB (atual: ~580 kB)

- [ ] Identificar novos problemas (se houver)

---

### 🌐 Testes de Performance

- [ ] Build de produção:
  ```bash
  npm run build
  npm run preview
  ```

- [ ] Abrir Chrome DevTools → Lighthouse
- [ ] Rodar audit (Desktop + Mobile)
- [ ] Verificar métricas:
  - [ ] Performance Score > 90
  - [ ] First Contentful Paint < 1.8s
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Time to Interactive < 3.0s
  - [ ] Total Blocking Time < 300ms

---

### ✅ Testes Funcionais

- [ ] Página inicial (`/`)
- [ ] Chat (`/app`)
- [ ] Diário Estoico (`/app/diario-estoico`)
- [ ] Meditações (`/app/energy-blessings`)
- [ ] Five Rings (`/app/rings`)
- [ ] Memory (`/app/memory`)
- [ ] Profile (`/app/memory/profile`)
- [ ] Report (`/app/memory/report`)
- [ ] Configurações (`/app/configuracoes`)

**Para cada página:**
- [ ] Carrega corretamente
- [ ] Sem console errors
- [ ] Animações suaves
- [ ] Lazy loaded chunks funcionam

---

## 📊 **MÉTRICAS DE SUCESSO**

### Bundle Size

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| **Initial Bundle** | 1.8 MB | < 0.9 MB | ⏳ |
| **Gzipped Initial** | 580 kB | < 400 kB | ⏳ |
| **Largest Chunk** | 641 kB | < 400 kB | ⏳ |
| **CSS** | 163 kB | < 120 kB | ⏳ |

### Performance

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| **Lighthouse Score** | ? | > 90 | ⏳ |
| **FCP** | ~2.1s | < 1.8s | ⏳ |
| **LCP** | ~3.2s | < 2.5s | ⏳ |
| **TTI** | ~4.5s | < 3.0s | ⏳ |
| **TBT** | ~890ms | < 300ms | ⏳ |

---

## 🎯 **PRIORIZAÇÃO RECOMENDADA**

### Semana 1: Quick Wins
- Dia 1: Remover @nivo (Tarefa 1)
- Dia 2: Lazy load html2canvas e markdown (Tarefas 2 e 4)
- Dia 3: Code-split ChatPage (Tarefa 3)
- Dia 4: Testar e validar

**Resultado esperado:** -948 kB (-53% do bundle)

### Semana 2: Code Splitting
- Dia 1: Otimizar CSS (Tarefa 5)
- Dia 2: Melhorar manualChunks (Tarefa 6)
- Dia 3: Polimento (Tarefas 7-9)
- Dia 4: Validação final (Fase 4)

**Resultado esperado:** Bundle otimizado e validado

---

## 📝 **COMANDOS ÚTEIS**

```bash
# Análise de bundle
npm run build:analyze

# Build de produção
npm run build

# Preview local
npm run preview

# Limpar cache
rm -rf node_modules package-lock.json .vite
npm install

# Procurar imports
grep -r "import.*from.*'@nivo'" src/
grep -r "html2canvas" src/
grep -r "react-markdown" src/

# Analisar tamanho de arquivos
ls -lh dist/assets/*.js | sort -k 5 -h
```

---

## 🚨 **ROLLBACK PLAN**

Se algo der errado:

```bash
# Reverter mudanças do git
git reset --hard HEAD

# Restaurar node_modules
rm -rf node_modules package-lock.json
npm install

# Build limpo
npm run build
```

---

## 📚 **RECURSOS ADICIONAIS**

- **Bundle Analyzer Report:** `dist/stats.html` (após `npm run build:analyze`)
- **Performance Guide:** `PERFORMANCE_REPORT.md`
- **Quick Win Guide:** `QUICK_WIN_GUIDE.md`
- **Lighthouse:** Chrome DevTools → Audits
- **Bundle Buddy:** `npx bundle-buddy dist/stats.json`

---

**Status Atual:** ⏳ Aguardando implementação
**Última atualização:** 2026-02-12
**Owner:** @rafael

---

**🎯 Próximo passo:** Começar pela Tarefa 1 (Remover @nivo) - 30-45 minutos
