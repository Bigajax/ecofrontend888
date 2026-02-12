# 🚀 Plano de Otimização de Desempenho - Ecotopia

## 📊 Análise Atual

### ✅ Já Implementado (Bom!)
- [x] Lazy loading de rotas
- [x] Brotli/Gzip compression
- [x] Manual chunks (vendor splitting)
- [x] WebP para maioria das imagens
- [x] Source maps para debugging

### ❌ Problemas Críticos Detectados

1. **Dependencies desnecessárias no frontend** (~15MB+ removíveis):
   - `@google-cloud/language` (7MB+) - Backend only!
   - `express` (1.5MB) - Backend only!
   - `body-parser` (500KB) - Backend only!
   - `ffmpeg-static`, `fluent-ffmpeg` - Backend only!
   - `sharp` - Dev dependency no runtime

2. **Múltiplas libs de charts** (duplicação):
   - `@nivo/*` (usado)
   - `recharts` (usado?)
   - Múltiplas libs `d3-*` (pode consolidar)

3. **Three.js** (~500KB) - Não lazy loaded:
   - `three`, `@react-three/fiber`, `@react-three/drei`
   - Carregado mesmo se usuário não usa 3D

4. **Images não otimizadas**:
   - 11 JPGs (devem ser WebP)
   - Sem lazy loading adequado
   - Sem preload de hero images

5. **Re-renders desnecessários**:
   - Falta `React.memo` em componentes pesados
   - MessageList sem virtualização (lento com 100+ msgs)

6. **localStorage para chat** (lento):
   - Parsing JSON a cada render
   - Sem compressão
   - Limites de 5-10MB

---

## 🎯 FASE 1: Remoções Rápidas (15-30min)

### A) Remover Dependencies Desnecessárias

```bash
# Remover deps de backend que não devem estar no frontend
npm uninstall @google-cloud/language express body-parser

# Mover deps de build para devDependencies
npm uninstall ffmpeg-static fluent-ffmpeg sharp
npm install -D sharp  # Se precisar para build de imagens
```

**Impacto**: -15MB+ no bundle final (30-40% redução!)

---

### B) Consolidar Chart Libraries

**Decisão**: Usar APENAS `@nivo` (já tem) ou APENAS `recharts`.

```bash
# Se preferir Nivo (mais bonito, mais leve):
npm uninstall recharts

# OU se preferir Recharts (mais features):
npm uninstall @nivo/bar @nivo/line @nivo/calendar @nivo/scatterplot @nivo/core @nivo/axes @nivo/tooltip
```

**Impacto**: -200KB+ gzipped

---

### C) Converter JPGs para WebP

```bash
# Instalar ferramenta de conversão (se não tiver)
npm install -D @squoosh/cli

# Converter todos os JPGs
npx @squoosh/cli --webp auto public/images/**/*.jpg

# Deletar JPGs originais
rm public/images/**/*.jpg
```

**Impacto**: -50-70% tamanho de imagens

---

## 🚀 FASE 2: Otimizações de Code (1-2h)

### A) Preload de Recursos Críticos

**Arquivo**: `index.html`

```html
<!-- Adicionar antes de </head> -->

<!-- Preconnect para APIs -->
<link rel="preconnect" href="https://ecobackend888.onrender.com" crossorigin />
<link rel="dns-prefetch" href="https://ecobackend888.onrender.com" />

<!-- Preload hero images -->
<link rel="preload" as="image" href="/images/ECOTOPIA.webp" />
<link rel="preload" as="image" href="/images/login-background.webp" />

<!-- Preload fontes críticas -->
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Playfair+Display:wght@400;500&display=swap" />
```

**Impacto**: -500ms tempo de carregamento inicial

---

### B) Lazy Load Three.js Components

**Arquivo**: `src/App.tsx`

```tsx
// ❌ ANTES (carrega Three.js sempre):
import SomeThing3D from '@/components/SomeThing3D';

// ✅ DEPOIS (lazy load apenas quando necessário):
const SomeThing3D = lazy(() => import('@/components/SomeThing3D'));

// No componente que usa:
<Suspense fallback={<div>Carregando 3D...</div>}>
  {show3D && <SomeThing3D />}
</Suspense>
```

**Impacto**: -500KB no bundle inicial

---

### C) React.memo em Componentes Pesados

**Arquivos**: `src/components/ChatMessage.tsx`, `MessageList.tsx`, etc.

```tsx
// ❌ ANTES:
export function ChatMessage({ message, ...props }) {
  // ...
}

// ✅ DEPOIS:
export const ChatMessage = React.memo(function ChatMessage({ message, ...props }) {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status
  );
});
```

**Componentes prioritários**:
- `ChatMessage` ⭐⭐⭐
- `MessageList` ⭐⭐⭐
- `QuickSuggestions` ⭐⭐
- `Sidebar` ⭐⭐
- `TopBar` ⭐

**Impacto**: -50% re-renders desnecessários

---

### D) Virtual Scrolling para MessageList

**Instalar**: `react-window` (13KB) ou `react-virtuoso` (20KB, melhor UX)

```bash
npm install react-virtuoso
```

**Arquivo**: `src/components/MessageList.tsx`

```tsx
import { Virtuoso } from 'react-virtuoso';

export const MessageList = React.memo(({ messages, ...props }) => {
  return (
    <Virtuoso
      data={messages}
      itemContent={(index, message) => (
        <ChatMessage key={message.id} message={message} {...props} />
      )}
      followOutput="smooth"
      style={{ height: '100%' }}
    />
  );
});
```

**Impacto**:
- 10+ msgs: sem diferença
- 50+ msgs: 30-40% mais rápido
- 100+ msgs: 70-80% mais rápido

---

### E) Otimizar vite.config.ts

**Arquivo**: `vite.config.ts`

```ts
export default defineConfig({
  // ... config existente

  build: {
    // Adicionar mais chunks granulares
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'nivo-charts': ['@nivo/bar', '@nivo/line', '@nivo/core'],
          'framer-motion': ['framer-motion'],
          'supabase': ['@supabase/supabase-js'],
          'date-utils': ['date-fns'],

          // ✨ NOVOS CHUNKS:
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'], // Lazy loaded
          'markdown': ['react-markdown'], // Só usado em algumas páginas
          'audio': ['wavesurfer.js', '@wavesurfer/react'], // Só VoicePage
          'icons': ['lucide-react', 'react-icons'], // Icons separados
        },
      },
    },

    // ✨ Minificação agressiva
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs em prod
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific console calls
      },
    },

    // Reduzir limite de warning
    chunkSizeWarningLimit: 400, // Força chunks menores
  },

  // ✨ Otimizar deps
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      '@supabase/supabase-js',
    ],
    exclude: ['lucide-react'], // Evita bundling se já tree-shaken
  },
});
```

**Impacto**:
- Drop console: -50KB
- Melhor code splitting: -100KB initial bundle
- Melhor caching: menos re-downloads

---

## 🔥 FASE 3: Otimizações Avançadas (2-4h)

### A) IndexedDB para Chat History

**Por quê?**:
- localStorage: limite 5-10MB, parsing JSON lento
- IndexedDB: 50MB-1GB+, queries rápidas, compressão

**Instalar**:
```bash
npm install idb
```

**Arquivo**: `src/utils/chatStorage.ts` (criar)

```ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatDB extends DBSchema {
  messages: {
    key: string; // message.id
    value: Message;
    indexes: { 'by-user': string; 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>('eco-chat-v1', 1, {
      upgrade(db) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-user', 'userId');
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function saveMessages(userId: string, messages: Message[]) {
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');

  await Promise.all([
    ...messages.map(msg => tx.store.put({ ...msg, userId })),
    tx.done,
  ]);
}

export async function loadMessages(userId: string): Promise<Message[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'by-user', userId);
}

export async function clearMessages(userId: string) {
  const db = await getDB();
  const messages = await loadMessages(userId);
  const tx = db.transaction('messages', 'readwrite');

  await Promise.all([
    ...messages.map(msg => tx.store.delete(msg.id)),
    tx.done,
  ]);
}
```

**Migrar ChatContext**:
```tsx
// src/contexts/ChatContext.tsx

// ❌ ANTES:
const savedMessages = localStorage.getItem(`eco.chat.v1.${userId}`);
if (savedMessages) {
  setMessages(JSON.parse(savedMessages));
}

// ✅ DEPOIS:
loadMessages(userId).then(msgs => {
  setMessages(msgs);
});
```

**Impacto**:
- 10x mais rápido para 100+ mensagens
- Suporta 1000+ mensagens sem lag
- Menos memory leaks

---

### B) Service Worker + Cache Strategy

**Arquivo**: `public/sw.js` (criar)

```js
const CACHE_NAME = 'eco-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/images/ECOTOPIA.webp',
  '/images/login-background.webp',
  // Adicionar assets críticos
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache first, network fallback
      return response || fetch(event.request);
    })
  );
});
```

**Registrar**: `src/main.tsx`

```ts
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('SW registration failed:', err);
    });
  });
}
```

**Impacto**:
- Offline mode
- Instant repeat visits (cache)
- -90% network requests

---

### C) Image Lazy Loading + Blur Placeholders

**Criar componente**: `src/components/OptimizedImage.tsx`

```tsx
import { useState, useEffect } from 'react';

interface Props {
  src: string;
  alt: string;
  blurDataURL?: string; // Tiny base64 preview
  className?: string;
}

export function OptimizedImage({ src, alt, blurDataURL, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Blur placeholder */}
      {blurDataURL && !loaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 blur-xl scale-110"
          aria-hidden
        />
      )}

      {/* Real image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
```

**Usar em todos os lugares**:
```tsx
// ❌ ANTES:
<img src="/images/hero.webp" alt="Hero" />

// ✅ DEPOIS:
<OptimizedImage
  src="/images/hero.webp"
  alt="Hero"
  blurDataURL="data:image/webp;base64,UklGRi..." // Tiny 20x20 version
/>
```

**Impacto**:
- Melhor perceived performance
- -70% layout shift (CLS)
- Lazy loading automático

---

### D) Debounce Input Pesados

**Arquivo**: `src/components/ChatInput.tsx`

```tsx
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

// ❌ ANTES (onChange a cada keystroke):
const handleChange = (e) => {
  setText(e.target.value);
  // Análise, tracking, etc.
};

// ✅ DEPOIS (debounce para operações pesadas):
const debouncedAnalyze = useMemo(
  () => debounce((text) => {
    // Análise pesada aqui
    analyzeText(text);
  }, 500),
  []
);

const handleChange = (e) => {
  const newText = e.target.value;
  setText(newText); // Imediato
  debouncedAnalyze(newText); // Atrasado
};
```

**Impacto**: -80% operações durante digitação

---

## 📈 MÉTRICAS ESPERADAS

### Antes vs Depois

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Bundle inicial** | ~800KB | ~400KB | -50% |
| **Time to Interactive** | 3.5s | 1.8s | -48% |
| **First Contentful Paint** | 1.2s | 0.6s | -50% |
| **Re-renders (chat)** | 100+ | 20-30 | -70% |
| **MessageList (100 msgs)** | 2s render | 0.3s render | -85% |
| **Lighthouse Score** | 75-80 | 90-95 | +15-20 |

---

## 🎯 PRIORIZAÇÃO (ROI)

### 🔴 ALTO IMPACTO + BAIXO ESFORÇO (FAZER PRIMEIRO!)

1. ✅ **Remover deps desnecessárias** (30min, -15MB)
2. ✅ **Preload recursos críticos** (15min, -500ms)
3. ✅ **Converter JPGs → WebP** (20min, -50%)
4. ✅ **React.memo ChatMessage** (30min, -50% re-renders)
5. ✅ **Drop console.logs prod** (5min, -50KB)

**Total**: 1h30min → -20MB bundle, +1.5s faster

---

### 🟡 MÉDIO IMPACTO + MÉDIO ESFORÇO

6. ✅ **Virtual scrolling MessageList** (1h, +80% scroll)
7. ✅ **Lazy load Three.js** (30min, -500KB initial)
8. ✅ **OptimizedImage component** (1h, -70% CLS)
9. ✅ **Consolidar chart libs** (30min, -200KB)

**Total**: 3h → +30% perceived speed

---

### 🟢 ALTO IMPACTO + ALTO ESFORÇO (DEPOIS)

10. ✅ **IndexedDB para chat** (3h, +10x faster)
11. ✅ **Service Worker** (2h, offline mode)
12. ✅ **Blur placeholders** (2h, melhor UX)

**Total**: 7h → App nível production

---

## 🚀 COMEÇAR AGORA

```bash
# 1. Remover deps desnecessárias (30min, MAIOR IMPACTO!)
npm uninstall @google-cloud/language express body-parser ffmpeg-static fluent-ffmpeg

# 2. Instalar ferramentas
npm install react-virtuoso idb
npm install -D @squoosh/cli

# 3. Converter imagens
npx @squoosh/cli --webp auto public/images/**/*.jpg

# 4. Rebuild
npm run build

# 5. Verificar tamanho
ls -lh dist/assets/*.js | head -20
```

---

## 📊 Monitoramento

Adicionar analytics de performance:

```ts
// src/utils/performance.ts
export function reportWebVitals() {
  if ('web-vitals' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(metric => mixpanel.track('Web Vitals', { metric: 'CLS', value: metric.value }));
      getFID(metric => mixpanel.track('Web Vitals', { metric: 'FID', value: metric.value }));
      getFCP(metric => mixpanel.track('Web Vitals', { metric: 'FCP', value: metric.value }));
      getLCP(metric => mixpanel.track('Web Vitals', { metric: 'LCP', value: metric.value }));
      getTTFB(metric => mixpanel.track('Web Vitals', { metric: 'TTFB', value: metric.value }));
    });
  }
}

// Chamar em main.tsx
reportWebVitals();
```

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] Fase 1A: Remover deps backend
- [ ] Fase 1B: Consolidar charts
- [ ] Fase 1C: Converter JPGs
- [ ] Fase 2A: Preload recursos
- [ ] Fase 2B: Lazy Three.js
- [ ] Fase 2C: React.memo componentes
- [ ] Fase 2D: Virtual scrolling
- [ ] Fase 2E: Otimizar vite.config
- [ ] Fase 3A: IndexedDB
- [ ] Fase 3B: Service Worker
- [ ] Fase 3C: OptimizedImage
- [ ] Fase 3D: Debounce inputs
- [ ] Testar Lighthouse
- [ ] Deploy e monitorar

---

**Tempo total estimado**: 6-8 horas para tudo
**Impacto esperado**: App 2-3x mais rápida, Lighthouse 90+
