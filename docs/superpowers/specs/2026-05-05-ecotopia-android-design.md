# Ecotopia Android — Design System & Redesign Spec

**Data:** 2026-05-05  
**Status:** Aprovado  
**Escopo:** Redesign completo do app ECO → Ecotopia para Android via Capacitor, com correções técnicas de layout/teclado/performance e sistema de tema dark/light dinâmico.

---

## 1. Visão Geral

Transformar o app ECO (React + Capacitor) em **Ecotopia**, aplicando:
- Renomeação completa da marca
- Design system baseado nos assets oficiais da Ecotopia
- Tema dark/light dinâmico (detectado via `prefers-color-scheme`)
- Correções de layout, teclado e performance no Android
- Estrutura de componentes inspirada em Calm / Headspace / Meditopia

**Abordagem:** Design System First — tokens e componentes base antes das telas.

---

## 2. Renomeação para Ecotopia

| Arquivo | Campo | Valor atual | Novo valor |
|---|---|---|---|
| `capacitor.config.ts` | `appName` | `'ECO'` | `'Ecotopia'` |
| `capacitor.config.ts` | `appId` | `'com.ecotopia.app'` | `'com.ecotopia.app'` (mantém) |
| `android/app/src/main/res/values/strings.xml` | `app_name` | `ECO` | `Ecotopia` |
| `package.json` | `name` | `eco-app` | `ecotopia-app` |
| `index.html` | `<title>` | `ECO` | `Ecotopia` |
| Telas de splash/login/onboarding | Logo/wordmark | Logo ECO | Logo Ecotopia |

---

## 3. Tokens de Design

### 3.1 Cores — Modo Escuro

```css
--bg-primary:      #0A0F1E;   /* fundo principal */
--bg-secondary:    #1E2A44;   /* cards, superfícies */
--bg-tertiary:     #2F3E2E;   /* superfícies verdes */
--text-primary:    #F4F1EC;   /* títulos */
--text-secondary:  #AFC8FF;   /* subtítulos, labels */
--text-muted:      #C9C3BC;   /* texto desabilitado */
--accent:          #6EC8FF;   /* brand blue, CTAs */
--accent-dark:     #1E2A44;   /* azul escuro */
--accent-warm:     #C9782B;   /* laranja, premium, ação */
--accent-gold:     #E6C79C;   /* dourado suave */
--success:         #5F6F52;   /* verde oliva */
--neutral-border:  #3A3A3A;   /* bordas sutis */
--surface-glass:   rgba(30, 42, 68, 0.80); /* glass escuro */
```

### 3.2 Cores — Modo Claro

```css
--bg-primary:      #F4F1EC;   /* fundo principal */
--bg-secondary:    #FFFFFF;   /* cards */
--bg-tertiary:     #E4DFD9;   /* superfícies neutras */
--text-primary:    #0A0F1E;   /* títulos */
--text-secondary:  #1E2A44;   /* subtítulos */
--text-muted:      #C9C3BC;   /* texto desabilitado */
--accent:          #1E2A44;   /* brand dark blue */
--accent-dark:     #0A0F1E;
--accent-warm:     #C9782B;   /* mantém */
--accent-gold:     #E6C79C;   /* mantém */
--success:         #5F6F52;
--neutral-border:  #E4DFD9;
--surface-glass:   rgba(244, 241, 236, 0.85);
```

### 3.3 Aplicação do Tema

```tsx
// Detectado no App.tsx
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

// Listener para mudanças em runtime
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', e => {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });
```

```css
/* index.css */
:root[data-theme="dark"]  { /* tokens dark */ }
:root[data-theme="light"] { /* tokens light */ }
```

---

## 4. Tipografia

| Fonte | Uso | Peso |
|---|---|---|
| **Geist** | Interface, navegação, botões, labels, H2/H3 | Regular, Medium, SemiBold |
| **Lora** | Conteúdo longo, citações, meditações, H1 hero | Regular, Medium |

### Hierarquia

| Nível | Fonte | Tamanho | Line-height | Tracking |
|---|---|---|---|---|
| H1 | Lora Medium | 30px | 36px | 0 |
| H2 | Geist Medium | 20px | 24px | 0 |
| H3 | Geist SemiBold | 17px | 22px | 0 |
| Body | Geist Regular | 15px | 22px | 0 |
| Small | Geist Regular | 12px | 18px | 0 |
| Label uppercase | Geist Medium | 11px | 16px | +0.06em |

Fontes carregadas via Google Fonts ou self-hosted no `public/fonts/`.

---

## 5. Componentes Base

### 5.1 Bottom Navigation

- 5 tabs: **Início · Explorar · Sono · Sons · Perfil**
- Posição: `fixed bottom-0`, altura 80px + `env(safe-area-inset-bottom)`
- Fundo: `var(--surface-glass)` + `backdrop-filter: blur(16px)`
- Ícone ativo: `var(--accent)`, inativo: `var(--text-muted)`
- Label ativo: Geist Medium 10px
- Borda superior: 1px `var(--neutral-border)`

### 5.2 Cards

**Card Grande (Hero/Feature):**
- Imagem full-bleed com `object-fit: cover`
- Gradiente overlay: `linear-gradient(to top, rgba(10,15,30,0.9) 0%, transparent 50%)`
- Título: Lora Medium branco, posicionado bottom-left
- Badge duração: pill branco/transparente, top-left
- Border-radius: 20px
- Min-height: 200px

**Card Médio (Grid 2 colunas):**
- Tamanho: ~(screenWidth/2 - 24px) × 200px
- Imagem top 60%, conteúdo bottom 40%
- Tag categoria: pill `var(--accent)` background, 28px altura
- Border-radius: 16px
- Shadow: `0 4px 16px rgba(0,0,0,0.12)`

**Card Lista (Linha com thumbnail):**
- Thumbnail: 72×72px, border-radius 12px
- Título: Geist Medium 15px, `var(--text-primary)`
- Subtítulo: Geist Regular 13px, `var(--text-secondary)`
- Chevron direito: `var(--text-muted)`
- Separador: 1px `var(--neutral-border)`, inset esquerdo 88px

### 5.3 Botões

**Primary:**
```css
background: var(--accent);
color: #0A0F1E;
border-radius: 100px;
height: 52px;
font: Geist Medium 15px;
padding: 0 24px;
```

**Secondary (outline):**
```css
background: transparent;
border: 1.5px solid var(--accent);
color: var(--accent);
/* demais igual ao primary */
```

**Filter Pill:**
```css
height: 36px;
border-radius: 100px;
font: Geist Medium 12px uppercase letter-spacing: +0.06em;
/* Ativo: */ background: var(--accent); color: #0A0F1E;
/* Inativo: */ border: 1.5px solid var(--neutral-border); color: var(--text-secondary);
```

### 5.4 Safe Areas & Teclado

```css
/* Aplicado globalmente */
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* Wrapper de página padrão */
.page-container {
  min-height: 100dvh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}
```

- `@capacitor/keyboard` já configurado com `resize: body` — garantir que inputs com `focus` chamam `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Status bar: `StatusBar.setStyle({ style: Style.Dark })` e `setBackgroundColor('#0A0F1E')` no dark, `#F4F1EC` no light

---

## 6. Performance

| Problema | Solução |
|---|---|
| Framer Motion em listas longas | Substituir por CSS `transition: transform 200ms ease` |
| Múltiplos `backdrop-filter` simultâneos | Limitar a 2 elementos por tela |
| Scroll jank | `overflow-y: scroll; -webkit-overflow-scrolling: touch` + `overscroll-behavior: contain` |
| Animações de entrada | `transform: translateY` ao invés de `opacity` + `height` |
| GPU layers | `will-change: transform` apenas em elementos animados ativos |
| Three.js em mobile | Reduzir pixel ratio: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` |

---

## 7. Estrutura das Telas por Grupo

### Grupo 1 — Core (redesign completo)
- `HomePage` — Hero atmosférico fullscreen + scroll de seções com cards
- `ChatPage` — Bubbles redesenhadas, input com safe area, teclado corrigido
- `MeditacoesSonoPage` — Grid de cards com filtros pill
- `MeditationPlayerPage` — Player minimalista, fundo atmosférico
- `SoundPlayerPage` — Bottom sheet player

### Grupo 2 — Conteúdo
- `SonsPage` — Grid 2 colunas + filtros
- `ProgramasPage` — Cards lista com progresso
- `rings/` — Layout mobile adaptado
- `energy-blessings/` — Layout mobile adaptado
- `diario-estoico/` — Cards lista + teaser guest

### Grupo 3 — Perfil & Auth
- `LoginPage` — Logo Ecotopia centralizado, inputs limpos
- `WelcomePage` — Splash com logo + CTA
- `CreateProfilePage` — Steps com safe area
- `ConfiguracoesPage` — Lista de configurações com tema toggle

### Grupo 4 — Conversão/Venda
- `PublicLandingPage`, `SonoPage`, `SonoErroPage`, `SonoObrigadoPage` — Adaptação mobile sem quebras, botões com altura touch-friendly (min 48px)

---

## 8. Ordem de Implementação

1. **Tokens CSS + tema dark/light** (`index.css`, `App.tsx`)
2. **Fontes** (Geist + Lora, self-hosted ou Google Fonts)
3. **Renomeação Ecotopia** (capacitor.config, strings.xml, package.json, index.html)
4. **Componentes base** (BottomNav, Card, Button, FilterPill, PageContainer)
5. **Safe areas + teclado global**
6. **Grupo 1** — telas core
7. **Grupo 2** — telas de conteúdo
8. **Grupo 3** — auth/perfil
9. **Grupo 4** — conversão
10. **Performance sweep** — auditoria final de animações e GPU
11. **Build e sync Android** (`npm run cap:android`)

---

## 9. Imagens e Assets

- Estilo visual: **ilustração moderna, flat, minimalista e emocional** (conforme brand guide)
- Logo: `LogoFundoTransparente.png` para fundo claro/escuro
- Wordmark: `Workmark.png` — Geist Medium, tracking +6, uppercase
- Ícone do app: eye/pin mark em `#6EC8FF` sobre `#0A0F1E`
- Splash screen: logo centralizado, fundo `#0A0F1E`

---

## 10. Definição de Pronto

- [ ] App roda no Android sem overflow, sem conteúdo cortado pela notch/barra de navegação
- [ ] Teclado não cobre inputs em nenhuma tela
- [ ] Tema dark/light muda automaticamente conforme sistema
- [ ] Todas as telas usam tokens do design system (sem cores hardcoded)
- [ ] Nome "Ecotopia" aparece em todos os pontos de contato
- [ ] Fontes Geist e Lora carregando corretamente
- [ ] Performance: scroll suave em listas longas, sem jank visível
- [ ] Build `npm run cap:android` executa sem erros
