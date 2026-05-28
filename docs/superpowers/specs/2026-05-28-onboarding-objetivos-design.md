# Onboarding de Objetivos no fluxo `/assinar`

**Data:** 2026-05-28
**Status:** Design aprovado, aguardando plano de implementação
**Branch sugerida:** `feat/onboarding-objetivos`

## Contexto

Hoje, a CTA "Começar 7 dias grátis" das landings leva direto a `/assinar`, que abre na etapa `plan` (pricing + seletor anual/mensal). Não há nenhuma captura sobre o que o usuário busca antes de ver os valores.

Queremos inserir, **antes do pricing**, uma tela de perguntas curtas para entender o objetivo do usuário e uma tela de validação ("Você está no lugar certo…") com prova social. As respostas precisam ser persistidas no Supabase e, quando o usuário se cadastrar nas etapas seguintes, vinculadas ao `user_id`.

Adicionalmente, um rodapé legal (copyright + links de termos/privacidade) deve aparecer em todas as etapas do `/assinar`.

## Objetivos

1. Capturar objetivos do usuário (múltipla escolha) antes do pricing, com opção de "Pular".
2. Mostrar uma tela de validação com 4 cards fixos de prova social antes do pricing.
3. Persistir respostas no Supabase mesmo para guests, vinculando ao `user_id` quando o cadastro acontecer.
4. Adicionar rodapé legal único em todas as etapas do `/assinar`.

## Não-objetivos (YAGNI)

- Personalizar os cards de validação por resposta (decidimos: cards fixos).
- Permitir saltar telas via URL fora do retorno OAuth existente (`?step=card`).
- Implementar retry automático do PATCH `link-user` quando falhar.
- Rotas separadas (`/onboarding/objetivos`) — tudo continua sob `/assinar`.
- Dashboard de analytics dos objetivos (consumo é via SQL direto no Supabase).
- Mudar copy / cards baseado em A/B no primeiro release.

## Arquitetura

### Visão geral do fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (logo Ecotopia → /)                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   goals  ──▶  validation  ──▶  plan  ──▶  signup  ──▶  card     │
│   (NOVO)        (NOVO)        (existe)   (existe)   (existe)    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ LegalFooter (© Ecotopia · Termos · Privacidade · Cookies)        │
└─────────────────────────────────────────────────────────────────┘
```

URL espelha o step: `/assinar?plan=monthly&step=goals|validation|plan|signup|card`. Default ao entrar = `goals`. Exceção mantida do comportamento atual: `?step=card` (retorno OAuth) ainda salta direto para o card.

## Componentes

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/components/assinar/GoalsStep.tsx` | Tela de múltipla escolha de objetivos |
| `src/components/assinar/ValidationStep.tsx` | Tela "Você está no lugar certo" + 4 cards fixos |
| `src/components/assinar/LegalFooter.tsx` | Rodapé legal reutilizável |
| `src/components/assinar/goalsData.ts` | Catálogo de objetivos + cards de validação |
| `src/api/onboardingObjetivos.ts` | Cliente HTTP: `saveObjetivos()`, `linkUserToObjetivos()` |
| `src/utils/onboardingObjetivosStorage.ts` | Helpers sessionStorage (responseId + answers) |

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `src/pages/AssinarPage.tsx` | Adicionar `goals` e `validation` ao enum `Step`; render condicional; montar `LegalFooter` |
| `src/components/assinar/SignupStep.tsx` | Chamar `linkUserToObjetivos()` no sucesso do cadastro |
| `src/components/assinar/types.ts` | Exportar tipos `GoalId`, `GoalAnswers` |

### `GoalsStep.tsx`

```ts
interface Props {
  onContinue: (answers: GoalId[]) => void;
  onSkip: () => void;
}
```

- Fundo `#1554F0` (cor do botão principal), título display em branco
- 6 pílulas brancas com radio circle sólido azul à direita quando selecionado
- Opções vêm de `goalsData.OBJETIVOS` (constante)
- Botão "Continuar" desabilitado até `answers.length >= 1`
- Botão "Pular" sempre habilitado → chama `onSkip()`
- Durante o POST, "Continuar" exibe spinner inline e desabilita clique duplicado
- "Pular" dispara POST fire-and-forget e navega imediatamente

### `ValidationStep.tsx`

```ts
interface Props {
  onContinue: () => void;
}
```

- Mesmo fundo azul; headline "Você está no lugar certo para começar a se sentir melhor."
- Subtitle (Lora): "Está comprovado que a Ecotopia aumenta a felicidade e diminui o estresse em apenas 10 dias."
- 4 cards azul-escuro com ícone + texto (estresse / ansiedade / sono / presença), conteúdo fixo de `goalsData.VALIDATION_CARDS`
- Botão "Continuar" → `onContinue()`

### `LegalFooter.tsx`

- Sem props
- Fundo `#1A2330`, texto cinza, padding 24px
- Linha topo: "© 2026 Ecotopia Inc."
- Duas colunas:
  - Coluna A: Termos e condições, Política de cookies, Aviso de Privacidade
  - Coluna B: Política de Privacidade, Suas opções de privacidade, Dados de saúde do consumidor
- Links são `<a href="#">` placeholders inicialmente; URLs serão preenchidas via tabela de constantes em `goalsData.ts` (campo `LEGAL_LINKS`)

### `goalsData.ts`

```ts
export const OBJETIVOS = [
  { id: "sono",      label: "Durma bem" },
  { id: "ansiedade", label: "Gerenciar a ansiedade" },
  { id: "estresse",  label: "Reduzir o estresse" },
  { id: "presenca",  label: "Esteja presente e consciente" },
  { id: "calma",     label: "Sinta-se calmo e relaxado" },
  { id: "outro",     label: "Outra coisa" },
] as const;

export type GoalId = typeof OBJETIVOS[number]["id"];

// Copy adaptada de Ecotopia (NÃO Headspace). Texto definitivo virá de produto;
// implementador deve usar a versão "placeholder" abaixo até receber a copy final.
export const VALIDATION_CARDS = [
  { id: "estresse",  text: "Reduza o estresse com o apoio diário do ECO, seu companheiro de IA empático.",                                       icon: "/images/onboarding/icon-estresse.png" },
  { id: "ansiedade", text: "Controle a ansiedade com meditações guiadas e exercícios de respiração.",                                            icon: "/images/onboarding/icon-ansiedade.png" },
  { id: "sono",      text: "Durma melhor com podcasts relaxantes e técnicas de relaxamento desenvolvidas com a Ecotopia.",                       icon: "/images/onboarding/icon-sono.png" },
  { id: "presenca",  text: "Esteja mais presente com pausas curtas para redefinir o foco ao longo do dia.",                                     icon: "/images/onboarding/icon-presenca.png" },
] as const;

// URLs reais virão do time de produto/legal (ver seção "Pendências externas").
// Manter "#" garante que o footer renderiza sem 404 enquanto isso.
export const LEGAL_LINKS = {
  termos: "#",
  cookies: "#",
  avisoCalifornia: "#",
  privacidade: "#",
  opcoesPrivacidade: "#",
  dadosSaude: "#",
};
```

> **Pendências externas (não bloqueiam a implementação)**
> - Copy final dos 4 cards de validação (produto)
> - 6 URLs dos links legais (produto / legal)
> - 4 ícones em `/public/images/onboarding/icon-*.png` (design)
>
> Implementador usa os textos placeholder e `href="#"` acima até receber os definitivos.

## Data flow

### Submit dos objetivos (Continuar ou Pular)

```
goals step
  │
  ├─► sessionStorage.set("eco.assinar.objetivos.v1", { answers, skipped })
  │
  ├─► POST /api/quiz/response
  │     headers: { x-eco-guest-id }
  │     body: {
  │       quiz_source: "onboarding_objetivos",
  │       answers: [{ question: "objetivos", answer: ["sono","ansiedade"] }],
  │       skipped: false,
  │       utm: {...}
  │     }
  │   ← { id: "uuid" }
  │
  ├─► sessionStorage.set("eco.assinar.objetivos.responseId", "uuid")
  └─► setStep("validation")
```

"Pular": mesmo POST com `answers: []`, `skipped: true`, depois `setStep("validation")` (a validação sempre aparece, decisão de produto).

### Vinculação ao user no signup

```
SignupStep.onCreated() (cadastro bem-sucedido OU OAuth callback)
  │
  ├─► responseId = sessionStorage.get("eco.assinar.objetivos.responseId")
  ├─► if (responseId) {
  │     PATCH /api/quiz/response/:id/link-user
  │       headers: Authorization: Bearer <supabase_jwt>
  │       (controller deriva user_id do JWT)
  │     sessionStorage.delete("eco.assinar.objetivos.responseId")
  │   }
  └─► setStep("card")
```

### Persistência local

Duas chaves em `sessionStorage`:

- `eco.assinar.objetivos.v1` → `{ answers: GoalId[]; skipped: boolean }`
  Sobrevive ao round-trip do OAuth, permite restaurar a UI se o usuário voltar via browser back.

- `eco.assinar.objetivos.responseId` → `string (UUID)`
  Usado pelo `PATCH /link-user` após signup. Removido após link bem-sucedido.

## Backend

### Migration

`supabase/migrations/20260528_add_user_id_guest_id_to_quiz_responses.sql`:

```sql
ALTER TABLE public.quiz_responses
  ADD COLUMN user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN guest_id TEXT,
  ADD COLUMN skipped  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_quiz_responses_user_id  ON public.quiz_responses(user_id);
CREATE INDEX idx_quiz_responses_guest_id ON public.quiz_responses(guest_id);

COMMENT ON COLUMN public.quiz_responses.user_id  IS 'Set when user signs up after answering (linked via PATCH /link-user)';
COMMENT ON COLUMN public.quiz_responses.guest_id IS 'x-eco-guest-id at submit time, for pre-auth tracking';
COMMENT ON COLUMN public.quiz_responses.skipped  IS 'TRUE when user clicked Pular (answers is [])';
```

Compatível com `quiz_sono` existente: `user_id`, `guest_id` e `skipped` ficam NULL/FALSE para rows antigos.

### `POST /api/quiz/response` (estender)

Em `server/controllers/quizController.ts`, `saveQuizResponse`:

- Aceita campo opcional `skipped: boolean` no body (default `false`)
- Lê header `x-eco-guest-id`, grava na coluna `guest_id`
- Mantém validação atual de `answers`. Para o caso "Pular", `answers: []` é válido **somente quando** `skipped === true`. Caso contrário, retorna 400 como hoje.
- Insert inclui `guest_id` e `skipped`

### `PATCH /api/quiz/response/:id/link-user` (NOVO)

Em `server/routes/quizRoutes.ts`:

```ts
router.patch("/response/:id/link-user", requireAuth, linkUserToQuizResponse);
```

Novo controller `linkUserToQuizResponse`:

- Middleware `requireAuth` valida Bearer token e injeta `req.user.id`
- Update: `UPDATE quiz_responses SET user_id = :userId WHERE id = :id AND user_id IS NULL`
- Idempotente: se `user_id` já estava preenchido, retorna `200 { success: true, alreadyLinked: true }` sem update
- Erros:
  - 400 se `id` malformado (não-UUID)
  - 401 se sem Bearer token (middleware)
  - 404 se response não existe
  - 200 em update OU já-linkado

## Error handling

### Frontend

- `POST /api/quiz/response` falhou (network ou 5xx): **não bloqueia o usuário**. Loga em console + Mixpanel (`onboarding_objetivos_save_failed`), segue para o próximo step. `responseId` fica `null`; o PATCH `link-user` é pulado.
- Timeout: `AbortController` de 8s. Falha cai no mesmo path.
- Durante o POST, "Continuar" mostra spinner inline e bloqueia clique duplicado. "Pular" não espera resposta (fire-and-forget).
- `PATCH /link-user` falhou: log silencioso, **não bloqueia** avanço para o card. `responseId` permanece em sessionStorage (sem retry agora — YAGNI).
- 401 no PATCH (token inválido): mesmo path.

### Backend

- `POST /response`: validação de payload já existe. Adicionar validação `skipped: boolean` opcional. Caso `answers === []` e `skipped !== true`, manter 400 atual.
- `PATCH /:id/link-user`: códigos definidos acima.

## Testes

### Frontend (novos / editados)

```
src/components/assinar/__tests__/
├── GoalsStep.test.tsx                       [NOVO]
│   - renderiza 6 opções
│   - botão Continuar desabilitado sem seleção
│   - toggle de seleção (marca / desmarca)
│   - Continuar chama onContinue com array correto
│   - Pular chama onSkip sem exigir seleção
│
├── ValidationStep.test.tsx                  [NOVO]
│   - renderiza headline + 4 cards fixos
│   - Continuar chama onContinue
│
└── LegalFooter.test.tsx                     [NOVO]
    - renderiza copyright + 6 links
    - todos os links têm href definido

src/pages/__tests__/AssinarPage.test.tsx     [EDITAR]
    - default step é "goals" (sem ?step na URL)
    - ?step=card ainda vai direto pro card (OAuth return)
    - goals.onContinue → step "validation"
    - goals.onSkip → step "validation"
    - validation.onContinue → step "plan"

src/api/__tests__/onboardingObjetivos.test.ts [NOVO]
    - saveObjetivos: headers + body corretos
    - linkUserToObjetivos: PATCH com Bearer

src/utils/__tests__/onboardingObjetivosStorage.test.ts [NOVO]
    - set/get/clear do responseId
    - set/get/clear das answers
```

### Backend (novos / editados)

```
server/__tests__/
├── quizController.linkUser.test.ts          [NOVO]
│   - 401 sem token
│   - 404 se id não existe
│   - 200 + update se response existia sem user_id
│   - 200 + no-op (alreadyLinked: true) se já tinha user_id
│
└── quizController.save.test.ts              [EDITAR ou NOVO]
    - aceita skipped: true com answers: []
    - rejeita answers: [] quando skipped: false
    - lê x-eco-guest-id do header e grava
    - quiz_source: "onboarding_objetivos" funciona
```

### Fora de escopo de teste

- Estilos visuais (cores, gradientes), animações
- Integração end-to-end com Supabase real (mocks do client são suficientes)

## Decisões registradas

| # | Decisão | Razão |
|---|---|---|
| 1 | Múltipla escolha (sem limite) | Captura mais sinal de objetivo composto |
| 2 | Guest grava sempre, mesmo "Pular" | Maximiza dado de análise + funil; "Pular" vira sinal de intenção fraca |
| 3 | Validação sempre aparece, cards fixos | Simplicidade, sem dependência das respostas |
| 4 | Reusar `quiz_responses` com `quiz_source` discriminador | Backend já tem padrão, schema compatível com 1 migration aditiva |
| 5 | Linkagem `responseId` → `user_id` via PATCH separado no signup | Desacopla submit do quiz do fluxo de auth; tolera falha sem quebrar onboarding |
| 6 | URL espelha `?step=` | Permite refresh sem perder lugar; mantém o padrão OAuth-return atual |
| 7 | LegalFooter com URLs placeholder `#` | URLs reais virão do produto/legal depois |
