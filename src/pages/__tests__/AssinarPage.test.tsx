import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, test, expect, vi, beforeEach } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
const { authState } = vi.hoisted(() => ({
  authState: { user: null as null | { id: string } },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: false, register: vi.fn(), signInWithGoogle: vi.fn() }),
}));
vi.mock("@mercadopago/sdk-react", () => ({ initMercadoPago: vi.fn(), CardPayment: () => <div>brick</div> }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
vi.mock("@/config/apiBase", () => ({ apiUrl: (p: string) => p }));
vi.mock("@/api/onboardingObjetivos", () => ({
  saveObjetivos: vi.fn().mockResolvedValue({ id: "uuid-1" }),
  linkUserToObjetivos: vi.fn().mockResolvedValue(true),
}));

import AssinarPage from "../AssinarPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AssinarPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  authState.user = null;
});

// ── Existing tests (updated to use ?step=plan explicitly, intent unchanged) ──

describe("AssinarPage", () => {
  it("starts on the plan step (monthly) with the $0-today timeline and trial CTA", () => {
    renderAt("/assinar?step=plan");
    expect(screen.getAllByText(/R\$ 0/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /comece seu teste gratuito/i })).toBeInTheDocument();
  });

  it("reads ?plan=annual and shows the annual timeline + annual CTA", () => {
    renderAt("/assinar?plan=annual&step=plan");
    expect(screen.getAllByText(/R\$ 142,80/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /comece seu teste gratuito/i })).toBeInTheDocument();
  });

  it("advances to the signup step when the trial CTA is clicked (logged out)", () => {
    renderAt("/assinar?step=plan");
    fireEvent.click(screen.getByRole("button", { name: /comece seu teste gratuito/i }));
    expect(screen.getByText(/Falta pouco pra sua primeira noite/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar com google/i })).toBeInTheDocument();
  });

  // Regressão: ao concluir o signup o userId muda e o RootProviders remonta a árvore,
  // resetando o step pra ?step=signup. Se o usuário já está autenticado, a página deve
  // pular o formulário e ir direto pro cartão (e não voltar pro form vazio).
  it("skips the signup form straight to the card step when already authenticated", async () => {
    authState.user = { id: "user-123" };
    renderAt("/assinar?step=signup");
    await waitFor(() => {
      expect(screen.getByText(/Confirme seu teste gratuito/i)).toBeInTheDocument();
    });
  });
});

// ── New tests: goals/validation/footer integration ──

describe("AssinarPage onboarding flow", () => {
  test("default abre em 'goals' (sem ?step na URL)", () => {
    renderAt("/assinar?plan=monthly");
    expect(screen.getByText(/Quais são os objetivos/i)).toBeInTheDocument();
  });

  test("?step=card mantém shortcut do OAuth return", async () => {
    renderAt("/assinar?plan=monthly&step=card");
    await waitFor(() => {
      expect(screen.getByText(/Confirme seu teste gratuito/i)).toBeInTheDocument();
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

  test("goals.Pular → plan (pula a tela de validação)", async () => {
    renderAt("/assinar?plan=monthly");
    fireEvent.click(screen.getByRole("button", { name: /^Pular$/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Comece seu teste gratuito/i })).toBeInTheDocument();
    });
  });

  test("validation.Experimente → plan", async () => {
    renderAt("/assinar?plan=monthly&step=validation");
    fireEvent.click(screen.getByRole("button", { name: /Experimente por \$0/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Comece seu teste gratuito/i })).toBeInTheDocument();
    });
  });

  test("validation.Voltar → goals", async () => {
    renderAt("/assinar?plan=monthly&step=validation");
    fireEvent.click(screen.getByRole("button", { name: /^Voltar$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Quais são os objetivos/i)).toBeInTheDocument();
    });
  });

  test("LegalFooter aparece em todas as etapas", () => {
    renderAt("/assinar?plan=monthly");
    expect(screen.getByText(/© 2026 Ecotopia Inc\./i)).toBeInTheDocument();
  });

  test("Continuar avança para validation sem esperar o POST resolver", async () => {
    const { saveObjetivos } = await import("@/api/onboardingObjetivos");
    let resolveSave: (value: { id: string } | null) => void = () => {};
    const deferred = new Promise<{ id: string } | null>((resolve) => { resolveSave = resolve; });
    (saveObjetivos as ReturnType<typeof vi.fn>).mockReturnValueOnce(deferred);

    renderAt("/assinar?plan=monthly");
    fireEvent.click(screen.getByRole("button", { name: /Durma bem/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));

    // Step deve ter avançado para validation imediatamente, sem aguardar o POST
    await waitFor(() => {
      expect(screen.getByText(/Você está no lugar certo/i)).toBeInTheDocument();
    });

    // Só agora resolvemos o POST (background)
    resolveSave({ id: "uuid-late" });
  });
});
