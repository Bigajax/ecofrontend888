# Matriz oficial de breakpoints e tokens fluidos

## 1) Breakpoints alvo (mobile-first)

| Token | Largura mínima | Dispositivo alvo |
|---|---:|---|
| `w320` | `320px` | Android compacto / iPhone SE |
| `w375` | `375px` | iPhone base |
| `w390` | `390px` | iPhone 12/13/14 |
| `w414` | `414px` | iPhone Plus/Max |
| `md` | `768px` | Tablet retrato |
| `lg` | `1024px` | Tablet paisagem / laptops pequenos |
| `xl` | `1280px` | Desktop padrão |
| `2xl` | `1536px+` | Desktop amplo |

> Implementado em `tokens.json` e propagado para Tailwind (`tailwind.config.js`) e CSS vars (`src/index.css`).

## 2) Tokens oficiais

### Containers
- `--content-max-compact: 42rem`
- `--content-max-default: 72rem`
- `--content-max-wide: 80rem`
- `--content-gutter: clamp(1rem, 2.2vw, 2rem)`
- `--content-gutter-comfortable: clamp(1.5rem, 3vw, 3rem)`

Utilitários:
- `.container-content`
- `.container-content-compact`
- `.container-content-wide`

### Tipografia fluida
- `--text-fluid-xs`
- `--text-fluid-sm`
- `--text-fluid-base`
- `--text-fluid-lg`
- `--text-fluid-xl`
- `--text-fluid-2xl`

Utilitários:
- `.text-fluid-xs ... .text-fluid-2xl`

### Spacing fluido
- `--space-fluid-2xs`
- `--space-fluid-xs`
- `--space-fluid-sm`
- `--space-fluid-md`
- `--space-fluid-lg`
- `--space-fluid-xl`

Utilitários:
- `space-y-fluid-*` (Tailwind)
- `.stack-fluid-sm/.md/.lg`
- `gap-fluid-*`, `px-fluid-*`, `py-fluid-*` (Tailwind)

## 3) Refatoração por prioridade

### 1. Navegação global
- `Header`: removidos valores mágicos de espaçamento/tipografia; adotados tokens fluidos para botão, título, gaps e largura de drawer.
- `BottomNav`: container oficial, espaçamento fluido e labels fluidas.

### 2. Entrada e chat
- `QuickSuggestions`: largura oficial de conteúdo, cards com sizing fluido, tipografia fluida e scroll padding tokenizado.
- `MessageList`: spacing vertical e indicador de digitação com tokens fluidos.

### 3. Modais
- `BackgroundSoundsModal`: padding, grid responsivo e tipografia convertidos para tokens fluidos; breakpoint `w390` aplicado.
- `FeedbackModal`: largura de conteúdo oficial e espaçamentos tipográficos fluidos.

### 4. Páginas de conteúdo
- `MainLayout`: wrapper principal migrado para `.container-content`.

## 4) Checklist visual por breakpoint

Validar todos os itens em: **320 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1536+**.

- [ ] Header não quebra em 2 linhas em ações principais.
- [ ] BottomNav mantém área tocável >= 44px.
- [ ] QuickSuggestions mantém scroll horizontal sem truncar CTA.
- [ ] Lista de mensagens preserva ritmo vertical e legibilidade.
- [ ] Modais não excedem viewport; conteúdo continua acessível por scroll.
- [ ] Grids de cards mantêm proporção sem overflow horizontal.
- [ ] Conteúdo principal respeita `container-content` + gutters oficiais.

## 5) Regra para novos componentes

### **Mobile-first sem valores mágicos**
1. Basear layout em `w320` primeiro.
2. Usar apenas tokens de spacing/tipografia/container.
3. Evitar valores literais (`px-[17px]`, `text-[13px]`, `max-w-[847px]`) sem token equivalente.
4. Escalar apenas nos breakpoints oficiais.
5. Se precisar novo valor, primeiro promover para token em `tokens.json`.
