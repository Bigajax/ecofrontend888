# Catálogo de "Próximo Passo" (Action Engine v2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estender o card de próximo passo de 5 para 9 ações (5 atuais + `aneis`, `riqueza_mental`, `energy_blessings`, `liberar_estresse`), com contrato `id`+`kind` entre backend e frontend.

**Architecture:** Backend (`actionEngine.ts`) decide UM `id` por turno via regras determinísticas conservadoras e envia `{id, kind, titulo, descricao, cta, prioridade, tipo?}` no SSE. Frontend (`AcaoRecomendadaCard.tsx`) mapeia `id → CATALOG{rota, capa, cor, kicker, glyph, navegação}`. Itens premium recomendados a free abrem o modal de upgrade no clique.

**Tech Stack:** Backend TypeScript + `node:test`/`node:assert` (runner `npm run test:node`). Frontend React 18 + Vitest + React Testing Library (`npm run test`).

**Repos:**
- Backend: `C:\Users\Rafael\Desktop\ecofrontend\ecobackend888`
- Frontend: `C:\Users\Rafael\Desktop\ecofrontend888` (branch `feat/catalogo-proximo-passo`)

**Spec:** `docs/superpowers/specs/2026-06-01-catalogo-proximo-passo-design.md`

---

## File Structure

**Backend:**
- Modify `server/services/conversation/actionEngine.ts` — tipos `AcaoId`/`AcaoKind`, `CATALOG` (substitui `TEMPLATES`), 4 regexes novas, desambiguação estresse↔ansiedade, 4 candidatos novos.
- Modify `server/tests/conversation/actionEngine.test.ts` — casos dos 4 novos gatilhos + desambiguação + crise.

**Frontend:**
- Modify `src/components/chat/AcaoRecomendadaCard.tsx` — contrato `id`/`kind`, `CATALOG` (substitui `ACTION_REGISTRY`), navegação por kind + gating premium.
- Create `src/components/chat/__tests__/AcaoRecomendadaCard.test.tsx` — render/navegação/gating.

Sem mudança no `streamingOrchestrator.ts` (passa o objeto `acao` inteiro em `meta.acao_recomendada`).

---

## PHASE A — Backend (actionEngine)

### Task A1: Estender tipos e introduzir CATALOG

**Files:**
- Modify: `server/services/conversation/actionEngine.ts`

- [ ] **Step 1: Substituir o bloco de tipos no topo (linhas ~20-29)**

Trocar a declaração atual de `TipoAcao` e `AcaoRecomendada` por:

```ts
/** Ids legados (compat de payload). */
export type TipoAcao = "meditacao" | "sono" | "diario" | "estoicismo" | "relatorio";

/** Catálogo completo de ações recomendáveis (v2). */
export type AcaoId = TipoAcao | "aneis" | "riqueza_mental" | "energy_blessings" | "liberar_estresse";

/** Como o frontend navega: programa abre rota; meditação abre o player. */
export type AcaoKind = "programa" | "meditacao";

export interface AcaoRecomendada {
  /** Contrato compartilhado com o frontend (chave do CATALOG). */
  id: AcaoId;
  kind: AcaoKind;
  titulo: string;
  descricao: string;
  cta: string;
  /** Maior = mais prioritário. */
  prioridade: number;
  /** Alias legado: presente apenas para os 5 ids antigos (id === tipo). */
  tipo?: TipoAcao;
}
```

- [ ] **Step 2: Substituir `TEMPLATES` + `build()` (linhas ~77-122) pelo CATALOG**

```ts
type CatalogTemplate = Pick<AcaoRecomendada, "id" | "kind" | "titulo" | "descricao" | "cta">;

const CATALOG: Record<AcaoId, CatalogTemplate> = {
  meditacao: {
    id: "meditacao", kind: "programa",
    titulo: "Uma pausa para desacelerar",
    descricao:
      "Tem bastante coisa ativada aí agora. Às vezes o corpo precisa desacelerar antes da cabeça entender — 5 minutos de respiração ajudam.",
    cta: "Respirar por 5 minutos",
  },
  sono: {
    id: "sono", kind: "programa",
    titulo: "Preparar para a noite",
    descricao:
      "O que você descreve soa mais como mente que não desliga do que cansaço. Tenho uma prática pra ajudar o corpo a entrar no modo noite.",
    cta: "Abrir práticas de sono",
  },
  estoicismo: {
    id: "estoicismo", kind: "programa",
    titulo: "Uma reflexão sobre a autocobrança",
    descricao:
      "Tem uma distância aí entre o que você exige de si e o que de fato cabe a você. Os estoicos escreveram bastante sobre isso.",
    cta: "Ler uma reflexão",
  },
  diario: {
    id: "diario", kind: "programa",
    titulo: "Colocar no papel",
    descricao:
      "Quando a cabeça embola assim, escrever costuma clarear mais do que continuar remoendo. Topa um exercício rápido?",
    cta: "Abrir o diário",
  },
  relatorio: {
    id: "relatorio", kind: "programa",
    titulo: "Ver seus padrões",
    descricao:
      "Esse tema tem aparecido com frequência nas suas conversas. Talvez valha acompanhar como ele evolui ao longo do tempo.",
    cta: "Ver meu relatório",
  },
  aneis: {
    id: "aneis", kind: "programa",
    titulo: "Construir constância",
    descricao:
      "Quando a vontade vai e volta assim, o que costuma faltar não é força — é um sistema que segure você nos dias difíceis.",
    cta: "Conhecer os Cinco Anéis",
  },
  riqueza_mental: {
    id: "riqueza_mental", kind: "programa",
    titulo: "Reprogramar a mente financeira",
    descricao:
      "A relação com dinheiro costuma começar antes do bolso, na cabeça. Tem um programa que trabalha justamente essa raiz.",
    cta: "Abrir Riqueza Mental",
  },
  energy_blessings: {
    id: "energy_blessings", kind: "programa",
    titulo: "Reativar sua energia",
    descricao:
      "Esse esvaziamento que você descreve pede menos esforço e mais recarga. Uma prática curta de energia pode ajudar a religar.",
    cta: "Ativar seus centros de energia",
  },
  liberar_estresse: {
    id: "liberar_estresse", kind: "meditacao",
    titulo: "Soltar a tensão do dia",
    descricao:
      "Parece tensão que foi se acumulando ao longo do dia. Cinco minutos pra descarregar o corpo costumam aliviar mais do que parece.",
    cta: "Liberar o estresse (5 min)",
  },
};

const LEGACY_TIPOS = new Set<AcaoId>(["meditacao", "sono", "diario", "estoicismo", "relatorio"]);

function build(id: AcaoId, prioridade: number, descricaoOverride?: string): AcaoRecomendada {
  const base = CATALOG[id];
  return {
    ...base,
    descricao: descricaoOverride ?? base.descricao,
    prioridade,
    ...(LEGACY_TIPOS.has(id) ? { tipo: id as TipoAcao } : {}),
  };
}
```

- [ ] **Step 3: Atualizar os tipos do cooldown (linhas ~137-151) de `TipoAcao` para `AcaoId`**

```ts
const ultimaAcaoPorUsuario = new Map<string, Map<AcaoId, number>>();

function emCooldown(usuarioId: string, tipo: AcaoId, agora: number): boolean {
  const ts = ultimaAcaoPorUsuario.get(usuarioId)?.get(tipo);
  return typeof ts === "number" && agora - ts < COOLDOWN_MS;
}

function registrarAcao(usuarioId: string, tipo: AcaoId, agora: number): void {
  let porTipo = ultimaAcaoPorUsuario.get(usuarioId);
  if (!porTipo) {
    porTipo = new Map<AcaoId, number>();
    ultimaAcaoPorUsuario.set(usuarioId, porTipo);
  }
  porTipo.set(tipo, agora);
}
```

- [ ] **Step 4: Compilar para garantir que nada quebrou**

Run (no diretório do backend): `npx tsc --noEmit -p tsconfig.json 2>&1 | findstr actionEngine`
Expected: nenhuma linha (sem erros no arquivo).

- [ ] **Step 5: Rodar os testes existentes (devem continuar passando via alias `tipo`)**

Run: `npm run test:node`
Expected: PASS — os 8 testes atuais checam `acao?.tipo` e os 5 ids legados ainda setam `tipo`.

- [ ] **Step 6: Commit**

```bash
git add server/services/conversation/actionEngine.ts
git commit -m "refactor(action-engine): contrato id+kind via CATALOG (compat tipo legado)"
```

---

### Task A2: Desambiguar estresse↔ansiedade e adicionar 4 gatilhos

**Files:**
- Modify: `server/services/conversation/actionEngine.ts`
- Test: `server/tests/conversation/actionEngine.test.ts`

- [ ] **Step 1: Escrever os testes que falham (adicionar ao fim de `actionEngine.test.ts`)**

```ts
test("estresse do dia → liberar_estresse (não meditacao)", () => {
  const acao = decideAcaoRecomendada({ texto: "que dia estressante, não aguento mais", intensidade: 5, openness: 2 });
  assert.equal(acao?.id, "liberar_estresse");
  assert.equal(acao?.kind, "meditacao");
});

test("ansiedade aguda continua → meditacao", () => {
  const acao = decideAcaoRecomendada({ texto: "meu coração está disparado, panico", intensidade: 7, openness: 2 });
  assert.equal(acao?.id, "meditacao");
});

test("procrastinação/constância → aneis", () => {
  const acao = decideAcaoRecomendada({ texto: "começo as coisas e sempre desisto, não tenho constância", intensidade: 4, openness: 2 });
  assert.equal(acao?.id, "aneis");
});

test("dinheiro/escassez → riqueza_mental", () => {
  const acao = decideAcaoRecomendada({ texto: "estou sem dinheiro e com contas pra pagar", intensidade: 5, openness: 2 });
  assert.equal(acao?.id, "riqueza_mental");
});

test("desânimo/energia baixa → energy_blessings", () => {
  const acao = decideAcaoRecomendada({ texto: "acordo esgotado, sem ânimo e sem vontade de nada", intensidade: 4, openness: 2 });
  assert.equal(acao?.id, "energy_blessings");
});

test("crise bloqueia os novos gatilhos também", () => {
  const acao = decideAcaoRecomendada({ texto: "sem dinheiro e sem vontade de viver", intensidade: 9, openness: 3, flags: { ideacao: true } });
  assert.equal(acao, null);
});
```

- [ ] **Step 2: Rodar para confirmar que falham**

Run: `npm run test:node`
Expected: FAIL nos 6 testes novos (id `undefined`/errado; regexes ainda não existem).

- [ ] **Step 3: Ajustar `RE_ATIVACAO` (remover família estresse) e adicionar 4 regexes**

Substituir `RE_ATIVACAO` (linha ~128-129) por (sem `estressad|estresse|sobrecarregad|tens[ao]|no limite`):

```ts
const RE_ATIVACAO =
  /\b(?:ansios|ansiedade|angusti|panico|acelerad|coracao disparad|peito apertad|nao paro de pensar|nao consigo relaxar|agitad|surtand|nervos|aflit|ofegante)/;
```

Adicionar, logo após `RE_CONFUSAO`:

```ts
const RE_ESTRESSE =
  /\b(?:estress|tensao|tenso|sobrecarregad|no limite|dia pesado|dia dificil|preciso relaxar|preciso descarregar|exausto do trabalho|fim de expediente|nao aguento mais o dia)/;
const RE_DISCIPLINA =
  /\b(?:procrastin|deixo pra depois|deixo para depois|adio|adiar|enrol|sempre desisto|desisto sempre|nunca termino|nao consigo manter|falta de disciplina|sem disciplina|sem constancia|nao tenho constancia|nao crio habito|preguica de|comeco e paro)/;
const RE_DINHEIRO =
  /\b(?:dinheiro|grana|dividas|divida|financ|sem dinheiro|falta de dinheiro|escassez|contas para pagar|contas pra pagar|boletos|boleto|salario|prosperidade|ganhar mais|mente financeira|mindset financeiro|pobre)/;
const RE_ENERGIA =
  /\b(?:sem energia|sem animo|desanimad|desmotivad|exaust|esgotad|apatic|sem vontade|sem forcas|abatid|prostrad|drenad)/;
```

- [ ] **Step 4: Adicionar os 4 candidatos no `decideAcaoRecomendada`**

Logo após o bloco `// 2) MEDITAÇÃO` (antes de `// 3) ESTOICISMO`), inserir o de estresse para deixar a leitura por prioridade; os demais podem ir após o bloco de diário (a ordem do array não importa, há `sort` por prioridade):

```ts
  // 2.5) ESTRESSE — tensão acumulada do dia (distinto de ansiedade aguda).
  if (RE_ESTRESSE.test(t)) {
    candidatos.push(build("liberar_estresse", 85));
  }
```

E após o bloco `// 4) DIÁRIO`:

```ts
  // 6) ANÉIS — falta de constância/disciplina.
  if (RE_DISCIPLINA.test(t)) {
    candidatos.push(build("aneis", 68));
  }

  // 7) RIQUEZA MENTAL — dinheiro/escassez/mindset financeiro.
  if (RE_DINHEIRO.test(t)) {
    candidatos.push(build("riqueza_mental", 62));
  }

  // 8) ENERGY BLESSINGS — desânimo/energia baixa.
  if (RE_ENERGIA.test(t)) {
    candidatos.push(build("energy_blessings", 58));
  }
```

- [ ] **Step 5: Rodar os testes — todos passam**

Run: `npm run test:node`
Expected: PASS (8 antigos + 6 novos = 14).

- [ ] **Step 6: Commit**

```bash
git add server/services/conversation/actionEngine.ts server/tests/conversation/actionEngine.test.ts
git commit -m "feat(action-engine): aneis, riqueza_mental, energy_blessings, liberar_estresse + desambiguacao estresse"
```

---

## PHASE B — Frontend (card + CATALOG)

### Task B1: Contrato id/kind + CATALOG no card

**Files:**
- Modify: `src/components/chat/AcaoRecomendadaCard.tsx`

- [ ] **Step 1: Atualizar imports e tipos do contrato**

Adicionar imports (junto aos existentes):

```ts
import { useSubscriptionTier, usePremiumContent } from "../../hooks/usePremiumContent";
import { canAccessMeditation } from "../../constants/meditationTiers";
```

Substituir `TipoAcao`/`AcaoRecomendada`/`AcaoConfig` por:

```ts
export type TipoAcao = "meditacao" | "sono" | "diario" | "estoicismo" | "relatorio";
export type AcaoKind = "programa" | "meditacao";

export interface AcaoRecomendada {
  /** Opcional para tolerar payloads legados que só enviavam `tipo`. */
  id?: string;
  kind?: AcaoKind;
  titulo: string;
  descricao: string;
  cta: string;
  prioridade?: number;
  /** Alias legado (payloads antigos enviavam só `tipo`). */
  tipo?: TipoAcao;
}

interface CatalogEntry {
  kind: AcaoKind;
  rota: string;
  /** Capa real do programa (em /public/images). */
  cover: string;
  kicker: string;
  accent: string;
  glyph: "play" | "open";
  /** Id para checagem de acesso premium (kind === "meditacao"). */
  premiumId?: string;
  /** State de navegação para o player (kind === "meditacao"). */
  meditationState?: {
    title: string; duration: string; audioUrl: string; imageUrl: string; gradient: string;
  };
}
```

- [ ] **Step 2: Substituir `ACTION_REGISTRY` pelo `CATALOG`**

```ts
export const CATALOG: Record<string, CatalogEntry> = {
  meditacao: { kind: "programa", rota: "/app/introducao-meditacao", cover: "/images/introducao-meditacao-hero.webp", kicker: "RESPIRAR", accent: "#36A8E8", glyph: "play" },
  sono: { kind: "programa", rota: "/app/meditacoes-sono", cover: "/images/meditacoes-sono-hero.webp", kicker: "DESCANSAR", accent: "#6E63B0", glyph: "play" },
  estoicismo: { kind: "programa", rota: "/app/diario-estoico", cover: "/images/diario-marco-aurelio.webp", kicker: "REFLETIR", accent: "#B5895E", glyph: "play" },
  diario: { kind: "programa", rota: "/app/diario-estoico", cover: "/images/diario-estoico.webp", kicker: "ESCREVER", accent: "#5C9A78", glyph: "play" },
  relatorio: { kind: "programa", rota: "/app/memory/report", cover: "/images/relatorio-emocional-ilustracao.webp", kicker: "OBSERVAR", accent: "#2E6FB0", glyph: "open" },
  aneis: { kind: "programa", rota: "/app/rings", cover: "/images/5-aneis-hero.webp", kicker: "PERSISTIR", accent: "#B07C3F", glyph: "open" },
  riqueza_mental: { kind: "programa", rota: "/app/riqueza-mental", cover: "/images/quem-pensa-enriquece.webp", kicker: "PROSPERAR", accent: "#3B6BA5", glyph: "open" },
  energy_blessings: { kind: "programa", rota: "/app/energy-blessings", cover: "/images/meditacao-bencao-energia.webp", kicker: "ENERGIZAR", accent: "#E67E3C", glyph: "open" },
  liberar_estresse: {
    kind: "meditacao", rota: "/app/meditation-player",
    cover: "/images/liberando-estresse.webp", kicker: "LIBERAR", accent: "#8855C4", glyph: "play",
    premiumId: "blessing_11",
    meditationState: {
      title: "Liberando o Estresse", duration: "5 min",
      audioUrl: "/audio/liberando-estresse.mp3", imageUrl: "/images/liberando-estresse.webp",
      gradient: "linear-gradient(to bottom, #C4A0E8 0%, #A877D6 20%, #8855C4 40%, #6B40A8 60%, #4F2B8C 80%, #341870 100%)",
    },
  },
};
```

- [ ] **Step 3: Atualizar o validador `isAcaoRecomendada` (aceitar id OU tipo)**

```ts
function isAcaoRecomendada(value: unknown): value is AcaoRecomendada {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const id = (typeof v.id === "string" && v.id) || (typeof v.tipo === "string" ? v.tipo : "");
  return typeof id === "string" && id in CATALOG && typeof v.titulo === "string" && typeof v.cta === "string";
}
```

(Manter `extractAcaoRecomendada` como está — segue checando `acao_recomendada` nos mesmos locais.)

- [ ] **Step 4: Compilar**

Run (no frontend): `npx tsc --noEmit -p tsconfig.app.json 2>&1 | findstr AcaoRecomendada`
Expected: nenhuma linha (sem erros). Pode haver erro temporário em `config`/`ACTION_REGISTRY` ainda referenciados — resolvidos na Task B2; se aparecerem, prosseguir para B2 antes de recompilar.

---

### Task B2: Navegação por kind + gating premium

**Files:**
- Modify: `src/components/chat/AcaoRecomendadaCard.tsx`

- [ ] **Step 1: Resolver id/entry e adicionar hooks de tier no componente**

No corpo de `AcaoRecomendadaCard`, trocar a resolução de config:

```ts
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const haptic = useHapticFeedback();
  const tier = useSubscriptionTier();
  const { requestUpgrade } = usePremiumContent();
  const id = acao.id || acao.tipo || "";
  const entry = CATALOG[id];
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    track("Eco Action Shown", { action_type: id, message_id: messageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, messageId]);

  if (!entry) return null;
  const { rota, cover: coverSrc, kicker, accent, glyph } = entry;
```

- [ ] **Step 2: Reescrever `go()` para navegar por kind + gating**

```ts
  const go = () => {
    haptic.selection();
    track("Eco Action Clicked", { action_type: id, message_id: messageId, rota });
    if (entry.kind === "meditacao") {
      if (entry.premiumId && !canAccessMeditation(entry.premiumId, tier)) {
        requestUpgrade("acao_" + id);
        return;
      }
      navigate(rota, { state: { meditation: entry.meditationState } });
      return;
    }
    navigate(rota);
  };
```

- [ ] **Step 3: Compilar — sem erros**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | findstr AcaoRecomendada`
Expected: nenhuma linha.

- [ ] **Step 4: Build do app**

Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/AcaoRecomendadaCard.tsx
git commit -m "feat(card): CATALOG id/kind, navegacao por kind e gating premium"
```

---

### Task B3: Testes do card

**Files:**
- Create: `src/components/chat/__tests__/AcaoRecomendadaCard.test.tsx`

- [ ] **Step 1: Escrever o teste**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AcaoRecomendadaCard from "../AcaoRecomendadaCard";

const navigateMock = vi.fn();
const requestUpgradeMock = vi.fn();
let tierValue = "premium";
let canAccessValue = true;

vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("../../../hooks/usePremiumContent", () => ({
  useSubscriptionTier: () => tierValue,
  usePremiumContent: () => ({ requestUpgrade: requestUpgradeMock }),
}));
vi.mock("../../../constants/meditationTiers", () => ({
  canAccessMeditation: () => canAccessValue,
}));
vi.mock("../../../analytics/track", () => ({ track: vi.fn() }));

beforeEach(() => {
  navigateMock.mockReset();
  requestUpgradeMock.mockReset();
  tierValue = "premium";
  canAccessValue = true;
});

const base = { titulo: "T", descricao: "D", cta: "C" };

describe("AcaoRecomendadaCard", () => {
  it("programa: clique navega para a rota", () => {
    render(<AcaoRecomendadaCard acao={{ id: "aneis", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/app/rings");
  });

  it("meditacao liberada: navega para o player com state", () => {
    render(<AcaoRecomendadaCard acao={{ id: "liberar_estresse", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith(
      "/app/meditation-player",
      expect.objectContaining({ state: expect.objectContaining({ meditation: expect.any(Object) }) }),
    );
  });

  it("meditacao premium para free: abre upgrade, não navega", () => {
    tierValue = "free";
    canAccessValue = false;
    render(<AcaoRecomendadaCard acao={{ id: "liberar_estresse", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(requestUpgradeMock).toHaveBeenCalledWith("acao_liberar_estresse");
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("id legado via tipo continua funcionando", () => {
    render(<AcaoRecomendadaCard acao={{ tipo: "sono", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/app/meditacoes-sono");
  });

  it("id desconhecido não renderiza", () => {
    const { container } = render(<AcaoRecomendadaCard acao={{ id: "inexistente", ...base }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar — todos passam**

Run: `npm run test -- AcaoRecomendadaCard`
Expected: PASS (5 testes).

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/__tests__/AcaoRecomendadaCard.test.tsx
git commit -m "test(card): navegacao por kind, gating premium e compat tipo legado"
```

---

## Notas de verificação final

- O `EcoMessageWithAudio.tsx` e `MessageList.tsx` usam só `extractAcaoRecomendada`/`AcaoRecomendadaCard` (default) — não importam `ACTION_REGISTRY`, então renomear para `CATALOG` não os quebra. Confirmar com:
  Run: `git grep -n "ACTION_REGISTRY" src` → Expected: 0 ocorrências fora do card.
- Os dois repos commitam em paralelo; nenhuma migração de banco envolvida.
