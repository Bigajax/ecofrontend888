# /assinar — Trial Checkout (Headspace-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a split-screen `/assinar` page (plan + trial timeline on the left, signup + embedded MercadoPago card on the right) that starts a 7-day-trial monthly subscription (R$0 today) or an immediate annual purchase.

**Architecture:** New public route `AssinarPage` with a 2-step right panel (signup → card). Monthly uses a NEW transparent preapproval endpoint (`card_token` + `free_trial`); annual reuses the existing `/api/payments/annual/card`. The existing preapproval webhook + `/app/subscription/callback` handle activation. Landing purchase CTAs are repointed from `/register?plan=…` to `/assinar?plan=…`.

**Tech Stack:** React 18 + TS + Vite, Tailwind, Vitest + React Testing Library; backend Express + TS, `mercadopago` SDK, Jest. Two repos: frontend `C:\Users\Rafael\Desktop\ecofrontend888`, backend `C:\Users\Rafael\Desktop\ecofrontend\ecobackend888`.

**Note on backend MP-method tests:** the existing MP preapproval methods (`createMonthlyPreapproval`) have no unit tests because they are thin SDK wrappers. We follow that pattern: Task 1 (SDK method) ships without a dedicated test; the meaningful logic (validation, auth, fallback) is TDD-tested at the handler level in Task 2.

---

## File Structure

**Backend (`ecobackend888`):**
- Modify `server/services/MercadoPagoService.ts` — add `createMonthlyPreapprovalWithCard(...)` + public `createMonthlyTrialWithCard(...)` wrapper.
- Modify `server/controllers/subscriptionController.ts` — add `createWithCardHandler`.
- Modify `server/routes/subscriptionRoutes.ts` — add `POST /create-with-card`.
- Test `server/__tests__/createWithCardHandler.test.ts`.

**Frontend (`ecofrontend888`):**
- Create `src/components/assinar/types.ts` — shared `PlanId`, copy constants.
- Create `src/components/assinar/MpCardForm.tsx` — MP CardPayment brick wrapper.
- Create `src/components/assinar/TrialPlanPanel.tsx` — left panel (plan selector + timeline).
- Create `src/components/assinar/SignupStep.tsx` — right panel step 1 (account creation).
- Create `src/pages/AssinarPage.tsx` — orchestrator.
- Modify `src/App.tsx` — register public `/assinar` route.
- Modify landing CTA components — repoint `/register?plan=…` → `/assinar?plan=…`.
- Tests: `src/components/assinar/__tests__/TrialPlanPanel.test.tsx`, `SignupStep.test.tsx`, `MpCardForm.test.tsx`, `src/pages/__tests__/AssinarPage.test.tsx`.

---

## Task 1: Backend — transparent monthly preapproval method

**Files:**
- Modify: `C:\Users\Rafael\Desktop\ecofrontend\ecobackend888\server\services\MercadoPagoService.ts`

- [ ] **Step 1: Add the transparent preapproval method**

Below the existing `createMonthlyPreapproval` method (ends ~line 216), add:

```typescript
  /**
   * Create monthly subscription with a card token (transparent checkout)
   * + 7-day free trial. No redirect: the card token is collected on our page
   * via the MP CardPayment brick. Returns the preapproval id + status.
   */
  async createMonthlyTrialWithCard(
    userId: string,
    userEmail: string,
    cardTokenId: string
  ): Promise<{ id: string; status: string }> {
    const preApprovalClient = new PreApproval(this.client);

    const response = await preApprovalClient.create({
      body: {
        reason: "Assinatura Premium ECO - Mensal",
        external_reference: userId,
        payer_email: userEmail,
        card_token_id: cardTokenId,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 15.9,
          currency_id: "BRL",
          free_trial: {
            frequency: 7,
            frequency_type: "days",
          },
        },
        back_url: `${this.config.appUrl}/app/subscription/callback`,
        status: "authorized",
      } as any,
    });

    if (!response.id) {
      throw new Error("Invalid preapproval response from Mercado Pago");
    }

    logger.info("monthly_trial_with_card_created", {
      userId,
      preapprovalId: response.id,
      status: response.status,
    });

    return { id: String(response.id), status: String(response.status) };
  }
```

- [ ] **Step 2: Verify it compiles**

Run (in backend repo): `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "MercadoPagoService.ts"`
Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add server/services/MercadoPagoService.ts
git commit -m "feat(backend): transparent monthly preapproval with card token + 7-day trial"
```

---

## Task 2: Backend — `POST /api/subscription/create-with-card` handler + route

**Files:**
- Modify: `server/controllers/subscriptionController.ts`
- Modify: `server/routes/subscriptionRoutes.ts`
- Test: `server/__tests__/createWithCardHandler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/createWithCardHandler.test.ts`:

```typescript
import { createWithCardHandler } from "../controllers/subscriptionController";

const mockCreateTrial = jest.fn();
const mockGetStatus = jest.fn();
const mockRecordEvent = jest.fn();

jest.mock("../services/MercadoPagoService", () => ({
  getMercadoPagoService: () => ({ createMonthlyTrialWithCard: mockCreateTrial }),
}));
jest.mock("../services/SubscriptionService", () => ({
  getSubscriptionService: () => ({ getStatus: mockGetStatus, recordEvent: mockRecordEvent }),
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetStatus.mockResolvedValue({ isPremium: false, subscriptionStatus: "expired" });
  mockCreateTrial.mockResolvedValue({ id: "pre_123", status: "authorized" });
});

test("401 when unauthenticated", async () => {
  const req: any = { user: undefined, body: {} };
  const res = mockRes();
  await createWithCardHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
});

test("400 when card token missing", async () => {
  const req: any = { user: { id: "u1", email: "a@b.com" }, body: {} };
  const res = mockRes();
  await createWithCardHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});

test("creates trial and returns id + status", async () => {
  const req: any = { user: { id: "u1", email: "a@b.com" }, body: { token: "tok_abc" } };
  const res = mockRes();
  await createWithCardHandler(req, res);
  expect(mockCreateTrial).toHaveBeenCalledWith("u1", "a@b.com", "tok_abc");
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ id: "pre_123", status: "authorized" });
});

test("400 when already subscribed", async () => {
  mockGetStatus.mockResolvedValue({ isPremium: true, subscriptionStatus: "active" });
  const req: any = { user: { id: "u1", email: "a@b.com" }, body: { token: "tok_abc" } };
  const res = mockRes();
  await createWithCardHandler(req, res);
  expect(res.status).toHaveBeenCalledWith(400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest server/__tests__/createWithCardHandler.test.ts`
Expected: FAIL — `createWithCardHandler` is not exported.

- [ ] **Step 3: Implement the handler**

In `server/controllers/subscriptionController.ts`, after `createPreferenceHandler` (ends ~line 103), add:

```typescript
/**
 * POST /api/subscription/create-with-card
 *
 * Start a monthly subscription with a 7-day free trial using a card token
 * collected on our page (MP CardPayment brick). R$0 charged today.
 *
 * Body (MP brick formData): { token, ...payer }
 * Returns: { id, status } from the created preapproval.
 */
export async function createWithCardHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId || !userEmail) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Usuário não autenticado" });
    }

    const cardTokenId = req.body?.token;
    if (!cardTokenId || typeof cardTokenId !== "string") {
      return res.status(400).json({ error: "INVALID_BODY", message: "token do cartão é obrigatório" });
    }

    const subscriptionService = getSubscriptionService();
    const currentStatus = await subscriptionService.getStatus(userId);
    if (currentStatus.isPremium && currentStatus.subscriptionStatus === "active") {
      return res.status(400).json({ error: "ALREADY_SUBSCRIBED", message: "Você já possui uma assinatura ativa" });
    }

    const mpService = getMercadoPagoService();
    const result = await mpService.createMonthlyTrialWithCard(userId, userEmail, cardTokenId);

    await subscriptionService.recordEvent(userId, "checkout_initiated", {
      plan: "monthly",
      provider_id: result.id,
    });

    logger.info("trial_with_card_created", { userId, preapprovalId: result.id, status: result.status });

    return res.status(200).json({ id: result.id, status: result.status });
  } catch (error) {
    logger.error("create_with_card_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(502).json({
      error: "PAYMENT_PROVIDER_ERROR",
      message: "Não foi possível iniciar a assinatura. Verifique os dados do cartão e tente novamente.",
    });
  }
}
```

- [ ] **Step 4: Register the route**

In `server/routes/subscriptionRoutes.ts`, import and mount it. Change the import line:

```typescript
import {
  createPreferenceHandler,
  createWithCardHandler,
  getStatusHandler,
  cancelHandler,
  reactivateHandler,
  getInvoicesHandler,
} from "../controllers/subscriptionController";
```

And after the `create-preference` route (line 26) add:

```typescript
/**
 * POST /api/subscription/create-with-card
 * Start a monthly trial subscription using a card token (transparent).
 * Body: MP CardPayment formData ({ token, ... }). Returns: { id, status }.
 */
router.post("/create-with-card", requireAuth, createWithCardHandler);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest server/__tests__/createWithCardHandler.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verify the backend compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "subscriptionController.ts|subscriptionRoutes.ts"`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add server/controllers/subscriptionController.ts server/routes/subscriptionRoutes.ts server/__tests__/createWithCardHandler.test.ts
git commit -m "feat(backend): POST /api/subscription/create-with-card (monthly trial via card token)"
```

---

## Task 3: Frontend — shared plan types & copy

**Files:**
- Create: `src/components/assinar/types.ts`

- [ ] **Step 1: Create the file**

```typescript
export type PlanId = "monthly" | "annual";

export interface TimelineItem {
  label: string;     // e.g. "Hoje"
  title: string;     // e.g. "R$ 0"
  description: string;
}

export const PLAN_COPY: Record<PlanId, {
  badge?: string;
  priceLine: string;       // shown in the plan selector
  subPriceLine: string;
  timeline: TimelineItem[];
}> = {
  monthly: {
    priceLine: "R$ 15,90/mês",
    subPriceLine: "7 dias grátis · cancele quando quiser",
    timeline: [
      { label: "Hoje", title: "R$ 0", description: "Acesso completo à Ecotopia — Eco IA, meditações e sono." },
      { label: "Em 7 dias", title: "Lembrete", description: "Avisamos por e-mail antes de o período gratuito acabar." },
      { label: "Depois", title: "R$ 15,90/mês", description: "Renova automaticamente. Cancele quando quiser." },
    ],
  },
  annual: {
    badge: "Melhor valor",
    priceLine: "R$ 142,80/ano",
    subPriceLine: "R$ 11,90/mês · economize R$ 48",
    timeline: [
      { label: "Hoje", title: "R$ 142,80", description: "1 ano de acesso completo — equivale a R$ 11,90/mês." },
      { label: "Imediato", title: "12 meses", description: "Acesso liberado na hora. Sem renovação surpresa." },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/assinar/types.ts
git commit -m "feat(assinar): plan types and trial timeline copy"
```

---

## Task 4: Frontend — `TrialPlanPanel` (left panel)

**Files:**
- Create: `src/components/assinar/TrialPlanPanel.tsx`
- Test: `src/components/assinar/__tests__/TrialPlanPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrialPlanPanel } from "../TrialPlanPanel";

describe("TrialPlanPanel", () => {
  it("shows the monthly $0-today timeline when monthly is selected", () => {
    render(<TrialPlanPanel selectedPlan="monthly" onSelectPlan={vi.fn()} />);
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByText(/Em 7 dias/i)).toBeInTheDocument();
  });

  it("shows the annual immediate-charge timeline when annual is selected", () => {
    render(<TrialPlanPanel selectedPlan="annual" onSelectPlan={vi.fn()} />);
    expect(screen.getByText(/R\$ 142,80/)).toBeInTheDocument();
    expect(screen.queryByText(/Em 7 dias/i)).not.toBeInTheDocument();
  });

  it("calls onSelectPlan when a plan option is clicked", () => {
    const onSelectPlan = vi.fn();
    render(<TrialPlanPanel selectedPlan="monthly" onSelectPlan={onSelectPlan} />);
    fireEvent.click(screen.getByRole("button", { name: /anual/i }));
    expect(onSelectPlan).toHaveBeenCalledWith("annual");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/assinar/__tests__/TrialPlanPanel.test.tsx --run`
Expected: FAIL — cannot find module `../TrialPlanPanel`.

- [ ] **Step 3: Implement the component**

```tsx
import { PLAN_COPY, type PlanId } from "./types";

interface TrialPlanPanelProps {
  selectedPlan: PlanId;
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS: PlanId[] = ["annual", "monthly"];

export function TrialPlanPanel({ selectedPlan, onSelectPlan }: TrialPlanPanelProps) {
  const copy = PLAN_COPY[selectedPlan];

  return (
    <div className="flex h-full flex-col gap-8 p-8 md:p-12" style={{
      background: "linear-gradient(160deg, #EBF6FF 0%, #DCEEFF 55%, #CFE6FF 100%)",
    }}>
      <div>
        <p className="eco-subtitle text-[15px]" style={{ color: "#3A6FA5" }}>Ecotopia</p>
        <h1 className="font-display text-[28px] md:text-[34px] font-bold leading-tight" style={{ color: "#0D3461" }}>
          {selectedPlan === "monthly"
            ? "Tenha a Ecotopia completa por R$ 0 hoje"
            : "1 ano de Ecotopia completa"}
        </h1>
      </div>

      {/* Plan selector */}
      <div className="flex flex-col gap-3" role="group" aria-label="Escolha o plano">
        {PLANS.map((plan) => {
          const c = PLAN_COPY[plan];
          const active = plan === selectedPlan;
          return (
            <button
              key={plan}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPlan(plan)}
              className="flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                borderColor: active ? "#1A4FB5" : "rgba(13,52,97,0.15)",
                background: active ? "rgba(26,79,181,0.06)" : "rgba(255,255,255,0.6)",
                boxShadow: active ? "0 4px 16px rgba(13,52,97,0.12)" : "none",
              }}
            >
              <span>
                <span className="block font-display text-[16px] font-bold" style={{ color: "#0D3461" }}>
                  {plan === "annual" ? "Anual" : "Mensal"}
                </span>
                <span className="eco-subtitle block text-[13px]" style={{ color: "#5A8AAD" }}>{c.subPriceLine}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {c.badge && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "#1A4FB5" }}>
                    {c.badge}
                  </span>
                )}
                <span className="font-display text-[15px] font-bold" style={{ color: "#0D3461" }}>{c.priceLine}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <ol className="flex flex-col gap-5">
        {copy.timeline.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: "#1A4FB5" }} aria-hidden />
            <span>
              <span className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: "#3A6FA5" }}>{item.label}</span>
              <span className="block font-display text-[18px] font-bold" style={{ color: "#0D3461" }}>{item.title}</span>
              <span className="eco-subtitle block text-[13.5px] leading-snug" style={{ color: "#5A8AAD" }}>{item.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/assinar/__tests__/TrialPlanPanel.test.tsx --run`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/assinar/TrialPlanPanel.tsx src/components/assinar/__tests__/TrialPlanPanel.test.tsx
git commit -m "feat(assinar): TrialPlanPanel with plan selector and adaptive timeline"
```

---

## Task 5: Frontend — `SignupStep` (right panel step 1)

**Files:**
- Create: `src/components/assinar/SignupStep.tsx`
- Test: `src/components/assinar/__tests__/SignupStep.test.tsx`

Context: `useAuth()` exposes `register(email, password, nome, telefone, emailRedirectTo?) => Promise<{ needsConfirmation }>` and `signInWithGoogle() => Promise<void>` (`src/contexts/AuthContext.tsx:36,33`).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const register = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ register, signInWithGoogle }) }));

import { SignupStep } from "../SignupStep";

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
});

describe("SignupStep", () => {
  it("requires accepting the terms before submitting", () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    expect(register).not.toHaveBeenCalled();
  });

  it("registers and calls onCreated when not needing confirmation", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByLabelText(/concordo/i));
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith("ana@x.com", "12345678", "Ana", "");
  });

  it("starts Google sign-in on button click", () => {
    render(<SignupStep onCreated={vi.fn()} googleReturnTo="/assinar?plan=monthly&step=card" />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(signInWithGoogle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/assinar/__tests__/SignupStep.test.tsx --run`
Expected: FAIL — cannot find module `../SignupStep`.

- [ ] **Step 3: Implement the component**

```tsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SignupStepProps {
  onCreated: () => void;           // session is ready (no email confirmation needed)
  googleReturnTo: string;          // where to come back after Google OAuth
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function SignupStep({ onCreated, googleReturnTo }: SignupStepProps) {
  const { register, signInWithGoogle } = useAuth();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (!EMAIL_RE.test(email)) return setErro("E-mail inválido.");
    if (senha.length < 8) return setErro("A senha precisa ter ao menos 8 caracteres.");
    if (!aceito) return setErro("É preciso aceitar os Termos para continuar.");

    setLoading(true);
    try {
      const fullName = [nome.trim(), sobrenome.trim()].filter(Boolean).join(" ");
      const { needsConfirmation } = await register(email.trim(), senha, fullName, "");
      if (needsConfirmation) {
        setInfo("Enviamos um e-mail de confirmação. Confirme para continuar a assinatura.");
        return;
      }
      onCreated();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    try {
      sessionStorage.setItem("eco.assinar.returnTo", googleReturnTo);
      await signInWithGoogle();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao entrar com Google.");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h2 className="font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>Criar conta</h2>

      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Nome*
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Sobrenome
        <input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        E-mail*
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] font-medium" style={{ color: "#3A6FA5" }}>
        Senha (8+ caracteres)*
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="rounded-xl border px-4 py-3 text-[15px] text-[#0D3461]" style={{ borderColor: "rgba(13,52,97,0.18)" }} />
      </label>

      <label className="flex items-start gap-2 text-[13px]" style={{ color: "#5A8AAD" }}>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5" />
        <span>Concordo com os Termos de Uso e a Política de Privacidade.</span>
      </label>

      {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
      {info && <p className="text-[13px]" style={{ color: "#1A4FB5" }}>{info}</p>}

      <button type="submit" disabled={loading} className="rounded-full py-3.5 text-[15px] font-bold text-white disabled:opacity-70" style={{ background: "linear-gradient(135deg, #1A4FB5 0%, #0D3461 100%)" }}>
        {loading ? "Criando…" : "Criar conta"}
      </button>

      <button type="button" onClick={google} className="rounded-full border py-3 text-[14px] font-semibold" style={{ borderColor: "rgba(13,52,97,0.2)", color: "#0D3461" }}>
        Continuar com Google
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/assinar/__tests__/SignupStep.test.tsx --run`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/assinar/SignupStep.tsx src/components/assinar/__tests__/SignupStep.test.tsx
git commit -m "feat(assinar): SignupStep (email/password + Google) with terms gate"
```

---

## Task 6: Frontend — `MpCardForm` (MercadoPago card brick)

**Files:**
- Create: `src/components/assinar/MpCardForm.tsx`
- Test: `src/components/assinar/__tests__/MpCardForm.test.tsx`

Context: pattern mirrors `src/pages/CheckoutAnualPage.tsx` (`initMercadoPago`, `CardPayment` brick, `initialization`/`customization`). We mock `@mercadopago/sdk-react` in the test so the brick invokes `onSubmit` synchronously.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: vi.fn(),
  CardPayment: ({ onSubmit }: { onSubmit: (d: any) => void }) => (
    <button onClick={() => onSubmit({ formData: { token: "tok_1", payment_method_id: "visa" } })}>
      pay-brick
    </button>
  ),
}));

import { MpCardForm } from "../MpCardForm";

describe("MpCardForm", () => {
  it("calls onToken with the brick formData", async () => {
    const onToken = vi.fn().mockResolvedValue(undefined);
    render(<MpCardForm amount={15.9} maxInstallments={1} onToken={onToken} />);
    fireEvent.click(screen.getByText("pay-brick"));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith({ token: "tok_1", payment_method_id: "visa" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/assinar/__tests__/MpCardForm.test.tsx --run`
Expected: FAIL — cannot find module `../MpCardForm`.

- [ ] **Step 3: Implement the component**

```tsx
import { useMemo } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
let mpInitialized = false;
function ensureMpInit() {
  if (!mpInitialized && MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
    mpInitialized = true;
  }
}

interface MpCardFormProps {
  amount: number;
  maxInstallments: number;
  onToken: (formData: Record<string, unknown>) => Promise<void> | void;
  onError?: (message: string) => void;
}

export function MpCardForm({ amount, maxInstallments, onToken, onError }: MpCardFormProps) {
  ensureMpInit();
  const initialization = useMemo(() => ({ amount, payer: { email: "" } }), [amount]);
  const customization = useMemo(
    () => ({ paymentMethods: { minInstallments: 1, maxInstallments } }),
    [maxInstallments]
  );

  return (
    <CardPayment
      initialization={initialization}
      customization={customization}
      onSubmit={async (data) => {
        const formData = (data as { formData?: Record<string, unknown> })?.formData ?? (data as Record<string, unknown>);
        await onToken(formData);
      }}
      onError={(err) => {
        console.error("mp_brick_error", err);
        onError?.("Erro no formulário de cartão. Recarregue a página e tente de novo.");
      }}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/assinar/__tests__/MpCardForm.test.tsx --run`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/assinar/MpCardForm.tsx src/components/assinar/__tests__/MpCardForm.test.tsx
git commit -m "feat(assinar): MpCardForm brick wrapper emitting card token"
```

---

## Task 7: Frontend — `AssinarPage` orchestrator + route

**Files:**
- Create: `src/pages/AssinarPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/__tests__/AssinarPage.test.tsx`

Context: `apiUrl` from `@/config/apiBase`, `supabase` from `@/lib/supabaseClient` for `authHeaders` (mirrors `CheckoutAnualPage.tsx:28-34`). Endpoints: monthly → `/api/subscription/create-with-card`; annual → `/api/payments/annual/card`. On success navigate to `/app/subscription/callback`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, register: vi.fn(), signInWithGoogle: vi.fn() }) }));
vi.mock("@mercadopago/sdk-react", () => ({ initMercadoPago: vi.fn(), CardPayment: () => <div>brick</div> }));

import AssinarPage from "../AssinarPage";

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AssinarPage /></MemoryRouter>);
}

describe("AssinarPage", () => {
  it("defaults to monthly and shows the $0-today timeline + signup step when logged out", () => {
    renderAt("/assinar");
    expect(screen.getByText(/R\$ 0/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeInTheDocument();
  });

  it("reads ?plan=annual and shows the annual timeline", () => {
    renderAt("/assinar?plan=annual");
    expect(screen.getByText(/R\$ 142,80/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/pages/__tests__/AssinarPage.test.tsx --run`
Expected: FAIL — cannot find module `../AssinarPage`.

- [ ] **Step 3: Implement the page**

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/config/apiBase";
import { supabase } from "@/lib/supabaseClient";
import { TrialPlanPanel } from "@/components/assinar/TrialPlanPanel";
import { SignupStep } from "@/components/assinar/SignupStep";
import { MpCardForm } from "@/components/assinar/MpCardForm";
import type { PlanId } from "@/components/assinar/types";

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
  const [step, setStep] = useState<"signup" | "card">(user ? "card" : "signup");
  const [erro, setErro] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Logged-in users (incl. returning from Google OAuth) skip to the card step.
  useEffect(() => {
    if (user) setStep("card");
  }, [user]);

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    const p = new URLSearchParams(params);
    p.set("plan", next);
    setParams(p, { replace: true });
  };

  const handleToken = async (formData: Record<string, unknown>) => {
    setErro(null);
    setProcessing(true);
    try {
      const endpoint = plan === "monthly" ? "/api/subscription/create-with-card" : "/api/payments/annual/card";
      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(formData),
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
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <TrialPlanPanel selectedPlan={plan} onSelectPlan={selectPlan} />

      <div className="flex items-center justify-center bg-white p-8 md:p-12">
        <div className="w-full max-w-md">
          {step === "signup" ? (
            <SignupStep onCreated={() => setStep("card")} googleReturnTo={googleReturnTo} />
          ) : (
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-[22px] font-bold" style={{ color: "#0D3461" }}>
                {plan === "monthly" ? "Comece seu trial de 7 dias" : "Finalize sua assinatura anual"}
              </h2>
              <p className="eco-subtitle text-[14px]" style={{ color: "#5A8AAD" }}>
                {plan === "monthly"
                  ? "R$ 0 hoje. Cobramos R$ 15,90/mês só após 7 dias — cancele quando quiser."
                  : "R$ 142,80 hoje, 1 ano de acesso completo."}
              </p>
              <MpCardForm
                amount={plan === "monthly" ? 15.9 : 142.8}
                maxInstallments={plan === "monthly" ? 1 : 12}
                onToken={handleToken}
                onError={setErro}
              />
              {processing && <p aria-live="polite" className="text-center text-[13px]" style={{ color: "#5A8AAD" }}>Processando…</p>}
              {erro && <p role="alert" className="text-[13px]" style={{ color: "#B43C3C" }}>{erro}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Register the public route in `src/App.tsx`**

Near the other lazy page imports (around line 98 where `CheckoutAnualPage` is imported) add:

```tsx
const AssinarPage = lazy(() => import("@/pages/AssinarPage"));
```

In the public routes area (a sibling of the landing/`/sono/experiencia` public routes, NOT inside `RequireAuth`), add:

```tsx
<Route path="/assinar" element={renderWithSuspense(<AssinarPage />)} />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/pages/__tests__/AssinarPage.test.tsx --run`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/AssinarPage.tsx src/pages/__tests__/AssinarPage.test.tsx src/App.tsx
git commit -m "feat(assinar): AssinarPage orchestrator + public /assinar route"
```

---

## Task 8: Frontend — handle Google OAuth return to the card step

**Files:**
- Modify: `src/pages/AssinarPage.tsx`

Context: `SignupStep` stored `eco.assinar.returnTo` before the Google redirect. After OAuth, Supabase restores the session and the user lands back in the app; ensure that when they return to `/assinar` (with `step=card` or a stored returnTo), the card step shows.

- [ ] **Step 1: Add returnTo consumption (no new test needed — covered by logged-in behavior)**

In `AssinarPage`, replace the initial `step` state init and effect with:

```tsx
  const [step, setStep] = useState<"signup" | "card">(
    user || params.get("step") === "card" ? "card" : "signup"
  );

  useEffect(() => {
    const stored = sessionStorage.getItem("eco.assinar.returnTo");
    if (stored) sessionStorage.removeItem("eco.assinar.returnTo");
    if (user || params.get("step") === "card") setStep("card");
  }, [user, params]);
```

- [ ] **Step 2: Run the page tests**

Run: `npm run test -- src/pages/__tests__/AssinarPage.test.tsx --run`
Expected: PASS (2 tests; logged-out default still shows signup since no `step=card`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/AssinarPage.tsx
git commit -m "feat(assinar): resume on card step after Google OAuth return"
```

---

## Task 9: Frontend — repoint landing purchase CTAs to `/assinar`

**Files (modify):**
- `src/components/landing/PrecoSection.tsx`
- `src/components/landing/EcotopiaHero.tsx`
- `src/components/landing/FechamentoSection.tsx`
- `src/components/landing/JoinSection.tsx`
- `src/components/landing/TresPilaresSection.tsx`
- `src/components/landing/EcotopiaTopbar.tsx`
- `src/components/landing/BibliotecaSection.tsx`

Rule: purchase CTAs that currently point to `/register?plan=…` become `/assinar?plan=…`, **preserving the `from=` query**. The trial entry is monthly, so map `plan=annual` → `plan=monthly` for the generic "experimente grátis / 7 dias" CTAs; keep the explicit **Anual** card in `PrecoSection` as `plan=annual`.

- [ ] **Step 1: PrecoSection — monthly button**

In `src/components/landing/PrecoSection.tsx:67`, change:
`to="/register?plan=monthly&from=pricing"` → `to="/assinar?plan=monthly&from=pricing"`

- [ ] **Step 2: PrecoSection — annual button + fix misleading copy**

In `src/components/landing/PrecoSection.tsx:94`, change:
`to="/register?plan=annual&from=pricing"` → `to="/assinar?plan=annual&from=pricing"`
And line 99 change the label `Começar 7 dias gratuitos` → `Assinar anual` (annual has no trial).

- [ ] **Step 3: Repoint the remaining generic CTAs to monthly trial**

In each of these files, replace every `to="/register?plan=annual&from=X"` (and `ctaTo`/`to:` object forms) with `to="/assinar?plan=monthly&from=X"` (keep each `from` value unchanged):
- `EcotopiaHero.tsx` (lines 101, 127)
- `FechamentoSection.tsx` (line 24)
- `JoinSection.tsx` (line 26)
- `TresPilaresSection.tsx` (lines 189, 204, 219 — `ctaTo`)
- `EcotopiaTopbar.tsx` (lines 59, 294-form, 403, 415)
- `BibliotecaSection.tsx` (lines 51,63,75,87,99,136,148,160,172,187,202 — `to:` fields)

Leave `EcotopiaFooter.tsx:13` ("Criar conta" → `/register`) as-is (account link, not a purchase CTA).

- [ ] **Step 4: Verify no purchase CTA still points to /register?plan**

Run: `npm run test -- --run 2>/dev/null; rg -n "register\?plan" src/components/landing` (or use Grep tool)
Expected: no matches.

- [ ] **Step 5: Build the frontend**

Run: `npm run build`
Expected: build succeeds (Vite; chunk-size warning is fine).

- [ ] **Step 6: Commit**

```bash
git add src/components/landing
git commit -m "feat(landing): route purchase CTAs to /assinar (monthly trial; explicit annual)"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** route + flow (T7,T8), left panel/timeline (T4), signup (T5), embedded card (T6), monthly transparent endpoint (T1,T2), annual reuse (T7 handleToken), landing wiring (T9), callback reuse (T7 navigate), Google returnTo (T5/T8), copy fix (T9.2). Fallback-to-init_point is documented in the spec as a contingency; it is **not** built unless MP rejects transparent preapproval — see "Deferred" below.
- **Type consistency:** `PlanId` used across types.ts/TrialPlanPanel/AssinarPage; `onToken(formData)` matches MpCardForm→AssinarPage; backend `createMonthlyTrialWithCard(userId,email,cardTokenId)` matches handler call.
- **Placeholder scan:** none; all steps include full code/commands.

## Deferred / contingency (only if MP transparent preapproval is rejected)

If `POST /api/subscription/create-with-card` returns an MP error indicating transparent
preapproval is unsupported on the account, add a fallback: backend returns
`{ initPoint }` (reuse `createMonthlyPreapproval`), and `AssinarPage.handleToken` does
`window.location.href = initPoint` instead of navigating. Implement only if observed in
MP sandbox testing (verification step 2).

## Verification (end-to-end, after all tasks)

1. Backend: `npx jest server/__tests__/createWithCardHandler.test.ts` (PASS) and `npm run build` (`tsc --noEmit`, no new errors).
2. Frontend: `npm run test -- src/components/assinar --run` and `src/pages/__tests__/AssinarPage.test.tsx` (PASS); `npm run build` succeeds.
3. Manual (MP sandbox): landing → CTA → `/assinar?plan=monthly`; create account → card brick → MP test card → expect redirect to `/app/subscription/callback`, status becomes `trial` (R$0 charged). If MP rejects transparent preapproval, apply the contingency above.
4. Manual: switch to Anual → timeline shows immediate charge; card → R$142,80 → premium.
5. Manual: Google button → OAuth → returns to `/assinar?...&step=card` (card step shown).
6. Confirm no landing purchase CTA still points to `/register?plan` (Grep).
