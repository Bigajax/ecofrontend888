# Design — Catálogo de "Próximo Passo" (Action Engine v2)

**Data:** 2026-06-01
**Repos:** `ecobackend888` (engine) + `ecofrontend888` (card/registry)
**Status:** aprovado para implementação

## Contexto

Hoje o `AcaoRecomendadaCard` exibe, abaixo de uma resposta da Eco, UM próximo passo
(meditar / dormir / escrever / refletir / ver relatório). O backend (`server/services/
conversation/actionEngine.ts`) decide a ação semântica por regras determinísticas e
conservadoras; o frontend (`src/components/chat/AcaoRecomendadaCard.tsx`) mapeia o tipo
para rota + capa real + cor de acento.

Hoje são **5 tipos** (`meditacao | sono | diario | estoicismo | relatorio`). Queremos
estender para mais programas/meditações do app, mantendo o conservadorismo e a segurança.

## Decisões (brainstorming)

1. **Granularidade:** ambos — o engine pode recomendar tanto um **programa** quanto uma
   **meditação** pontual.
2. **Arquitetura:** catálogo por `id`. O backend envia `id` + `kind` + copy; o frontend
   tem um registry `id → {rota, capa, cor, kicker, navegação}`. Backend é dono de
   *quando/copy/prioridade*; frontend é dono da *apresentação e navegação*. O `id` é o
   contrato compartilhado.
3. **Premium:** o engine pode recomendar itens premium a usuários free; o clique abre o
   modal de upgrade (igual `ProgramasPage`) — alavanca de conversão. O gating fica no
   frontend (handler do card), não no engine.
4. **Escopo v1 (enxuto):** os 5 atuais + 4 novos bem separados — `aneis`,
   `riqueza_mental`, `energy_blessings`, `liberar_estresse`. Cresce depois.

## Contrato SSE (`acao_recomendada`)

```ts
interface AcaoRecomendada {
  id: string;                          // contrato compartilhado (catálogo)
  kind: "programa" | "meditacao";      // como o front navega
  titulo: string;
  descricao: string;
  cta: string;
  prioridade: number;
  tipo?: TipoAcao;                     // alias legado p/ os 5 ids antigos (compat)
}
```

- **Compat:** os 5 ids atuais (`meditacao`, `sono`, `diario`, `estoicismo`, `relatorio`)
  continuam sendo emitidos com o mesmo nome; `id === tipo` para eles. O frontend aceita
  tanto `id` quanto o `tipo` legado na extração (`extractAcaoRecomendada` já é tolerante).
- O frontend valida `id ∈ CATALOG`; id desconhecido → não renderiza (degrada para nada).

## Catálogo v1 (9 itens) + gatilhos

Ordenado por prioridade (engine escolhe o maior que não esteja em cooldown). **Bloqueio
total em crise** mantido (`FLAGS_BLOQUEIO_CRISE`). Cooldown por usuário mantido.

| id | kind | prio | sinal (gatilho) | rota / alvo | capa | accent | kicker |
|----|------|------|-----------------|-------------|------|--------|--------|
| `sono` | programa | 100 | insônia / noite *(existe)* | /app/meditacoes-sono | meditacoes-sono-hero | #6E63B0 | DESCANSAR |
| `meditacao` | programa | 90 | ansiedade / ativação aguda *(existe)* | /app/introducao-meditacao | introducao-meditacao-hero | #36A8E8 | RESPIRAR |
| `liberar_estresse` | meditacao | 85 | estresse / tensão acumulada do dia | player (blessing_11) | liberando-estresse | #8855C4 | LIBERAR |
| `estoicismo` | programa | 80 | autocrítica / autocobrança *(existe)* | /app/diario-estoico | diario-marco-aurelio | #B5895E | REFLETIR |
| `diario` | programa | 70 | confusão / desabafo *(existe)* | /app/diario-estoico | diario-estoico | #5C9A78 | ESCREVER |
| `aneis` | programa | 68 | falta de constância / procrastinação | /app/rings | 5-aneis-hero | #B07C3F | PERSISTIR |
| `riqueza_mental` | programa | 62 | dinheiro / escassez / mindset financeiro | /app/riqueza-mental | quem-pensa-enriquece | #3B6BA5 | PROSPERAR |
| `relatorio` | programa | 60 | tema recorrente *(existe)* | /app/memory/report | relatorio-emocional-ilustracao | #2E6FB0 | OBSERVAR |
| `energy_blessings` | programa | 58 | desânimo / energia baixa | /app/energy-blessings | meditacao-bencao-energia | #E67E3C | ENERGIZAR |

### Gatilhos dos 4 novos (regex conceitual, matching por prefixo a partir de `\b`)

- **liberar_estresse** — `estress | tensao/tenso | dia pesado/dificil | sobrecarregad |
  no limite | preciso relaxar/descarregar | exausto do trabalho | fim de expediente`.
  → **Mover** `estressad|estresse|sobrecarregad` de `RE_ATIVACAO` para cá, deixando
  `RE_ATIVACAO` para ativação aguda (ansios/panico/acelerado/coração disparado). Assim
  o sinal fica limpo e ansiedade aguda (prio 90) ainda ganha de estresse do dia (85).
- **aneis** — `procrastin | deixo pra/para depois | adio/adiar | enrol | sempre desisto |
  desisto sempre | nunca termino | nao consigo manter | falta de disciplina | sem
  disciplina | sem constancia | nao tenho constancia | nao crio habito | preguica de`.
- **riqueza_mental** — `dinheiro | grana | divida(s) | financ | sem dinheiro | falta de
  dinheiro | escassez | contas para/pra pagar | boleto(s) | salario | prosperidade |
  ganhar mais | mindset financeiro | pobre`.
- **energy_blessings** — `sem energia | sem animo | desanimad | desmotivad | exaust |
  esgotad | apatic | sem vontade | sem forcas | abatid | prostrad | drenad`.
  (não inclui "cansaço para dormir" — isso é `sono`.)

## Frontend

### `CATALOG` (novo, em `AcaoRecomendadaCard.tsx`)

`Record<string, CatalogEntry>` onde:
```ts
interface CatalogEntry {
  kind: "programa" | "meditacao";
  rota: string;
  cover: string;        // /images/...
  kicker: string;
  accent: string;       // hex
  glyph: "play" | "open";
  premiumId?: string;   // id p/ canAccessMeditation (gating)
  meditationState?: {   // só quando kind === "meditacao"
    title: string; duration: string; audioUrl: string;
    imageUrl: string; gradient: string;
  };
}
```
- `ACTION_REGISTRY` atual é absorvido pelo `CATALOG` (os 5 ids antigos viram entradas).
- O visual do card (display azul-bebê, glow, grão, play/seta, Geist+Lora) é o **já
  aprovado** — sem mudanças estéticas. Só cresce o número de ids suportados.

### Navegação por `kind` (handler `go()`)

- `kind === "programa"` → `navigate(rota)`.
- `kind === "meditacao"` → checar acesso premium (`canAccessMeditation(premiumId, tier)`):
  - liberado → `navigate("/app/meditation-player", { state: { meditation: meditationState } })`.
  - bloqueado → `requestUpgrade("acao_" + id)` (modal de upgrade), sem navegar.
- O `glyph` é **explícito por entrada** no `CATALOG` (não derivado do `kind`). Mantém o
  comportamento atual: práticas (`meditacao`, `sono`, `estoicismo`, `diario`,
  `liberar_estresse`) usam `play`; navegação para programa/relatório usa `open` (seta).

## Segurança / conservadorismo (inalterados)

- Crise (e sinais granulares) → `null`, nenhum card.
- Cooldown por usuário+id mantém anti-repetição (2h default).
- Sem gatilho claro → `null`. Apenas uma ação por turno.

## Testes

- **Backend** (`actionEngine.test.ts`): um caso por novo gatilho (match + copy + prioridade),
  caso de crise bloqueando os novos, caso de desambiguação estresse-vs-ansiedade.
- **Frontend** (`AcaoRecomendadaCard.test.tsx`): render de um id `programa` (navega rota) e
  um id `meditacao` (navega player com state); id premium + free → upgrade; id desconhecido
  → não renderiza.

## Fora de escopo (v2+)

- `dispenza`, `recondicione`, `caleidoscopio`, `abundancia`, `sons`, `ecodream` e
  meditações individuais extras (`respiracao`, `caminhando`, etc.).
- Engine ciente de tier (filtrar premium no backend) — hoje o gating é no front.
