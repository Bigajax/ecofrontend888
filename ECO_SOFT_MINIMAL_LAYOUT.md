# ECO Soft Minimal Layout - Documentação

## 🎨 Visão Geral

Este documento descreve os componentes do **ECO Soft Minimal Layout**, implementando o design "Eco x Claude" com foco em harmonia visual, translucidez e calma.

### Filosofia de Design

- **Estética**: Pastel, translúcido, acolhedor
- **Tipografia**: Inter (corpo) + Playfair Display (títulos)
- **Paleta**: Tons terrosos (#FAF9F7, #F3EEE7, #A7846C, #38322A)
- **Movimento**: Transições lentas (300ms), animações suaves
- **Princípio**: "Nada grita. Tudo convida."

---

## 📦 Componentes Criados

### 1. EcoSidebar

**Localização**: `src/components/EcoSidebar.tsx`

Menu lateral translúcido com navegação principal do aplicativo.

#### Características

- ✨ Fundo translúcido `bg-white/50` com `backdrop-blur-md`
- 🎯 Item ativo com gradiente `from-[var(--eco-user)] to-[var(--eco-accent)]`
- 📱 Responsivo: overlay no mobile, fixo no desktop
- 🎭 Animações suaves de entrada/saída com Framer Motion
- 🎨 Ícones finos do Lucide React (strokeWidth: 1.5)

#### Props

```typescript
interface SidebarProps {
  isOpen?: boolean;      // Controla visibilidade
  onClose?: () => void;  // Callback para fechar (mobile)
  className?: string;    // Classes adicionais
}
```

#### Uso

```tsx
import EcoSidebar from '@/components/EcoSidebar';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex">
      <EcoSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1">
        {/* Conteúdo */}
      </main>
    </div>
  );
}
```

#### Integração no MainLayout

Para integrar no layout existente, edite `src/layouts/MainLayout.tsx`:

```tsx
import EcoSidebar from '@/components/EcoSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <EcoSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1">
        <Header
          title={pageTitle}
          variant="auto"
          onLogout={user ? handleLogout : undefined}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="pt-[var(--eco-topbar-h,56px)] md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

### 2. QuickSuggestions (Atualizado)

**Localização**: `src/components/QuickSuggestions.tsx`

Pílulas de sugestão com scroll lateral fluido.

#### Melhorias Implementadas

- ✨ **Scroll lateral**: `overflow-x-auto` com `snap-x snap-mandatory`
- 🎨 **Design translúcido**: `bg-white/60` com `backdrop-blur-md`
- 🌊 **Sombras suaves**: `shadow-[0_4px_30px_rgba(0,0,0,0.04)]`
- 🎭 **Hover elegante**: `-translate-y-0.5` com sombra aumentada
- 📱 **Touch-friendly**: `-webkit-overflow-scrolling: touch`

#### Uso

```tsx
import QuickSuggestions from '@/components/QuickSuggestions';

<QuickSuggestions
  visible={showQuick}
  onPickSuggestion={handlePickSuggestion}
  rotatingItems={ROTATING_ITEMS}
  showRotating={true}
  disabled={composerPending}
/>
```

#### Estilo CSS Necessário

```css
.quick-suggestions-scroll::-webkit-scrollbar {
  display: none; /* Esconde barra de rolagem */
}

.quick-suggestions-scroll {
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
```

---

### 3. LoginPage (Atualizado)

**Localização**: `src/pages/LoginPage.tsx`

Tela de login com estética Soft Minimal completa.

#### Alterações de Design

##### Container Principal
```tsx
className="rounded-3xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)]"
```

##### Inputs
```tsx
className="rounded-xl border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm
           text-[var(--eco-text)] placeholder:text-[var(--eco-muted)]
           focus:ring-2 focus:ring-[var(--eco-accent)]/40"
```

##### Botão Primário
```tsx
className="bg-[var(--eco-user)] text-white
           hover:bg-gradient-to-r hover:from-[var(--eco-user)] hover:to-[var(--eco-accent)]
           hover:-translate-y-0.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]
           active:translate-y-0"
```

##### Botões Secundários
```tsx
className="border border-[var(--eco-line)] bg-white/80 backdrop-blur-sm
           text-[var(--eco-text)]
           hover:bg-white hover:-translate-y-0.5"
```

#### Tipografia

- **Título**: Playfair Display (via `var(--font-display)`)
- **Labels**: Inter (via `var(--font-primary)`)
- **Peso**: `font-normal` (400) para consistência soft

---

## 🎨 Tokens de Design

### Cores (CSS Variables)

```css
:root {
  /* Cores Principais */
  --eco-bg: #FAF9F7;          /* Fundo areia clara */
  --eco-bubble: #F3EEE7;      /* Porcelana fosca */
  --eco-user: #A7846C;        /* Argila neutra */
  --eco-text: #38322A;        /* Terra úmida */
  --eco-muted: #9C938A;       /* Cinza quente */
  --eco-line: #E8E3DD;        /* Linha difusa */
  --eco-accent: #C6A995;      /* Dourado pálido */

  /* Tipografia */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;

  /* Sombras */
  --shadow-minimal: 0 4px 30px rgba(0, 0, 0, 0.04);
  --shadow-subtle: 0 2px 12px rgba(0, 0, 0, 0.03);
  --shadow-glow: 0 0 20px rgba(163, 145, 126, 0.25);

  /* Motion */
  --ease-calm: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-calm: 300ms;
  --duration-breath: 6s;
}
```

### Padrões de Uso

#### Glass Effect (Translúcido)
```css
background: rgba(255, 255, 255, 0.6);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid var(--eco-line);
box-shadow: var(--shadow-minimal);
```

#### Hover Suave
```css
transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
hover:transform: translateY(-2px);
hover:box-shadow: var(--shadow-subtle);
```

#### Gradiente Ativo
```css
background: linear-gradient(90deg, var(--eco-user), var(--eco-accent));
color: white;
```

---

## 📝 Exemplos de Integração

### Exemplo 1: Sidebar + Chat

```tsx
import { useState } from 'react';
import EcoSidebar from '@/components/EcoSidebar';
import ChatPage from '@/pages/ChatPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-[var(--eco-bg)]">
      <EcoSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 md:pl-[260px] transition-all duration-300">
        <ChatPage />
      </div>
    </div>
  );
}
```

### Exemplo 2: QuickSuggestions Personalizadas

```tsx
const customSuggestions = [
  {
    id: 'custom_1',
    icon: '🧘',
    label: 'Meditar por 5 minutos',
    modules: ['eco_presenca_silenciosa'],
  },
  {
    id: 'custom_2',
    icon: '📝',
    label: 'Journaling guiado',
    modules: ['eco_observador_presente'],
  },
];

<QuickSuggestions
  visible={true}
  suggestions={customSuggestions}
  onPickSuggestion={(s) => console.log('Picked:', s.label)}
  variant="footer"
/>
```

### Exemplo 3: Card Translúcido Personalizado

```tsx
function CustomCard() {
  return (
    <div className="rounded-2xl border border-[var(--eco-line)] bg-white/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.04)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <h3 className="text-xl font-display font-normal text-[var(--eco-text)]">
        Título Elegante
      </h3>
      <p className="mt-2 text-[15px] font-primary font-light text-[var(--eco-muted)]">
        Descrição com tipografia suave e espaçamento generoso.
      </p>
    </div>
  );
}
```

---

## 🚀 Próximos Passos

### Sugestões de Expansão

1. **Header Integrado**: Atualizar `Header.tsx` para combinar com o novo design
2. **ChatMessage**: Aplicar estilo translúcido nas bolhas de chat
3. **MemoryCard**: Redesenhar cards de memória com o novo sistema
4. **Modais**: Criar sistema de modals com backdrop blur
5. **Toast System**: Notificações com estética soft minimal

### Performance

- ✅ Usar `backdrop-filter` com cuidado em mobile (já implementado)
- ✅ Scroll lateral otimizado com `scroll-snap`
- ✅ Animações com `transform` (GPU accelerated)
- 🔄 Considerar lazy loading para rotas pesadas

### Acessibilidade

- ✅ Focus states com `ring-[var(--eco-accent)]`
- ✅ ARIA labels em navegação
- ✅ Contraste suficiente (WCAG AA)
- 🔄 Testar com leitores de tela
- 🔄 Garantir navegação por teclado

---

## 📚 Referências

- **Design Inspiration**: Apple, Claude, Meditopia, Notion Calm
- **Tipografia**: [Inter](https://rsms.me/inter/), [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🎯 Checklist de Implementação

- [x] Criar EcoSidebar com design translúcido
- [x] Atualizar QuickSuggestions com scroll lateral
- [x] Redesenhar LoginPage com estética Soft Minimal
- [x] Documentar tokens de design
- [ ] Integrar Sidebar no MainLayout (opcional)
- [ ] Atualizar ChatMessage com novo estilo
- [ ] Criar showcase/storybook dos componentes
- [ ] Testes de usabilidade

---

**Última atualização**: 2024-11-04
**Versão**: 1.0.0
**Autor**: Claude (Anthropic)

---

> "Nada grita. Tudo convida."
> "O toque humano em uma mente digital."
