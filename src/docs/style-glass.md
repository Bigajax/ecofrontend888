# Guia de estilo — Glassmorphism minimalista

Este guia descreve como aplicar o tema “liquid glass” em toda a interface.

## Tokens principais

Os tokens de base encontram-se em [`tokens.json`](../tokens.json) e expostos via variáveis CSS em `:root`.

| Token | Variável CSS | Valor |
| ----- | ------------- | ----- |
| Fundo base | `--color-bg-base` | `#FFFFFF` |
| Vidro (surface) | `--color-bg-surface` | `rgba(255,255,255,0.6)` |
| Vidro (tint) | `--color-glass-tint` | `rgba(255,255,255,0.35)` |
| Contorno vidro | `--color-glass-stroke` | `rgba(255,255,255,0.7)` |
| Texto primário | `--color-text-primary` | `#0F172A` |
| Texto muted | `--color-text-muted` | `#475569` |
| Acento | `--color-accent` | `#007AFF` |
| Sucesso | `--color-success` | `#10B981` |
| Aviso | `--color-warn` | `#F59E0B` |
| Erro | `--color-danger` | `#EF4444` |
| Blur vidro | `--blur-glass` | `18px` |
| Blur forte | `--blur-glass-strong` | `22px` |
| Sombra vidro | `--shadow-glass` | `0 10px 30px rgba(2,6,23,0.08)` |
| Sombra floating | `--shadow-floating` | `0 20px 50px rgba(2,6,23,0.10)` |
| Raio XL | `--radius-xl` | `24px` |
| Raio 2XL | `--radius-2xl` | `28px` |

Para fallback de acessibilidade usamos media queries `prefers-reduced-transparency` e `prefers-contrast` para remover blur e reforçar o contraste quando necessário.

## Utilitários Tailwind

- `shadow-glass`, `shadow-floating` – mapeados em `tailwind.config.js` para reutilizar as sombras suaves.
- `backdrop-blur-glass`, `backdrop-blur-glass-strong` – `backdropBlur.glass` e `backdropBlur['glass-strong']`.
- `bg-glass-surface`, `text-text-primary`, `text-text-muted`, `bg-accent` etc. (cores extendidas).
- `glass-shell` / `glass-shell-strong` – utilitários adicionados pelo plugin para cenários onde preferimos classes Tailwind em vez das classes globais.

## Classes globais

As classes abaixo moram em `src/index.css` (camada `@layer components`) e são usadas em componentes React:

- `.glass-toolbar` — barras/containers primários. Aplica fundo translúcido, blur (`18px`), stroke interno e highlight superior.
- `.glass-card` — cartões com raio `28px` + sombra `var(--shadow-glass)`.
- `.glass-chip` — pills translucidas para chips, botões icônicos, badges.
- `.glass-input`, `.glass-textarea`, `.glass-select` — campos de formulário com vidro leve, foco com halo interno `2px` accent.
- `.btn-primary` — CTA azul iOS (pill 48px, glow externo `0 0 0 6px rgba(0,122,255,0.15)`).
- `.btn-secondary` — botão vidro translúcido com texto `accent`.
- `.skeleton-glass` — skeletons com blur reduzido + animação `skeleton-sheen`.

## Padrões de composição

1. **Páginas** – manter conteúdo dentro de `max-w-[1140px]` com `px-4 / sm:px-6 / md:px-8`. Fundo global branco com três orbs suaves (`body` usa as variáveis `--orb-a/b/c`).
2. **Navbar / Shell** – usar `.glass-toolbar` com sombra `shadow-floating`, `border-white/60` e micro-translate quando scrolled.
3. **Cards** – empilhar `.glass-card` + micro-hover `translateY(-2px)` + highlight linear no `::before`.
4. **Barras fixas** – `glass-toolbar` + `focus-within` aplicando sombra accent.
5. **Chips / tags** – `.glass-chip` + `border: var(--stroke-glass)` + estado selecionado preenchendo com `rgba(0,122,255,0.1)`.
6. **Bubbles** – chat usa `--bubble-eco-bg` (accent 12%) e `--bubble-user-bg` (vidro neutro). Sempre aplicar `backdrop-blur-xl`, `border` clara e sombras suaves.

## Motion

- Hovers: `translateY(-2px)` e `scale(0.98 → 1)` em ~180ms.
- Fade/scale nos cards (`transition` + `animate` do Framer, já aplicados).
- Skeleton sheen: `@keyframes skeleton-sheen` definido em `index.css`.

## Acessibilidade

- Contraste mínimo 4.5:1 garantindo texto escuro (`#0F172A`) sobre superfícies translúcidas.
- `prefers-reduced-transparency` remove blur e aplica fundo branco sólido.
- `focus-visible` com glow accent (`rgba(0,122,255,0.5)`).

## Componentes críticos

- **Header** (`src/components/Header.tsx`): usa `.glass-toolbar`, ícones em `glass-chip` e CTA `btn-secondary`/accent.
- **ChatInput** (`src/components/ChatInput.tsx`): container `glass-toolbar`, botões `glass-chip`, CTA `h-12` accent.
- **Cards** (`src/components/memory/MemoryCard.tsx`): `glass-card`, chips translúcidas e botões `glass-chip`.
- **Layout** (`src/layouts/MainLayout.tsx`): limita conteúdo e mantém gutters.

Siga estas convenções ao criar novos componentes para garantir consistência visual.
