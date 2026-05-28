# Onboarding de Objetivos no `/assinar` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inserir telas de captura de objetivos (múltipla escolha) e validação antes do pricing em `/assinar`, persistir respostas em Supabase mesmo para guests, vincular ao `user_id` no signup, e adicionar rodapé legal em todas as etapas.

**Architecture:** Reusa o padrão `Step` existente em `AssinarPage.tsx`, adicionando dois novos steps (`goals`, `validation`) antes de `plan`. Reusa a tabela `quiz_responses` do backend via `quiz_source: "onboarding_objetivos"` + 1 migration aditiva (`user_id`, `guest_id`, `skipped`). Persistência tolerante a falha: quiz nunca bloqueia onboarding.

**Tech Stack:** Frontend React 18 + TypeScript + Vite + Vitest + Tailwind (no repo `ecofrontend888`). Backend Node + Express + Jest + Supabase admin client (no repo `ecobackend888`, paralelo).

**Repositórios:**
- Frontend: `C:\Users\Rafael\Desktop\ecofrontend888`
- Backend: `C:\Users\Rafael\Desktop\ecofrontend\ecobackend888`

**Branch sugerida (em ambos):** `feat/onboarding-objetivos` (ou continuar em `feat/trial-freemium-pricing` se preferir bundlar).

**Spec base:** `docs/superpowers/specs/2026-05-28-onboarding-objetivos-design.md`

---

## File Structure

### Backend (`ecobackend888`)

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260528_add_user_id_guest_id_to_quiz_responses.sql` | CREATE | ALTER TABLE: adicionar `user_id`, `guest_id`, `skipped` |
| `server/controllers/quizController.ts` | MODIFY | Estender `saveQuizResponse` (skipped + guest_id); adicionar `linkUserToQuizResponse` |
| `server/routes/quizRoutes.ts` | MODIFY | Registrar `PATCH /response/:id/link-user` com `requireAuth` |
| `server/__tests__/quizController.save.test.ts` | CREATE | Testar save com skipped + guest_id |
| `server/__tests__/quizController.linkUser.test.ts` | CREATE | Testar PATCH link-user |

### Frontend (`ecofrontend888`)

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/components/assinar/goalsData.ts` | CREATE | Constantes: OBJETIVOS, VALIDATION_CARDS, LEGAL_LINKS, tipo GoalId |
| `src/utils/onboardingObjetivosStorage.ts` | CREATE | sessionStorage helpers (responseId + answers) |
| `src/utils/__tests__/onboardingObjetivosStorage.test.ts` | CREATE | Testar set/get/clear |
| `src/api/onboardingObjetivos.ts` | CREATE | HTTP: `saveObjetivos()`, `linkUserToObjetivos()` |
| `src/api/__tests__/onboardingObjetivos.test.ts` | CREATE | Testar headers, body, métodos |
| `src/components/assinar/LegalFooter.tsx` | CREATE | Rodapé legal reutilizável |
| `src/components/assinar/__tests__/LegalFooter.test.tsx` | CREATE | Testar renderização + links |
| `src/components/assinar/GoalsStep.tsx` | CREATE | Tela das perguntas (multi-select + Continuar/Pular) |
| `src/components/assinar/__tests__/GoalsStep.test.tsx` | CREATE | Testar interação + callbacks |
| `src/components/assinar/ValidationStep.tsx` | CREATE | Tela de validação com 4 cards fixos |
| `src/components/assinar/__tests__/ValidationStep.test.tsx` | CREATE | Testar render + continuar |
| `src/pages/AssinarPage.tsx` | MODIFY | Adicionar steps `goals`/`validation`, link-user effect, footer |
| `src/pages/__tests__/AssinarPage.test.tsx` | MODIFY | Casos novos (default step, OAuth shortcut, transições) |
| `public/images/onboarding/icon-*.png` | EXTERNAL | 4 ícones (pendência design — vide spec) |

---

## Task 1: Backend — Migration adicionar user_id, guest_id, skipped

**Repo:** `ecobackend888`

**Files:**
- Create: `supabase/migrations/20260528_add_user_id_guest_id_to_quiz_responses.sql`

- [ ] **Step 1.1: Criar o arquivo de migration**

Criar `supabase/migrations/20260528_add_user_id_guest_id_to_quiz_responses.sql`:

```sql
-- Migration: Add user_id, guest_id, skipped to quiz_responses
-- Date: 2026-05-28
-- Description: Suporte para vincular respostas ao usuário pós-signup e rastrear guests

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

- [ ] **Step 1.2: Aplicar migration localmente (se houver supabase local) ou apenas commitar**

Se você roda Supabase local com CLI:
```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
supabase db reset  # ou supabase migration up
```

Caso contrário, basta commitar o arquivo. O DBA / pipeline aplica.

- [ ] **Step 1.3: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
git add supabase/migrations/20260528_add_user_id_guest_id_to_quiz_responses.sql
git commit -m "feat(quiz): add user_id, guest_id, skipped to quiz_responses"
```

---

## Task 2: Backend — Estender `saveQuizResponse` (skipped + guest_id)

**Repo:** `ecobackend888`

**Files:**
- Modify: `server/controllers/quizController.ts` (função `saveQuizResponse`, ~linhas 16-54)
- Create: `server/__tests__/quizController.save.test.ts`

- [ ] **Step 2.1: Escrever o teste falhando**

Criar `server/__tests__/quizController.save.test.ts`:

```ts
import { saveQuizResponse } from "../controllers/quizController";

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock("../lib/supabaseAdmin", () => ({
  ensureSupabaseConfigured: () => ({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSingle.mockResolvedValue({ data: { id: "uuid-1" }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
});

test("rejeita answers vazio quando skipped !== true", async () => {
  const req: any = { body: { answers: [] }, headers: {} };
  const res = mockRes();
  await saveQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test("aceita answers vazio quando skipped === true", async () => {
  const req: any = {
    body: { answers: [], skipped: true, quiz_source: "onboarding_objetivos" },
    headers: { "x-eco-guest-id": "guest-abc" },
  };
  const res = mockRes();
  await saveQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ skipped: true, guest_id: "guest-abc", quiz_source: "onboarding_objetivos" }),
  );
});

test("grava guest_id do header e skipped default false", async () => {
  const req: any = {
    body: { answers: [{ question: "objetivos", answer: ["sono"] }], quiz_source: "onboarding_objetivos" },
    headers: { "x-eco-guest-id": "guest-xyz" },
  };
  const res = mockRes();
  await saveQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ guest_id: "guest-xyz", skipped: false }),
  );
});

test("guest_id null quando header ausente", async () => {
  const req: any = {
    body: { answers: [{ question: "q", answer: "a" }] },
    headers: {},
  };
  const res = mockRes();
  await saveQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(201);
  expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ guest_id: null }));
});
```

- [ ] **Step 2.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
npx jest server/__tests__/quizController.save.test.ts
```

Expected: FAIL (saveQuizResponse atual não aceita `skipped` nem lê `x-eco-guest-id`)

- [ ] **Step 2.3: Modificar `saveQuizResponse`**

Em `server/controllers/quizController.ts`, substituir a função `saveQuizResponse` por:

```ts
export async function saveQuizResponse(req: Request, res: Response) {
  try {
    const { answers, utm, quiz_source, skipped } = req.body ?? {};
    const skippedFlag = skipped === true;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        error: "INVALID_PAYLOAD",
        message: "answers deve ser um array",
      });
    }
    if (answers.length === 0 && !skippedFlag) {
      return res.status(400).json({
        error: "INVALID_PAYLOAD",
        message: "answers deve ser não-vazio (ou skipped: true)",
      });
    }

    const guestHeader = req.headers["x-eco-guest-id"];
    const guestId = typeof guestHeader === "string" && guestHeader.length > 0 ? guestHeader : null;

    const supabase = ensureSupabaseConfigured();

    const { data, error } = await supabase
      .from("quiz_responses")
      .insert({
        answers,
        utm_data: utm ?? null,
        quiz_source: quiz_source ?? "quiz_sono",
        skipped: skippedFlag,
        guest_id: guestId,
      })
      .select("id")
      .single();

    if (error) {
      logger.error("quiz_response_insert_error", { error: error.message });
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar respostas" });
    }

    logger.info("quiz_response_saved", {
      id: data.id,
      quiz_source: quiz_source ?? "quiz_sono",
      skipped: skippedFlag,
      hasGuestId: Boolean(guestId),
    });

    return res.status(201).json({ id: data.id });
  } catch (error) {
    logger.error("save_quiz_response_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao salvar respostas" });
  }
}
```

- [ ] **Step 2.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
npx jest server/__tests__/quizController.save.test.ts
```

Expected: PASS (4 testes)

- [ ] **Step 2.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
git add server/controllers/quizController.ts server/__tests__/quizController.save.test.ts
git commit -m "feat(quiz): save accepts skipped flag and x-eco-guest-id header"
```

---

## Task 3: Backend — `PATCH /response/:id/link-user`

**Repo:** `ecobackend888`

**Files:**
- Modify: `server/controllers/quizController.ts` (adicionar `linkUserToQuizResponse`)
- Modify: `server/routes/quizRoutes.ts` (registrar a rota)
- Create: `server/__tests__/quizController.linkUser.test.ts`

- [ ] **Step 3.1: Escrever o teste falhando**

Criar `server/__tests__/quizController.linkUser.test.ts`:

```ts
import { linkUserToQuizResponse } from "../controllers/quizController";

const mockSelect = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockUpdate = jest.fn();
const mockSelectAfterUpdate = jest.fn();
const mockFrom = jest.fn();

jest.mock("../lib/supabaseAdmin", () => ({
  ensureSupabaseConfigured: () => ({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: SELECT by id retorna response sem user_id
  mockMaybeSingle.mockResolvedValue({ data: { id: "uuid-1", user_id: null }, error: null });
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  // Default: UPDATE OK
  mockSelectAfterUpdate.mockResolvedValue({ data: [{ id: "uuid-1" }], error: null });
  mockUpdate.mockReturnValue({ eq: () => ({ is: () => ({ select: mockSelectAfterUpdate }) }) });
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
});

test("400 se id malformado (não é UUID)", async () => {
  const req: any = { user: { id: "u1" }, params: { id: "not-a-uuid" } };
  const res = mockRes();
  await linkUserToQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test("401 se sem req.user", async () => {
  const req: any = { user: undefined, params: { id: "00000000-0000-0000-0000-000000000001" } };
  const res = mockRes();
  await linkUserToQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test("404 se response não existe", async () => {
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  const req: any = { user: { id: "u1" }, params: { id: "00000000-0000-0000-0000-000000000001" } };
  const res = mockRes();
  await linkUserToQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(404);
});

test("200 alreadyLinked quando user_id já preenchido", async () => {
  mockMaybeSingle.mockResolvedValue({ data: { id: "uuid-1", user_id: "outro-user" }, error: null });
  const req: any = { user: { id: "u1" }, params: { id: "00000000-0000-0000-0000-000000000001" } };
  const res = mockRes();
  await linkUserToQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ success: true, alreadyLinked: true });
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("200 success quando update vincula user_id", async () => {
  const req: any = { user: { id: "u1" }, params: { id: "00000000-0000-0000-0000-000000000001" } };
  const res = mockRes();
  await linkUserToQuizResponse(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ success: true });
  expect(mockUpdate).toHaveBeenCalledWith({ user_id: "u1" });
});
```

- [ ] **Step 3.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
npx jest server/__tests__/quizController.linkUser.test.ts
```

Expected: FAIL (`linkUserToQuizResponse is not a function`)

- [ ] **Step 3.3: Implementar `linkUserToQuizResponse`**

Em `server/controllers/quizController.ts`, adicionar ao fim:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/quiz/response/:id/link-user
 *
 * Vincula uma resposta de quiz ao usuário autenticado (após signup/login).
 * Idempotente: 200 com alreadyLinked=true se já estava vinculado.
 */
export async function linkUserToQuizResponse(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Autenticação obrigatória" });
    }

    const { id } = req.params;
    if (!id || !UUID_RE.test(id)) {
      return res.status(400).json({ error: "INVALID_ID", message: "ID inválido" });
    }

    const supabase = ensureSupabaseConfigured();

    const { data: existing, error: selectErr } = await supabase
      .from("quiz_responses")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (selectErr) {
      logger.error("quiz_link_select_error", { id, error: selectErr.message });
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao buscar resposta" });
    }
    if (!existing) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Resposta não encontrada" });
    }
    if (existing.user_id) {
      logger.info("quiz_link_noop_already_linked", { id });
      return res.status(200).json({ success: true, alreadyLinked: true });
    }

    const { error: updateErr } = await supabase
      .from("quiz_responses")
      .update({ user_id: userId })
      .eq("id", id)
      .is("user_id", null)
      .select("id");

    if (updateErr) {
      logger.error("quiz_link_update_error", { id, error: updateErr.message });
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro ao vincular usuário" });
    }

    logger.info("quiz_link_success", { id, userId });
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("link_user_to_quiz_response_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Erro inesperado" });
  }
}
```

- [ ] **Step 3.4: Registrar a rota com `requireAuth`**

Em `server/routes/quizRoutes.ts`, substituir o conteúdo por:

```ts
import express from "express";
import { saveQuizResponse, markQuizConverted, linkUserToQuizResponse } from "../controllers/quizController";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

// POST /api/quiz/response  (público — guests podem responder)
router.post("/response", saveQuizResponse);

// PATCH /api/quiz/response/:id/convert  (público — tracking de conversão)
router.patch("/response/:id/convert", markQuizConverted);

// PATCH /api/quiz/response/:id/link-user  (autenticado — vincula ao user)
router.patch("/response/:id/link-user", requireAuth, linkUserToQuizResponse);

export default router;
```

- [ ] **Step 3.5: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
npx jest server/__tests__/quizController.linkUser.test.ts server/__tests__/quizController.save.test.ts
```

Expected: PASS (todos os testes do quizController)

- [ ] **Step 3.6: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend/ecobackend888
git add server/controllers/quizController.ts server/routes/quizRoutes.ts server/__tests__/quizController.linkUser.test.ts
git commit -m "feat(quiz): add PATCH /response/:id/link-user endpoint"
```

---

## Task 4: Frontend — Constantes em `goalsData.ts`

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/components/assinar/goalsData.ts`

Esse arquivo é só dados; não precisa de teste isolado (será coberto via testes dos componentes).

- [ ] **Step 4.1: Criar `goalsData.ts`**

```ts
// src/components/assinar/goalsData.ts

export const OBJETIVOS = [
  { id: "sono",      label: "Durma bem" },
  { id: "ansiedade", label: "Gerenciar a ansiedade" },
  { id: "estresse",  label: "Reduzir o estresse" },
  { id: "presenca",  label: "Esteja presente e consciente" },
  { id: "calma",     label: "Sinta-se calmo e relaxado" },
  { id: "outro",     label: "Outra coisa" },
] as const;

export type GoalId = (typeof OBJETIVOS)[number]["id"];

export const VALIDATION_CARDS = [
  {
    id: "estresse",
    text: "Reduza o estresse com o apoio diário do ECO, seu companheiro de IA empático.",
    icon: "/images/onboarding/icon-estresse.png",
  },
  {
    id: "ansiedade",
    text: "Controle a ansiedade com meditações guiadas e exercícios de respiração.",
    icon: "/images/onboarding/icon-ansiedade.png",
  },
  {
    id: "sono",
    text: "Durma melhor com podcasts relaxantes e técnicas de relaxamento desenvolvidas com a Ecotopia.",
    icon: "/images/onboarding/icon-sono.png",
  },
  {
    id: "presenca",
    text: "Esteja mais presente com pausas curtas para redefinir o foco ao longo do dia.",
    icon: "/images/onboarding/icon-presenca.png",
  },
] as const;

// URLs reais virão de produto/legal. Manter "#" garante render sem 404.
export const LEGAL_LINKS = {
  termos: "#",
  cookies: "#",
  avisoCalifornia: "#",
  privacidade: "#",
  opcoesPrivacidade: "#",
  dadosSaude: "#",
};
```

- [ ] **Step 4.2: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/components/assinar/goalsData.ts
git commit -m "feat(assinar): constants for onboarding objetivos and legal links"
```

---

## Task 5: Frontend — `onboardingObjetivosStorage` (sessionStorage helpers)

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/utils/onboardingObjetivosStorage.ts`
- Create: `src/utils/__tests__/onboardingObjetivosStorage.test.ts`

- [ ] **Step 5.1: Escrever o teste falhando**

Criar `src/utils/__tests__/onboardingObjetivosStorage.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest";
import {
  getStoredObjetivos,
  setStoredObjetivos,
  clearStoredObjetivos,
  getStoredResponseId,
  setStoredResponseId,
  clearStoredResponseId,
} from "../onboardingObjetivosStorage";

beforeEach(() => {
  sessionStorage.clear();
});

describe("answers storage", () => {
  test("get vazio retorna null", () => {
    expect(getStoredObjetivos()).toBeNull();
  });

  test("set/get round-trip", () => {
    setStoredObjetivos({ answers: ["sono", "estresse"], skipped: false });
    expect(getStoredObjetivos()).toEqual({ answers: ["sono", "estresse"], skipped: false });
  });

  test("clear remove", () => {
    setStoredObjetivos({ answers: [], skipped: true });
    clearStoredObjetivos();
    expect(getStoredObjetivos()).toBeNull();
  });

  test("get tolera JSON malformado", () => {
    sessionStorage.setItem("eco.assinar.objetivos.v1", "not-json");
    expect(getStoredObjetivos()).toBeNull();
  });
});

describe("responseId storage", () => {
  test("get vazio retorna null", () => {
    expect(getStoredResponseId()).toBeNull();
  });

  test("set/get round-trip", () => {
    setStoredResponseId("uuid-1");
    expect(getStoredResponseId()).toBe("uuid-1");
  });

  test("clear remove", () => {
    setStoredResponseId("uuid-1");
    clearStoredResponseId();
    expect(getStoredResponseId()).toBeNull();
  });
});
```

- [ ] **Step 5.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/utils/__tests__/onboardingObjetivosStorage.test.ts
```

Expected: FAIL (módulo não existe)

- [ ] **Step 5.3: Implementar `onboardingObjetivosStorage.ts`**

```ts
// src/utils/onboardingObjetivosStorage.ts

import type { GoalId } from "@/components/assinar/goalsData";

const ANSWERS_KEY = "eco.assinar.objetivos.v1";
const RESPONSE_ID_KEY = "eco.assinar.objetivos.responseId";

export interface StoredObjetivos {
  answers: GoalId[];
  skipped: boolean;
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function getStoredObjetivos(): StoredObjetivos | null {
  const store = safeStorage();
  if (!store) return null;
  const raw = store.getItem(ANSWERS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.answers) || typeof parsed.skipped !== "boolean") {
      return null;
    }
    return parsed as StoredObjetivos;
  } catch {
    return null;
  }
}

export function setStoredObjetivos(value: StoredObjetivos): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(ANSWERS_KEY, JSON.stringify(value));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function clearStoredObjetivos(): void {
  safeStorage()?.removeItem(ANSWERS_KEY);
}

export function getStoredResponseId(): string | null {
  return safeStorage()?.getItem(RESPONSE_ID_KEY) ?? null;
}

export function setStoredResponseId(id: string): void {
  safeStorage()?.setItem(RESPONSE_ID_KEY, id);
}

export function clearStoredResponseId(): void {
  safeStorage()?.removeItem(RESPONSE_ID_KEY);
}
```

- [ ] **Step 5.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/utils/__tests__/onboardingObjetivosStorage.test.ts
```

Expected: PASS (7 testes)

- [ ] **Step 5.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/utils/onboardingObjetivosStorage.ts src/utils/__tests__/onboardingObjetivosStorage.test.ts
git commit -m "feat(assinar): sessionStorage helpers for onboarding objetivos"
```

---

## Task 6: Frontend — API client `onboardingObjetivos.ts`

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/api/onboardingObjetivos.ts`
- Create: `src/api/__tests__/onboardingObjetivos.test.ts`

- [ ] **Step 6.1: Escrever o teste falhando**

Criar `src/api/__tests__/onboardingObjetivos.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { saveObjetivos, linkUserToObjetivos } from "../onboardingObjetivos";

vi.mock("@/config/apiBase", () => ({
  apiUrl: (p: string) => `http://test.local${p}`,
}));

vi.mock("@/utils/identity", () => ({
  getOrCreateGuestId: () => "guest-test-123",
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveObjetivos", () => {
  test("POST com headers + body corretos (resposta normal)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "uuid-1" }),
    });

    const result = await saveObjetivos({ answers: ["sono", "estresse"], skipped: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api/quiz/response");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-eco-guest-id": "guest-test-123",
    });
    expect(JSON.parse(init.body)).toEqual({
      quiz_source: "onboarding_objetivos",
      answers: [{ question: "objetivos", answer: ["sono", "estresse"] }],
      skipped: false,
    });
    expect(result).toEqual({ id: "uuid-1" });
  });

  test("body para Pular (answers vazio + skipped true)", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "uuid-2" }) });
    await saveObjetivos({ answers: [], skipped: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ answers: [{ question: "objetivos", answer: [] }], skipped: true });
  });

  test("retorna null quando fetch falha (não-throw)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await saveObjetivos({ answers: ["sono"], skipped: false });
    expect(result).toBeNull();
  });

  test("retorna null quando response não-OK", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await saveObjetivos({ answers: ["sono"], skipped: false });
    expect(result).toBeNull();
  });
});

describe("linkUserToObjetivos", () => {
  test("PATCH com Bearer token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api/quiz/response/uuid-1/link-user");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt-token" });
    expect(result).toBe(true);
  });

  test("retorna false em erro de rede", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(result).toBe(false);
  });

  test("retorna false em 401", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 6.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/api/__tests__/onboardingObjetivos.test.ts
```

Expected: FAIL (módulo não existe)

- [ ] **Step 6.3: Implementar `onboardingObjetivos.ts`**

```ts
// src/api/onboardingObjetivos.ts

import { apiUrl } from "@/config/apiBase";
import { getOrCreateGuestId } from "@/utils/identity";
import type { GoalId } from "@/components/assinar/goalsData";

interface SaveInput {
  answers: GoalId[];
  skipped: boolean;
}

interface SaveResult {
  id: string;
}

const TIMEOUT_MS = 8000;

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cleanup: () => clearTimeout(t) };
}

export async function saveObjetivos(input: SaveInput): Promise<SaveResult | null> {
  const { signal, cleanup } = withTimeout();
  try {
    const res = await fetch(apiUrl("/api/quiz/response"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-eco-guest-id": getOrCreateGuestId(),
      },
      body: JSON.stringify({
        quiz_source: "onboarding_objetivos",
        answers: [{ question: "objetivos", answer: input.answers }],
        skipped: input.skipped,
      }),
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as SaveResult;
    if (!body?.id) return null;
    return { id: body.id };
  } catch {
    return null;
  } finally {
    cleanup();
  }
}

export async function linkUserToObjetivos(responseId: string, jwt: string): Promise<boolean> {
  const { signal, cleanup } = withTimeout();
  try {
    const res = await fetch(apiUrl(`/api/quiz/response/${encodeURIComponent(responseId)}/link-user`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    cleanup();
  }
}
```

- [ ] **Step 6.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/api/__tests__/onboardingObjetivos.test.ts
```

Expected: PASS (7 testes)

- [ ] **Step 6.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/api/onboardingObjetivos.ts src/api/__tests__/onboardingObjetivos.test.ts
git commit -m "feat(assinar): API client for onboarding objetivos (save + link-user)"
```

---

## Task 7: Frontend — `LegalFooter`

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/components/assinar/LegalFooter.tsx`
- Create: `src/components/assinar/__tests__/LegalFooter.test.tsx`

- [ ] **Step 7.1: Escrever o teste falhando**

Criar `src/components/assinar/__tests__/LegalFooter.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalFooter } from "../LegalFooter";

describe("LegalFooter", () => {
  test("renderiza copyright", () => {
    render(<LegalFooter />);
    expect(screen.getByText(/© 2026 Ecotopia Inc\./i)).toBeInTheDocument();
  });

  test("renderiza os 6 links legais", () => {
    render(<LegalFooter />);
    expect(screen.getByRole("link", { name: /Termos e condições/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de cookies/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aviso de Privacidade da Califórnia/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de Privacidade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Suas opções de privacidade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dados de saúde do consumidor/i })).toBeInTheDocument();
  });

  test("todos os links têm atributo href", () => {
    render(<LegalFooter />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    links.forEach((a) => expect(a).toHaveAttribute("href"));
  });
});
```

- [ ] **Step 7.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/LegalFooter.test.tsx
```

Expected: FAIL (componente não existe)

- [ ] **Step 7.3: Implementar `LegalFooter.tsx`**

```tsx
// src/components/assinar/LegalFooter.tsx

import { LEGAL_LINKS } from "./goalsData";

export function LegalFooter() {
  return (
    <footer className="mt-12 w-full" style={{ background: "#1A2330", color: "rgba(255,255,255,0.72)" }}>
      <div className="mx-auto w-full max-w-[420px] px-5 py-6 text-[12px]">
        <p className="text-center text-[12px]">© 2026 Ecotopia Inc.</p>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <a href={LEGAL_LINKS.termos} className="underline-offset-2 hover:underline">Termos e condições</a>
          <a href={LEGAL_LINKS.privacidade} className="underline-offset-2 hover:underline">Política de Privacidade</a>
          <a href={LEGAL_LINKS.cookies} className="underline-offset-2 hover:underline">Política de cookies</a>
          <a href={LEGAL_LINKS.opcoesPrivacidade} className="underline-offset-2 hover:underline">Suas opções de privacidade</a>
          <a href={LEGAL_LINKS.avisoCalifornia} className="underline-offset-2 hover:underline">Aviso de Privacidade da Califórnia</a>
          <a href={LEGAL_LINKS.dadosSaude} className="underline-offset-2 hover:underline">Dados de saúde do consumidor</a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/LegalFooter.test.tsx
```

Expected: PASS (3 testes)

- [ ] **Step 7.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/components/assinar/LegalFooter.tsx src/components/assinar/__tests__/LegalFooter.test.tsx
git commit -m "feat(assinar): LegalFooter component with legal links and copyright"
```

---

## Task 8: Frontend — `GoalsStep`

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/components/assinar/GoalsStep.tsx`
- Create: `src/components/assinar/__tests__/GoalsStep.test.tsx`

- [ ] **Step 8.1: Escrever o teste falhando**

Criar `src/components/assinar/__tests__/GoalsStep.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsStep } from "../GoalsStep";

describe("GoalsStep", () => {
  test("renderiza as 6 opções", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Durma bem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gerenciar a ansiedade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reduzir o estresse/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esteja presente e consciente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sinta-se calmo e relaxado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Outra coisa/i })).toBeInTheDocument();
  });

  test("Continuar desabilitado sem seleção", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeDisabled();
  });

  test("toggle: clicar marca, clicar de novo desmarca", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    const sono = screen.getByRole("button", { name: /Durma bem/i });
    fireEvent.click(sono);
    expect(sono).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(sono);
    expect(sono).toHaveAttribute("aria-pressed", "false");
  });

  test("Continuar habilita com ≥1 seleção e chama onContinue com array", () => {
    const onContinue = vi.fn();
    render(<GoalsStep onContinue={onContinue} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Durma bem/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reduzir o estresse/i }));
    const cont = screen.getByRole("button", { name: /Continuar/i });
    expect(cont).not.toBeDisabled();
    fireEvent.click(cont);
    expect(onContinue).toHaveBeenCalledWith(["sono", "estresse"]);
  });

  test("Pular sempre habilitado e chama onSkip", () => {
    const onSkip = vi.fn();
    render(<GoalsStep onContinue={vi.fn()} onSkip={onSkip} />);
    const pular = screen.getByRole("button", { name: /^Pular$/i });
    expect(pular).not.toBeDisabled();
    fireEvent.click(pular);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 8.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/GoalsStep.test.tsx
```

Expected: FAIL (componente não existe)

- [ ] **Step 8.3: Implementar `GoalsStep.tsx`**

```tsx
// src/components/assinar/GoalsStep.tsx

import { useState } from "react";
import { OBJETIVOS, type GoalId } from "./goalsData";

interface Props {
  onContinue: (answers: GoalId[]) => void;
  onSkip: () => void;
}

export function GoalsStep({ onContinue, onSkip }: Props) {
  const [selected, setSelected] = useState<GoalId[]>([]);

  const toggle = (id: GoalId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canContinue = selected.length > 0;

  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 rounded-2xl px-6 py-8"
      style={{ background: "#1554F0", color: "#FFFFFF" }}
    >
      <h1 className="text-center font-display text-[26px] font-bold leading-tight">
        Quais são os objetivos<br />que devemos perseguir<br />juntos?
      </h1>

      <ul className="mt-2 flex flex-col gap-3" role="list">
        {OBJETIVOS.map(({ id, label }) => {
          const active = selected.includes(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={active}
                className="flex w-full items-center justify-between rounded-full px-5 py-3.5 text-left text-[15px] font-semibold transition-all"
                style={{ background: "#FFFFFF", color: "#0D3461" }}
              >
                <span>{label}</span>
                <span
                  aria-hidden
                  className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    background: active ? "#1554F0" : "rgba(21,84,240,0.10)",
                    border: active ? "none" : "1px solid rgba(21,84,240,0.25)",
                  }}
                >
                  {active && <span className="block h-2 w-2 rounded-full" style={{ background: "#FFFFFF" }} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={() => onContinue(selected)}
          disabled={!canContinue}
          className="w-full rounded-full py-4 text-[16px] font-bold transition-all disabled:cursor-not-allowed"
          style={{
            background: canContinue ? "#0D3461" : "rgba(13,52,97,0.55)",
            color: "#FFFFFF",
          }}
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-full py-3.5 text-[15px] font-semibold"
          style={{ background: "#FFFFFF", color: "#0D3461" }}
        >
          Pular
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/GoalsStep.test.tsx
```

Expected: PASS (5 testes)

- [ ] **Step 8.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/components/assinar/GoalsStep.tsx src/components/assinar/__tests__/GoalsStep.test.tsx
git commit -m "feat(assinar): GoalsStep — multi-select objetivos with Continuar/Pular"
```

---

## Task 9: Frontend — `ValidationStep`

**Repo:** `ecofrontend888`

**Files:**
- Create: `src/components/assinar/ValidationStep.tsx`
- Create: `src/components/assinar/__tests__/ValidationStep.test.tsx`

- [ ] **Step 9.1: Escrever o teste falhando**

Criar `src/components/assinar/__tests__/ValidationStep.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidationStep } from "../ValidationStep";

describe("ValidationStep", () => {
  test("renderiza headline e subtitle", () => {
    render(<ValidationStep onContinue={vi.fn()} />);
    expect(screen.getByText(/Você está no lugar certo/i)).toBeInTheDocument();
    expect(screen.getByText(/aumenta a felicidade/i)).toBeInTheDocument();
  });

  test("renderiza os 4 cards de validação", () => {
    render(<ValidationStep onContinue={vi.fn()} />);
    expect(screen.getByText(/Reduza o estresse com o apoio diário do ECO/i)).toBeInTheDocument();
    expect(screen.getByText(/Controle a ansiedade/i)).toBeInTheDocument();
    expect(screen.getByText(/Durma melhor com podcasts/i)).toBeInTheDocument();
    expect(screen.getByText(/Esteja mais presente/i)).toBeInTheDocument();
  });

  test("Continuar chama onContinue", () => {
    const onContinue = vi.fn();
    render(<ValidationStep onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 9.2: Rodar teste e confirmar que falha**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/ValidationStep.test.tsx
```

Expected: FAIL (componente não existe)

- [ ] **Step 9.3: Implementar `ValidationStep.tsx`**

```tsx
// src/components/assinar/ValidationStep.tsx

import { VALIDATION_CARDS } from "./goalsData";

interface Props {
  onContinue: () => void;
}

export function ValidationStep({ onContinue }: Props) {
  return (
    <div
      className="flex min-h-[calc(100vh-120px)] flex-col gap-6 rounded-2xl px-6 py-8"
      style={{ background: "#1554F0", color: "#FFFFFF" }}
    >
      <h1 className="text-center font-display text-[24px] font-bold leading-tight">
        Você está no lugar<br />certo para começar a<br />se sentir melhor.
      </h1>
      <p className="eco-subtitle text-center text-[15px] leading-snug" style={{ color: "rgba(255,255,255,0.92)" }}>
        Está comprovado que a Ecotopia aumenta a felicidade<br />e diminui o estresse em apenas 10 dias.
      </p>

      <ul className="mt-2 flex flex-col gap-3" role="list">
        {VALIDATION_CARDS.map((card) => (
          <li
            key={card.id}
            className="flex items-center gap-4 rounded-2xl px-4 py-4"
            style={{ background: "rgba(13,52,97,0.55)" }}
          >
            <img src={card.icon} alt="" aria-hidden className="h-12 w-12 flex-none" />
            <p className="text-[14px] leading-snug">{card.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full py-4 text-[16px] font-bold"
          style={{ background: "#0D3461", color: "#FFFFFF" }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.4: Rodar testes e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/components/assinar/__tests__/ValidationStep.test.tsx
```

Expected: PASS (3 testes)

- [ ] **Step 9.5: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/components/assinar/ValidationStep.tsx src/components/assinar/__tests__/ValidationStep.test.tsx
git commit -m "feat(assinar): ValidationStep — 'Você está no lugar certo' + cards"
```

---

## Task 10: Frontend — Integrar tudo no `AssinarPage`

**Repo:** `ecofrontend888`

**Files:**
- Modify: `src/pages/AssinarPage.tsx`
- Modify: `src/pages/__tests__/AssinarPage.test.tsx`

- [ ] **Step 10.1: Escrever testes falhando**

Antes de editar, ver o teste atual:

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
cat src/pages/__tests__/AssinarPage.test.tsx
```

Adicionar (ou criar se vazio) no `src/pages/__tests__/AssinarPage.test.tsx` os blocos abaixo, mantendo testes existentes intactos:

```tsx
import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AssinarPage from "../AssinarPage";

// Mocks de dependências externas
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("@/api/onboardingObjetivos", () => ({
  saveObjetivos: vi.fn().mockResolvedValue({ id: "uuid-1" }),
  linkUserToObjetivos: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

beforeEach(() => {
  sessionStorage.clear();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AssinarPage />
    </MemoryRouter>,
  );
}

describe("AssinarPage onboarding flow", () => {
  test("default abre em 'goals' (sem ?step na URL)", () => {
    renderAt("/assinar?plan=monthly");
    expect(screen.getByText(/Quais são os objetivos/i)).toBeInTheDocument();
  });

  test("?step=card mantém shortcut do OAuth return", async () => {
    renderAt("/assinar?plan=monthly&step=card");
    await waitFor(() => {
      expect(screen.getByText(/Comece seu trial de 7 dias/i)).toBeInTheDocument();
    });
  });

  test("goals.Continuar → validation", async () => {
    renderAt("/assinar?plan=monthly");
    fireEvent.click(screen.getByRole("button", { name: /Durma bem/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    await waitFor(() => {
      expect(screen.getByText(/Você está no lugar certo/i)).toBeInTheDocument();
    });
  });

  test("goals.Pular → validation", async () => {
    renderAt("/assinar?plan=monthly");
    fireEvent.click(screen.getByRole("button", { name: /^Pular$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Você está no lugar certo/i)).toBeInTheDocument();
    });
  });

  test("validation.Continuar → plan", async () => {
    renderAt("/assinar?plan=monthly&step=validation");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Comece seu teste gratuito/i })).toBeInTheDocument();
    });
  });

  test("LegalFooter aparece em todas as etapas", () => {
    renderAt("/assinar?plan=monthly");
    expect(screen.getByText(/© 2026 Ecotopia Inc\./i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10.2: Rodar testes e confirmar que falham**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/pages/__tests__/AssinarPage.test.tsx
```

Expected: FAIL — `Quais são os objetivos` não está na tela porque o default ainda é `plan`.

- [ ] **Step 10.3: Modificar `AssinarPage.tsx`**

Substituir o conteúdo de `src/pages/AssinarPage.tsx` por:

```tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { PlanStep } from "@/components/assinar/PlanStep";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import { GoalsStep } from "@/components/assinar/GoalsStep";
import { ValidationStep } from "@/components/assinar/ValidationStep";
import { LegalFooter } from "@/components/assinar/LegalFooter";
import type { PlanId } from "@/components/assinar/types";
import type { GoalId } from "@/components/assinar/goalsData";
import { saveObjetivos, linkUserToObjetivos } from "@/api/onboardingObjetivos";
import {
  setStoredObjetivos,
  setStoredResponseId,
  getStoredResponseId,
  clearStoredResponseId,
} from "@/utils/onboardingObjetivosStorage";

type Step = "goals" | "validation" | "plan" | "signup" | "card";

const STEP_VALUES: readonly Step[] = ["goals", "validation", "plan", "signup", "card"] as const;

function parseStep(value: string | null): Step {
  return (STEP_VALUES as readonly string[]).includes(value ?? "") ? (value as Step) : "goals";
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function parsePlan(value: string | null): PlanId {
  return value === "annual" ? "annual" : "monthly";
}

export default function AssinarPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>(parsePlan(params.get("plan")));
  const [step, setStep] = useState<Step>(parseStep(params.get("step")));
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Sincroniza step na URL (?step=…) sempre que muda
  useEffect(() => {
    const current = params.get("step");
    if (current !== step) {
      const p = new URLSearchParams(params);
      p.set("step", step);
      setParams(p, { replace: true });
    }
  }, [step, params, setParams]);

  // OAuth return: ?step=card já vem na URL via parseStep → nada a fazer aqui.

  // Vincula response a user assim que entramos no step "card" e há sessão + responseId
  useEffect(() => {
    if (step !== "card") return;
    const responseId = getStoredResponseId();
    if (!responseId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const ok = await linkUserToObjetivos(responseId, token);
      if (!cancelled && ok) clearStoredResponseId();
    })();
    return () => { cancelled = true; };
  }, [step, user]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
  };

  const submitObjetivos = async (answers: GoalId[], skipped: boolean) => {
    setStoredObjetivos({ answers, skipped });
    const result = await saveObjetivos({ answers, skipped });
    if (result?.id) setStoredResponseId(result.id);
    setStep("validation");
  };

  const handleGoalsContinue = (answers: GoalId[]) => { void submitObjetivos(answers, false); };
  const handleGoalsSkip = () => { void submitObjetivos([], true); };

  const continueFromPlan = () => setStep(user ? "card" : "signup");

  const handleToken = async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    try {
      const res = await fetch(apiUrl("/api/subscription/create-with-card"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ...formData, plan }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Não foi possível concluir a assinatura.");
      }
      navigate("/app/subscription/callback");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setProcessing(false);
    }
  };

  const googleReturnTo = `/assinar?plan=${plan}&step=card`;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="px-5 py-6">
        <Link to="/" aria-label="Ecotopia — início" className="inline-block">
          <img src="/images/ecotopia-logo-trim.png" alt="Ecotopia" className="h-7 w-auto" />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[420px] flex-1 px-5 pb-10">
        {step === "goals" && (
          <GoalsStep onContinue={handleGoalsContinue} onSkip={handleGoalsSkip} />
        )}

        {step === "validation" && (
          <ValidationStep onContinue={() => setStep("plan")} />
        )}

        {step === "plan" && (
          <PlanStep selectedPlan={plan} onSelectPlan={selectPlan} onContinue={continueFromPlan} />
        )}

        {step === "signup" && (
          <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
        )}

        {step === "card" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-center font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>
              Comece seu trial de 7 dias
            </h2>
            <p className="eco-subtitle text-center text-[14px]" style={{ color: "#5A8AAD" }}>
              {plan === "monthly"
                ? "R$ 0 hoje. Cobramos R$ 15,90/mês só após 7 dias — cancele quando quiser."
                : "R$ 0 hoje. Cobramos R$ 142,80/ano só após 7 dias — cancele quando quiser."}
            </p>
            <MpCardForm
              amount={plan === "monthly" ? 15.9 : 142.8}
              maxInstallments={1}
              onToken={handleToken}
              onError={setErro}
            />
            {processing && (
              <p aria-live="polite" className="text-center text-[13px]" style={{ color: "#5A8AAD" }}>Processando…</p>
            )}
            {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
          </div>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
```

- [ ] **Step 10.4: Rodar testes do AssinarPage e confirmar que passam**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npx vitest run src/pages/__tests__/AssinarPage.test.tsx
```

Expected: PASS (todos os testes, novos + antigos)

- [ ] **Step 10.5: Rodar suíte completa de testes — não introduzir regressão**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npm run test -- --run
```

Expected: contagem de falhas não-superior ao baseline pré-feature (~33 pré-existentes, conforme MEMORY.md).

- [ ] **Step 10.6: Verificar build**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npm run build
```

Expected: build limpo (apenas `vite`, sem typecheck — conforme MEMORY.md).

- [ ] **Step 10.7: Validar manualmente no browser**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
npm run dev
```

Abrir `http://localhost:5173/assinar?plan=monthly` e validar:
- Tela `goals` aparece (fundo azul, 6 opções, Continuar desabilitado)
- Selecionar 2 → Continuar habilita
- Clicar Continuar → tela `validation` aparece (4 cards)
- Clicar Continuar → `PlanStep` aparece (pricing)
- Footer escuro visível no fim em todas as telas
- Voltar para `/assinar?plan=monthly&step=card` (simulando OAuth) → vai direto ao card
- Network tab: POST `/api/quiz/response` com `quiz_source: "onboarding_objetivos"` e `x-eco-guest-id` no header

- [ ] **Step 10.8: Commit**

```bash
cd C:/Users/Rafael/Desktop/ecofrontend888
git add src/pages/AssinarPage.tsx src/pages/__tests__/AssinarPage.test.tsx
git commit -m "feat(assinar): wire goals/validation steps + LegalFooter + link-user on card"
```

---

## Self-review (já feito antes do save)

**Cobertura do spec:**
- [x] Step `goals` antes do pricing → Tasks 4, 5, 6, 8, 10
- [x] Step `validation` com cards fixos → Tasks 4, 9, 10
- [x] Múltipla escolha sem limite → Task 8
- [x] `Pular` grava `skipped: true` → Tasks 2, 6, 10
- [x] Guest grava sempre via `x-eco-guest-id` → Tasks 2, 6
- [x] Vinculação `responseId → user_id` no signup → Tasks 3, 6, 10 (effect em step=card)
- [x] `LegalFooter` em todas as etapas → Tasks 4, 7, 10
- [x] URL espelha `?step=` → Task 10 (useEffect)
- [x] `?step=card` mantém atalho OAuth → Task 10 (parseStep aceita "card")
- [x] Erros silenciosos (não bloqueiam) → Task 6 retorna `null`/`false`, Task 10 ignora

**Sem placeholders nas tarefas:** todos os blocos têm código completo. ✓

**Consistência de tipos:** `GoalId`, `StoredObjetivos`, `SaveInput/Result` definidos antes do uso. ✓

**Itens fora do escopo do plano** (continuam na seção "Pendências externas" do spec):
- Copy final dos 4 cards (placeholder em uso)
- URLs reais dos 6 links legais (`"#"` em uso)
- 4 ícones em `/public/images/onboarding/icon-*.png` (broken images até substituir)
