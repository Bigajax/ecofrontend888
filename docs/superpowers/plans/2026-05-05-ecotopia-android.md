# Ecotopia Android — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign completo do app ECO → Ecotopia para Android via Capacitor: design system com tema dark/light dinâmico, fontes Geist + Lora, renomeação da marca, componentes base mobile-first, correções de safe area/teclado, redesign das 40+ telas e build Android.

**Architecture:** Design System First — tokens CSS centralizados com `data-theme` attribute, componentes base reutilizáveis, depois telas em grupos de prioridade. Safe areas e teclado resolvidos nos componentes base, propagados automaticamente para todas as telas.

**Tech Stack:** React 18, TypeScript, Vite 5, Tailwind CSS 3, Capacitor 8, Framer Motion, React Router 6, Lucide React, Google Fonts (Geist + Lora)

**Spec:** `docs/superpowers/specs/2026-05-05-ecotopia-android-design.md`

---

## Fase 1 — Fundação (Tasks 1-5)

### Task 1: Design Tokens CSS + Sistema de Tema Dark/Light

**Files:**
- Modify: `src/index.css` (seção `:root` e tokens)
- Modify: `src/App.tsx` (detector de tema)
- Modify: `tailwind.config.js` (cores do design system)

- [ ] **Step 1.1: Substituir tokens CSS em `src/index.css`**

Substituir a seção `/* ---------------------------- Tokens ---------------------------- */` (linha 144 em diante) por:

```css
/* ============================================================
   ECOTOPIA — DESIGN TOKENS
   Tema aplicado via data-theme no <html>
   ============================================================ */
:root {
  color-scheme: light dark;
  --vh: 1vh;

  /* Safe areas */
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);

  /* Motion */
  --motion-calm: 200ms;
  --motion-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* Border radius */
  --radius-pill: 999px;
  --radius-card: 16px;
  --radius-card-lg: 20px;
  --radius-input: 14px;
  --radius-bubble: 10px;
}

/* ── MODO ESCURO (padrão se sistema preferir dark) ── */
:root[data-theme="dark"] {
  color-scheme: dark;

  --bg-primary:     #0A0F1E;
  --bg-secondary:   #1E2A44;
  --bg-tertiary:    #2F3E2E;
  --bg-overlay:     rgba(10, 15, 30, 0.92);

  --text-primary:   #F4F1EC;
  --text-secondary: #AFC8FF;
  --text-muted:     #C9C3BC;

  --accent:         #6EC8FF;
  --accent-dark:    #1E2A44;
  --accent-warm:    #C9782B;
  --accent-gold:    #E6C79C;

  --success:        #5F6F52;
  --success-light:  #7F8F6D;
  --danger:         #D69B98;

  --neutral-border: #3A3A3A;
  --neutral-hover:  rgba(110, 200, 255, 0.08);

  --surface-glass:  rgba(30, 42, 68, 0.80);
  --surface-card:   #1E2A44;

  /* Shadows */
  --shadow-card:    0 4px 16px rgba(0, 0, 0, 0.40);
  --shadow-float:   0 8px 32px rgba(0, 0, 0, 0.50);

  /* Bottom nav */
  --nav-bg:         rgba(10, 15, 30, 0.88);

  /* Legado (manter compat com componentes existentes) */
  --color-bg-base:      var(--bg-primary);
  --color-bg-surface:   var(--surface-glass);
  --color-text-primary: var(--text-primary);
  --color-text-muted:   var(--text-muted);
  --color-accent:       var(--accent);
  --eco-bg:             var(--bg-primary);
  --eco-text:           var(--text-primary);
  --eco-muted:          var(--text-muted);
  --eco-user:           var(--accent);
  --eco-bubble:         var(--surface-card);
  --eco-line:           var(--neutral-border);
}

/* ── MODO CLARO ── */
:root[data-theme="light"] {
  color-scheme: light;

  --bg-primary:     #F4F1EC;
  --bg-secondary:   #FFFFFF;
  --bg-tertiary:    #E4DFD9;
  --bg-overlay:     rgba(244, 241, 236, 0.95);

  --text-primary:   #0A0F1E;
  --text-secondary: #1E2A44;
  --text-muted:     #C9C3BC;

  --accent:         #1E2A44;
  --accent-dark:    #0A0F1E;
  --accent-warm:    #C9782B;
  --accent-gold:    #E6C79C;

  --success:        #5F6F52;
  --success-light:  #7F8F6D;
  --danger:         #D69B98;

  --neutral-border: #E4DFD9;
  --neutral-hover:  rgba(30, 42, 68, 0.06);

  --surface-glass:  rgba(244, 241, 236, 0.88);
  --surface-card:   #FFFFFF;

  --shadow-card:    0 4px 16px rgba(0, 0, 0, 0.08);
  --shadow-float:   0 8px 32px rgba(0, 0, 0, 0.12);

  --nav-bg:         rgba(244, 241, 236, 0.92);

  /* Legado */
  --color-bg-base:      var(--bg-primary);
  --color-bg-surface:   var(--surface-glass);
  --color-text-primary: var(--text-primary);
  --color-text-muted:   var(--text-muted);
  --color-accent:       var(--accent);
  --eco-bg:             var(--bg-primary);
  --eco-text:           var(--text-primary);
  --eco-muted:          var(--text-muted);
  --eco-user:           var(--accent);
  --eco-bubble:         var(--surface-card);
  --eco-line:           var(--neutral-border);
}

/* Fallback: tema escuro para quem ainda não tem data-theme */
:root:not([data-theme]) {
  --bg-primary:     #0A0F1E;
  --bg-secondary:   #1E2A44;
  --text-primary:   #F4F1EC;
  --text-secondary: #AFC8FF;
  --text-muted:     #C9C3BC;
  --accent:         #6EC8FF;
  --accent-warm:    #C9782B;
  --accent-gold:    #E6C79C;
  --neutral-border: #3A3A3A;
  --surface-glass:  rgba(30, 42, 68, 0.80);
  --surface-card:   #1E2A44;
  --shadow-card:    0 4px 16px rgba(0, 0, 0, 0.40);
  --nav-bg:         rgba(10, 15, 30, 0.88);
  --color-bg-base:      #0A0F1E;
  --color-text-primary: #F4F1EC;
  --color-text-muted:   #C9C3BC;
  --eco-bg:             #0A0F1E;
  --eco-text:           #F4F1EC;
  --eco-muted:          #C9C3BC;
  --eco-line:           #3A3A3A;
  --eco-bubble:         #1E2A44;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 300ms ease, color 300ms ease;
}
```

- [ ] **Step 1.2: Adicionar detector de tema em `src/App.tsx`**

Antes do `return` do componente raiz (App ou AppInner), adicionar o seguinte `useEffect`:

```tsx
// Detectar e aplicar tema dark/light do sistema
useEffect(() => {
  const applyTheme = (dark: boolean) => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  };
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(mq.matches);
  const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

- [ ] **Step 1.3: Atualizar cores no `tailwind.config.js`**

Na seção `colors` do `extend`, adicionar:

```js
// Design system Ecotopia (CSS vars)
ecotopia: {
  'bg':          'var(--bg-primary)',
  'bg-2':        'var(--bg-secondary)',
  'bg-3':        'var(--bg-tertiary)',
  'text':        'var(--text-primary)',
  'text-2':      'var(--text-secondary)',
  'muted':       'var(--text-muted)',
  'accent':      'var(--accent)',
  'warm':        'var(--accent-warm)',
  'gold':        'var(--accent-gold)',
  'border':      'var(--neutral-border)',
  'card':        'var(--surface-card)',
  'glass':       'var(--surface-glass)',
},
```

- [ ] **Step 1.4: Commit**

```bash
git add src/index.css src/App.tsx tailwind.config.js
git commit -m "feat: add Ecotopia design tokens + dark/light theme system"
```

---

### Task 2: Fontes Geist + Lora

**Files:**
- Modify: `index.html` (font links)
- Modify: `src/index.css` (font vars)
- Modify: `tailwind.config.js` (fontFamily)

- [ ] **Step 2.1: Substituir links de fontes no `index.html`**

Localizar os links de preload/stylesheet de `Inter` e `Playfair Display` e substituir por:

```html
<!-- Ecotopia Fonts: Geist (UI) + Lora (Content) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Lora:wght@400;500;600&display=swap"
/>
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Lora:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2.2: Atualizar variáveis de fonte em `src/index.css`**

Na seção `:root` (antes dos tokens de tema), substituir:
```css
/* ANTES */
--font-sans: 'Inter', -apple-system, ...
```
por:
```css
--font-sans:   'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-serif:  'Lora', Georgia, 'Times New Roman', serif;
```

- [ ] **Step 2.3: Atualizar `tailwind.config.js` fontFamily**

```js
fontFamily: {
  sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
  serif: ['Lora', 'Georgia', 'serif'],
  display: ['Lora', 'Georgia', 'serif'], // manter alias display → Lora
},
```

- [ ] **Step 2.4: Atualizar `<html>` em `index.html`**

```html
<!-- ANTES -->
<html lang="pt-BR" class="font-sans">

<!-- DEPOIS -->
<html lang="pt-BR" class="font-sans bg-ecotopia-bg text-ecotopia-text">
```

- [ ] **Step 2.5: Commit**

```bash
git add index.html src/index.css tailwind.config.js
git commit -m "feat: replace Inter/Playfair with Geist + Lora fonts"
```

---

### Task 3: Renomeação Ecotopia

**Files:**
- Modify: `capacitor.config.ts`
- Modify: `android/app/src/main/res/values/strings.xml`
- Modify: `package.json`
- Modify: `src/layouts/MainLayout.tsx` (referências a 'ECO')

- [ ] **Step 3.1: Atualizar `capacitor.config.ts`**

```ts
const config: CapacitorConfig = {
  appId: 'com.ecotopia.app',
  appName: 'Ecotopia',   // era 'ECO'
  webDir: 'dist',
  // ... resto igual
```

- [ ] **Step 3.2: Atualizar `android/app/src/main/res/values/strings.xml`**

```xml
<resources>
    <string name="app_name">Ecotopia</string>
    <string name="title_activity_main">Ecotopia</string>
    <string name="package_name">com.ecotopia.app</string>
    <string name="custom_url_scheme">com.ecotopia.app</string>
</resources>
```

- [ ] **Step 3.3: Atualizar `package.json`**

```json
{
  "name": "ecotopia-app",
  ...
}
```

- [ ] **Step 3.4: Corrigir referências 'ECO' → 'Ecotopia' no `MainLayout.tsx`**

```tsx
// ANTES
const pageTitle =
  location.pathname.startsWith('/app/memory') ? 'Memórias' :
  location.pathname.startsWith('/app/voice') ? 'ECO — Voz' :
  'ECO';

// DEPOIS
const pageTitle =
  location.pathname.startsWith('/app/memory') ? 'Memórias' :
  location.pathname.startsWith('/app/voice') ? 'Ecotopia — Voz' :
  'Ecotopia';
```

- [ ] **Step 3.5: Commit**

```bash
git add capacitor.config.ts android/app/src/main/res/values/strings.xml package.json src/layouts/MainLayout.tsx
git commit -m "feat: rename app ECO → Ecotopia across all config files"
```

---

### Task 4: Componentes Base Ecotopia

**Files:**
- Create: `src/components/ui/CardHero.tsx`
- Create: `src/components/ui/CardMedium.tsx`
- Create: `src/components/ui/CardList.tsx`
- Create: `src/components/ui/ButtonEco.tsx`
- Create: `src/components/ui/FilterPill.tsx`
- Create: `src/components/ui/SectionHeader.tsx`
- Modify: `src/components/BottomNav.tsx`

- [ ] **Step 4.1: Criar `src/components/ui/CardHero.tsx`**

```tsx
interface CardHeroProps {
  image: string;
  title: string;
  subtitle?: string;
  duration?: string;
  tag?: string;
  onClick?: () => void;
  locked?: boolean;
}

export function CardHero({ image, title, subtitle, duration, tag, onClick, locked }: CardHeroProps) {
  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-[20px] min-h-[200px] text-left"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(10,15,30,0.92) 0%, rgba(10,15,30,0.3) 50%, transparent 100%)'
      }} />
      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        {duration && (
          <span className="px-2 py-1 rounded-full text-[11px] font-medium text-white"
            style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)' }}>
            {duration}
          </span>
        )}
        {locked && (
          <span className="w-6 h-6 rounded-full flex items-center justify-center ml-auto"
            style={{ background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)' }}>
            🔒
          </span>
        )}
      </div>
      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {tag && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ background: 'rgba(110,200,255,0.25)', color: '#6EC8FF' }}>
            {tag}
          </span>
        )}
        <p className="text-white font-serif text-lg leading-tight">{title}</p>
        {subtitle && <p className="text-white/70 text-sm mt-1">{subtitle}</p>}
      </div>
    </button>
  );
}
```

- [ ] **Step 4.2: Criar `src/components/ui/CardMedium.tsx`**

```tsx
interface CardMediumProps {
  image: string;
  title: string;
  tag?: string;
  duration?: string;
  locked?: boolean;
  onClick?: () => void;
}

export function CardMedium({ image, title, tag, duration, locked, onClick }: CardMediumProps) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-[16px] w-full text-left"
      style={{ aspectRatio: '4/5', boxShadow: 'var(--shadow-card)' }}
    >
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(10,15,30,0.88) 0%, transparent 55%)'
      }} />
      {/* Top right lock */}
      {locked && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ background: 'rgba(10,15,30,0.60)', backdropFilter: 'blur(6px)' }}>
          🔒
        </div>
      )}
      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {duration && (
          <p className="text-white/70 text-xs mb-1">{duration}</p>
        )}
        <p className="text-white text-sm font-medium leading-tight">{title}</p>
        {tag && (
          <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(110,200,255,0.25)', color: '#6EC8FF' }}>
            {tag}
          </span>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 4.3: Criar `src/components/ui/CardList.tsx`**

```tsx
import { ChevronRight } from 'lucide-react';

interface CardListProps {
  image?: string;
  title: string;
  subtitle?: string;
  tag?: string;
  progress?: number; // 0-1
  onClick?: () => void;
}

export function CardList({ image, title, subtitle, tag, progress, onClick }: CardListProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full py-3 px-1 text-left"
      style={{ borderBottom: '1px solid var(--neutral-border)' }}
    >
      {image && (
        <img src={image} alt={title}
          className="w-[72px] h-[72px] rounded-[12px] object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[length:var(--text-primary)] text-[15px] font-medium leading-snug truncate"
          style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-2 h-[3px] rounded-full w-full" style={{ background: 'var(--neutral-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: 'var(--accent)' }} />
          </div>
        )}
        {tag && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--neutral-hover)', color: 'var(--accent)' }}>
            {tag}
          </span>
        )}
      </div>
      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}
```

- [ ] **Step 4.4: Criar `src/components/ui/ButtonEco.tsx`**

```tsx
interface ButtonEcoProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function ButtonEco({
  children, variant = 'primary', size = 'md',
  onClick, disabled, fullWidth, className = '', type = 'button'
}: ButtonEcoProps) {
  const heights = { sm: 'h-9 text-sm px-4', md: 'h-[52px] text-[15px] px-6', lg: 'h-14 text-base px-8' };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--accent-dark)',
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1.5px solid var(--accent)',
    },
    ghost: {
      background: 'var(--neutral-hover)',
      color: 'var(--text-primary)',
      border: 'none',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={styles[variant]}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-full
        transition-all duration-200 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed
        ${heights[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4.5: Criar `src/components/ui/FilterPill.tsx`**

```tsx
interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-4 rounded-full text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0"
      style={active ? {
        background: 'var(--accent)',
        color: 'var(--accent-dark)',
        border: 'none',
      } : {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1.5px solid var(--neutral-border)',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 4.6: Criar `src/components/ui/SectionHeader.tsx`**

```tsx
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-1">
      <div>
        <h2 className="text-[20px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="text-[13px] font-medium mt-1"
          style={{ color: 'var(--accent)' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4.7: Redesenhar `src/components/BottomNav.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { Home, Compass, Moon, Music2, User } from 'lucide-react';

const navItems = [
  { to: '/app',           icon: Home,    label: 'Início',   end: true },
  { to: '/app/programas', icon: Compass, label: 'Explorar', end: false },
  { to: '/app/sono',      icon: Moon,    label: 'Sono',     end: false },
  { to: '/app/sons',      icon: Music2,  label: 'Sons',     end: false },
  { to: '/app/configuracoes', icon: User, label: 'Perfil',  end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--neutral-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] py-2 min-h-[44px]"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4.8: Criar barrel export `src/components/ui/index.ts`**

```ts
export { CardHero } from './CardHero';
export { CardMedium } from './CardMedium';
export { CardList } from './CardList';
export { ButtonEco } from './ButtonEco';
export { FilterPill } from './FilterPill';
export { SectionHeader } from './SectionHeader';
```

- [ ] **Step 4.9: Commit**

```bash
git add src/components/ui/ src/components/BottomNav.tsx
git commit -m "feat: add Ecotopia base UI components and redesign BottomNav (5 tabs)"
```

---

### Task 5: PageContainer + Safe Areas + Teclado

**Files:**
- Create: `src/components/PageContainer.tsx`
- Create: `src/hooks/useTheme.ts`
- Modify: `src/layouts/MainLayout.tsx`
- Modify: `src/index.css` (utilitários de safe area)

- [ ] **Step 5.1: Criar `src/hooks/useTheme.ts`**

```ts
import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return theme;
}
```

- [ ] **Step 5.2: Criar `src/components/PageContainer.tsx`**

```tsx
import { useEffect, useRef } from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;  // adiciona padding para o BottomNav
  hasTopBar?: boolean;     // adiciona padding para topbar fixa
  scrollable?: boolean;    // overflow-y: scroll
  className?: string;
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  hasBottomNav = true,
  hasTopBar = false,
  scrollable = true,
  className = '',
  style,
}: PageContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Scroll para input focado (resolve teclado Android)
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    const el = ref.current;
    el?.addEventListener('focusin', handleFocus);
    return () => el?.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <div
      ref={ref}
      className={`w-full ${scrollable ? 'overflow-y-scroll overscroll-contain' : 'overflow-hidden'} ${className}`}
      style={{
        minHeight: '100dvh',
        paddingTop: hasTopBar ? 'calc(56px + env(safe-area-inset-top))' : 'env(safe-area-inset-top)',
        paddingBottom: hasBottomNav ? 'calc(72px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: 'var(--bg-primary)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5.3: Adicionar utilitários CSS em `src/index.css`**

Adicionar após as regras de `.no-scrollbar`:

```css
/* Safe area utilities */
.pt-safe  { padding-top:    env(safe-area-inset-top, 0px); }
.pb-safe  { padding-bottom: env(safe-area-inset-bottom, 0px); }
.pl-safe  { padding-left:   env(safe-area-inset-left, 0px); }
.pr-safe  { padding-right:  env(safe-area-inset-right, 0px); }

/* Page com BottomNav */
.page-with-nav {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}

/* Scroll nativo suave mobile */
.scroll-touch {
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

/* GPU layer para animações */
.gpu-layer {
  transform: translateZ(0);
  will-change: transform;
}
```

- [ ] **Step 5.4: Atualizar `src/layouts/MainLayout.tsx`**

Substituir o bloco `<main>` por:

```tsx
{isHomePage || isChatPage || isMemoryPage || isVoicePage ? (
  children
) : (
  <main
    className="scroll-touch"
    style={{
      minHeight: '100dvh',
      paddingTop: showOldHeader ? 'calc(56px + env(safe-area-inset-top))' : 'env(safe-area-inset-top)',
      paddingBottom: showBottomNav ? 'calc(72px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}
  >
    <div className={showOldHeader ? 'container-content' : 'w-full'}>
      {children}
    </div>
  </main>
)}
```

- [ ] **Step 5.5: Atualizar `index.html` — meta theme-color para ambos os modos**

```html
<!-- ANTES -->
<meta name="theme-color" content="#FAF9F7" />

<!-- DEPOIS -->
<meta name="theme-color" content="#0A0F1E" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#F4F1EC" media="(prefers-color-scheme: light)" />
```

- [ ] **Step 5.6: Commit**

```bash
git add src/hooks/useTheme.ts src/components/PageContainer.tsx src/index.css src/layouts/MainLayout.tsx index.html
git commit -m "feat: add PageContainer with safe areas + keyboard scroll fix + theme hook"
```

---

## Fase 2 — Telas Core (Tasks 6-10)

### Task 6: HomePage — Hero Atmosférico + Seções com Cards

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 6.1: Ler o arquivo atual**

```bash
cat src/pages/HomePage.tsx
```

- [ ] **Step 6.2: Substituir estrutura da HomePage**

A nova HomePage deve seguir esta estrutura (adaptar ao código existente sem remover lógica de dados):

```tsx
// Estrutura da nova HomePage
return (
  <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100dvh' }}>
    {/* Hero — imagem atmosférica fullscreen */}
    <section className="relative w-full" style={{ height: '60vh', minHeight: 280 }}>
      <img
        src="/images/meditacoes-sono-hero.webp"
        alt="Ecotopia"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(10,15,30,0.3) 0%, rgba(10,15,30,0.7) 100%)'
      }} />
      {/* Header de usuário */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Olá,</p>
          <p className="text-white text-lg font-semibold">{user?.user_metadata?.name ?? 'Explorador'}</p>
        </div>
        {/* ícone busca ou streak */}
      </div>
      {/* Citação do dia */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6">
        <blockquote className="font-serif text-white text-xl leading-snug">
          {/* máxima do dia */}
        </blockquote>
        <ButtonEco variant="secondary" size="sm" className="mt-4 border-white/40 text-white">
          Ver detalhes
        </ButtonEco>
      </div>
    </section>

    {/* Conteúdo scrollável */}
    <div className="page-with-nav px-5 pt-6 space-y-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* Continue seu programa */}
      <section>
        <SectionHeader title="Continue seu programa" />
        {/* CardList com programa em andamento */}
      </section>

      {/* Recomendações diárias */}
      <section>
        <SectionHeader title="Recomendações diárias" subtitle={format(new Date(), "EEEE, dd 'de' MMM", { locale: ptBR })} />
        <div className="space-y-0">
          {/* CardList items */}
        </div>
      </section>

      {/* Reproduzido recentemente */}
      <section>
        <SectionHeader title="Reproduzido recentemente" action={{ label: 'Ver tudo', onClick: () => {} }} />
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
          {/* CardMedium grid horizontal scroll */}
        </div>
      </section>
    </div>
  </div>
);
```

- [ ] **Step 6.3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: redesign HomePage with atmospheric hero + Ecotopia card structure"
```

---

### Task 7: ChatPage — Teclado e Safe Areas

**Files:**
- Modify: `src/pages/ChatPage.tsx`

- [ ] **Step 7.1: Localizar o container principal do chat**

```bash
grep -n "className" src/pages/ChatPage.tsx | head -30
```

- [ ] **Step 7.2: Garantir safe areas no input bar**

Localizar o `<div>` que envolve o `<ChatInput>` e garantir:

```tsx
<div
  style={{
    paddingBottom: 'env(safe-area-inset-bottom)',
    backgroundColor: 'var(--bg-primary)',
    borderTop: '1px solid var(--neutral-border)',
  }}
>
  <ChatInput ... />
</div>
```

- [ ] **Step 7.3: Atualizar cores do container principal**

```tsx
// Container raiz do ChatPage
<div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="flex flex-col h-[100dvh]">
```

- [ ] **Step 7.4: Commit**

```bash
git add src/pages/ChatPage.tsx
git commit -m "fix: ChatPage safe areas for input bar + Ecotopia theme tokens"
```

---

### Task 8: MeditacoesSonoPage + MeditationPlayerPage

**Files:**
- Modify: `src/pages/MeditacoesSonoPage.tsx`
- Modify: `src/pages/energy-blessings/MeditationPlayerPage.tsx`

- [ ] **Step 8.1: Atualizar MeditacoesSonoPage com grid de cards e filtros pill**

Estrutura alvo:

```tsx
<PageContainer hasBottomNav>
  {/* Hero */}
  <div className="relative w-full" style={{ height: 220 }}>
    <img src={heroImage} className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,15,30,0.4), rgba(10,15,30,0.8))' }} />
    <div className="absolute bottom-4 left-4">
      <h1 className="font-serif text-white text-2xl font-medium">Meditações do Sono</h1>
    </div>
  </div>

  {/* Filtros */}
  <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 px-4">
    {categories.map(cat => (
      <FilterPill key={cat} label={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
    ))}
  </div>

  {/* Grid 2 colunas */}
  <div className="grid grid-cols-2 gap-3 px-4">
    {filtered.map(item => (
      <CardMedium key={item.id} {...item} onClick={() => navigate(`/app/meditation-player/${item.id}`)} />
    ))}
  </div>
</PageContainer>
```

- [ ] **Step 8.2: Atualizar MeditationPlayerPage — fundo escuro + safe areas**

```tsx
// Container do player
<div
  className="relative flex flex-col"
  style={{
    minHeight: '100dvh',
    backgroundColor: '#0A0F1E',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
  }}
>
  {/* Imagem de fundo */}
  {/* Controles do player */}
  {/* Progress bar */}
</div>
```

- [ ] **Step 8.3: Commit**

```bash
git add src/pages/MeditacoesSonoPage.tsx src/pages/energy-blessings/MeditationPlayerPage.tsx
git commit -m "feat: redesign MeditacoesSono with grid cards + FilterPill + MeditationPlayer safe areas"
```

---

### Task 9: SoundPlayerPage

**Files:**
- Modify: `src/pages/SoundPlayerPage.tsx`

- [ ] **Step 9.1: Atualizar SoundPlayerPage — fundo escuro, safe areas, controles touch-friendly**

```tsx
<div style={{
  minHeight: '100dvh',
  backgroundColor: 'var(--bg-primary)',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
}}>
  {/* Botão voltar com safe area */}
  <button className="p-4" onClick={() => navigate(-1)}>
    <ChevronLeft style={{ color: 'var(--text-primary)' }} />
  </button>
  {/* Conteúdo do player */}
</div>
```

- [ ] **Step 9.2: Commit**

```bash
git add src/pages/SoundPlayerPage.tsx
git commit -m "fix: SoundPlayerPage safe areas + Ecotopia dark theme"
```

---

## Fase 3 — Telas de Conteúdo (Tasks 10-12)

### Task 10: SonsPage + ProgramasPage

**Files:**
- Modify: `src/pages/SonsPage.tsx`
- Modify: `src/pages/ProgramasPage.tsx`

- [ ] **Step 10.1: Atualizar SonsPage com grid 2 colunas e FilterPills**

Padrão idêntico ao MeditacoesSonoPage (Task 8.1). Substituir estrutura por:

```tsx
<PageContainer hasBottomNav>
  <div className="px-4 pt-4">
    <SectionHeader title="Sons" subtitle="Ambiente sonoro para seu momento" />
  </div>
  <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 px-4">
    {soundCategories.map(cat => (
      <FilterPill key={cat} label={cat} active={activeFilter === cat} onClick={() => setActiveFilter(cat)} />
    ))}
  </div>
  <div className="grid grid-cols-2 gap-3 px-4 pb-4">
    {filteredSounds.map(sound => (
      <CardMedium key={sound.id} image={sound.image} title={sound.name} tag="Som"
        onClick={() => navigate(`/app/sons/${sound.id}`)} />
    ))}
  </div>
</PageContainer>
```

- [ ] **Step 10.2: Atualizar ProgramasPage com CardList**

```tsx
<PageContainer hasBottomNav>
  <div className="px-4 pt-4">
    <SectionHeader title="Programas" subtitle="Jornadas guiadas para sua evolução" />
  </div>
  <div className="px-4">
    {programs.map(prog => (
      <CardList key={prog.id}
        image={prog.image} title={prog.title} subtitle={prog.description}
        progress={prog.progress} tag="PROGRAMA"
        onClick={() => navigate(prog.route)} />
    ))}
  </div>
</PageContainer>
```

- [ ] **Step 10.3: Commit**

```bash
git add src/pages/SonsPage.tsx src/pages/ProgramasPage.tsx
git commit -m "feat: redesign SonsPage + ProgramasPage with Ecotopia card components"
```

---

### Task 11: Rings + Energy Blessings + Diário Estoico

**Files:**
- Modify: `src/pages/rings/FiveRingsHub.tsx`
- Modify: `src/pages/energy-blessings/EnergyBlessingsPage.tsx`
- Modify: `src/pages/diario-estoico/DiarioEstoicoPage.tsx`

- [ ] **Step 11.1: Atualizar FiveRingsHub — background escuro + safe areas**

Localizar o container raiz e garantir:

```tsx
// Container raiz
<div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100dvh' }}>
  {/* Conteúdo existente mantido, apenas tokens atualizados */}
</div>
```

- [ ] **Step 11.2: Atualizar EnergyBlessingsPage — tokens + PageContainer**

Wrapping com PageContainer e substituir cores hardcoded por tokens CSS vars:

```tsx
// Substituir bg-[#0A0F1E] hardcoded por var(--bg-primary)
// Substituir text-white por style={{ color: 'var(--text-primary)' }}
// Substituir border-white/20 por style={{ borderColor: 'var(--neutral-border)' }}
```

- [ ] **Step 11.3: Atualizar DiarioEstoicoPage — tokens**

Mesma substituição de hardcoded colors por tokens CSS.

- [ ] **Step 11.4: Commit**

```bash
git add src/pages/rings/FiveRingsHub.tsx src/pages/energy-blessings/EnergyBlessingsPage.tsx src/pages/diario-estoico/DiarioEstoicoPage.tsx
git commit -m "feat: apply Ecotopia tokens to Rings, EnergyBlessings, DiarioEstoico"
```

---

## Fase 4 — Auth & Perfil (Task 12)

### Task 12: LoginPage + WelcomePage + CreateProfilePage + ConfiguracoesPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/pages/WelcomePage.tsx`
- Modify: `src/pages/CreateProfilePage.tsx`
- Modify: `src/pages/ConfiguracoesPage.tsx`

- [ ] **Step 12.1: Atualizar LoginPage — logo Ecotopia + tokens**

```tsx
// Container raiz
<div
  className="flex flex-col items-center justify-center"
  style={{
    minHeight: '100dvh',
    backgroundColor: 'var(--bg-primary)',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    padding: '24px',
  }}
>
  {/* Logo Ecotopia */}
  <img src="/images/ECOTOPIA.webp" alt="Ecotopia" className="w-16 h-16 object-contain mb-2" />
  <p className="font-semibold text-xl mb-8" style={{ color: 'var(--text-primary)' }}>Ecotopia</p>

  {/* Formulário de login existente com tokens */}
  {/* Inputs: border: '1.5px solid var(--neutral-border)', background: 'var(--surface-card)' */}
  {/* Botão: <ButtonEco variant="primary" fullWidth>Entrar</ButtonEco> */}
</div>
```

- [ ] **Step 12.2: Atualizar WelcomePage — tela de boas-vindas com logo**

```tsx
<div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }}
  className="flex flex-col items-center justify-between px-6 py-12">
  <div /> {/* spacer */}
  <div className="flex flex-col items-center text-center">
    <img src="/images/ECOTOPIA.webp" alt="Ecotopia" className="w-20 h-20 object-contain mb-4" />
    <h1 className="font-serif text-3xl font-medium" style={{ color: 'var(--text-primary)' }}>Ecotopia</h1>
    <p className="text-base mt-3 max-w-xs" style={{ color: 'var(--text-muted)' }}>
      Meditação, sono e atenção plena para cada momento
    </p>
  </div>
  <div className="w-full space-y-3">
    <ButtonEco variant="primary" fullWidth onClick={() => navigate('/register')}>Começar agora</ButtonEco>
    <ButtonEco variant="secondary" fullWidth onClick={() => navigate('/login')}>Já tenho conta</ButtonEco>
  </div>
</div>
```

- [ ] **Step 12.3: Atualizar CreateProfilePage — inputs com tokens**

Substituir cores hardcoded por tokens em todos os inputs, labels e backgrounds.

- [ ] **Step 12.4: Atualizar ConfiguracoesPage — lista de configurações**

```tsx
<PageContainer hasBottomNav hasTopBar>
  {/* Header */}
  <div className="px-4 pb-4">
    <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Perfil</h1>
  </div>
  {/* Opções de configuração como CardList */}
  {settingsItems.map(item => (
    <CardList key={item.label} title={item.label} subtitle={item.subtitle} onClick={item.onClick} />
  ))}
</PageContainer>
```

- [ ] **Step 12.5: Commit**

```bash
git add src/pages/LoginPage.tsx src/pages/WelcomePage.tsx src/pages/CreateProfilePage.tsx src/pages/ConfiguracoesPage.tsx
git commit -m "feat: redesign auth + profile pages with Ecotopia brand and tokens"
```

---

## Fase 5 — Conversão & Performance (Tasks 13-14)

### Task 13: Páginas de Conversão/Venda

**Files:**
- Modify: `src/pages/PublicLandingPage.tsx`
- Modify: `src/pages/SonoPage.tsx`
- Modify: `src/pages/sono/` (subpages)

- [ ] **Step 13.1: Garantir touch targets mínimos em todos os CTAs**

Em qualquer botão de CTA nas páginas de venda, garantir altura mínima de 48px:

```tsx
// Buscar todos os <button> e <a> que funcionam como CTA
// Garantir: className="min-h-[48px]" ou style={{ minHeight: 48 }}
```

- [ ] **Step 13.2: Aplicar tokens em PublicLandingPage**

Substituir cores hardcoded por vars CSS. Manter estrutura existente.

- [ ] **Step 13.3: Aplicar tokens em SonoPage e subpages**

Mesma abordagem — tokens CSS, safe areas no header/footer.

- [ ] **Step 13.4: Commit**

```bash
git add src/pages/PublicLandingPage.tsx src/pages/SonoPage.tsx src/pages/sono/
git commit -m "fix: conversion pages touch targets + Ecotopia token migration"
```

---

### Task 14: Performance Sweep

**Files:**
- Modify: `src/pages/HomePage.tsx` (reduzir Framer Motion em listas)
- Modify: qualquer componente com múltiplos `backdrop-filter` simultâneos
- Modify: `src/pages/energy-blessings/MeditationPlayerPage.tsx` (Three.js pixel ratio se existir)

- [ ] **Step 14.1: Substituir animações de lista no HomePage por CSS transitions**

```tsx
// ANTES (Framer Motion em lista longa)
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

// DEPOIS (CSS puro — mais performático no Android)
<div className="animate-slide-up-fade"> {/* já definido no tailwind.config.js */}
```

- [ ] **Step 14.2: Limitar backdrop-filter simultâneos**

Garantir no máximo 2 elementos com `backdrop-filter` visíveis ao mesmo tempo em qualquer tela. Se houver mais, remover o blur do elemento menos importante.

- [ ] **Step 14.3: Adicionar overscroll-behavior em listas longas**

```tsx
// Em qualquer lista longa com scroll próprio
<div style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
```

- [ ] **Step 14.4: Se Three.js existir em telas mobile**

```tsx
// Em qualquer renderer Three.js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

- [ ] **Step 14.5: Commit**

```bash
git add -A
git commit -m "perf: replace Framer Motion list animations with CSS, limit backdrop-filter, overscroll contain"
```

---

## Fase 6 — Build Android (Task 15)

### Task 15: Build e Sync Android

**Files:**
- Modify: `capacitor.config.ts` (verificar configuração final)
- Run: build + sync commands

- [ ] **Step 15.1: Build de produção**

```bash
npm run build
```

Verificar: pasta `dist/` criada sem erros de TypeScript.

- [ ] **Step 15.2: Sync com Android**

```bash
npx cap sync android
```

Verificar: sem erros de sync, assets copiados para `android/app/src/main/assets/`.

- [ ] **Step 15.3: Verificar strings.xml após sync**

```bash
cat android/app/src/main/res/values/strings.xml
```

Esperado: `<string name="app_name">Ecotopia</string>`

- [ ] **Step 15.4: Abrir Android Studio para inspeção visual**

```bash
npx cap open android
```

Verificar em emulador ou dispositivo:
- [ ] Nome do app aparece como "Ecotopia"
- [ ] Safe areas funcionando (conteúdo não atrás da notch)
- [ ] Teclado não cobre inputs
- [ ] Tema dark/light muda com sistema
- [ ] BottomNav tem 5 tabs com safe area no bottom
- [ ] Fontes Geist e Lora carregando

- [ ] **Step 15.5: Commit final**

```bash
git add -A
git commit -m "feat: Ecotopia Android build verified — design system complete"
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| `src/index.css` | Modificar — tokens CSS dark/light completos |
| `src/App.tsx` | Modificar — detector de tema |
| `tailwind.config.js` | Modificar — cores ecotopia + fontFamily |
| `index.html` | Modificar — fontes Geist/Lora + theme-color duplo |
| `capacitor.config.ts` | Modificar — appName: 'Ecotopia' |
| `android/.../strings.xml` | Modificar — app_name: Ecotopia |
| `package.json` | Modificar — name: ecotopia-app |
| `src/layouts/MainLayout.tsx` | Modificar — safe areas + tokens |
| `src/components/BottomNav.tsx` | Modificar — 5 tabs + Ecotopia tokens |
| `src/components/ui/CardHero.tsx` | Criar |
| `src/components/ui/CardMedium.tsx` | Criar |
| `src/components/ui/CardList.tsx` | Criar |
| `src/components/ui/ButtonEco.tsx` | Criar |
| `src/components/ui/FilterPill.tsx` | Criar |
| `src/components/ui/SectionHeader.tsx` | Criar |
| `src/components/ui/index.ts` | Criar |
| `src/components/PageContainer.tsx` | Criar |
| `src/hooks/useTheme.ts` | Criar |
| `src/pages/HomePage.tsx` | Modificar — hero atmosférico + cards |
| `src/pages/ChatPage.tsx` | Modificar — safe areas teclado |
| `src/pages/MeditacoesSonoPage.tsx` | Modificar — grid + FilterPills |
| `src/pages/energy-blessings/MeditationPlayerPage.tsx` | Modificar — player dark |
| `src/pages/SoundPlayerPage.tsx` | Modificar — safe areas |
| `src/pages/SonsPage.tsx` | Modificar — grid + FilterPills |
| `src/pages/ProgramasPage.tsx` | Modificar — CardList |
| `src/pages/rings/FiveRingsHub.tsx` | Modificar — tokens |
| `src/pages/energy-blessings/EnergyBlessingsPage.tsx` | Modificar — tokens |
| `src/pages/diario-estoico/DiarioEstoicoPage.tsx` | Modificar — tokens |
| `src/pages/LoginPage.tsx` | Modificar — logo Ecotopia + tokens |
| `src/pages/WelcomePage.tsx` | Modificar — tela boas-vindas |
| `src/pages/CreateProfilePage.tsx` | Modificar — tokens |
| `src/pages/ConfiguracoesPage.tsx` | Modificar — tokens |
| `src/pages/PublicLandingPage.tsx` | Modificar — tokens + touch targets |
| `src/pages/SonoPage.tsx` | Modificar — tokens + touch targets |
