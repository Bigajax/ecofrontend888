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
  useAuth: () => ({
    user: authState.user,
    loading: false,
    register: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithGoogleIdToken: vi.fn(),
  }),
}));
const { subscriptionState } = vi.hoisted(() => ({
  subscriptionState: { isPremium: false },
}));
vi.mock("@/api/subscription", () => ({
  getSubscriptionStatus: vi.fn(async () => ({ isPremium: subscriptionState.isPremium })),
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
  subscriptionState.isPremium = false;
  navigate.mockClear();
});

// ── Existing tests (updated to use ?step=plan explicitly, intent unchanged) ──

describe("AssinarPage", () => {
  // Duas telas (set/2026): ?step=plan é só passagem. Visitante vai para a conta;
  // logado vai para plano + cartão.
  it("?step=plan leva o visitante direto para a conta", async () => {
    renderAt("/assinar?step=plan");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /crie a sua conta/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/nada é cobrado hoje/i).length).toBeGreaterThan(0);
  });

  it("?plan=annual chega ao cartão com o anual marcado e o valor do ano", async () => {
    authState.user = { id: "user-123" };
    renderAt("/assinar?plan=annual&step=plan");
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /anual/i })).toHaveAttribute("aria-checked", "true");
    });
    expect(screen.getAllByText(/R\$ 142,80/).length).toBeGreaterThan(0);
  });

  it("no cartão, dá para trocar o plano sem sair da tela", async () => {
    authState.user = { id: "user-123" };
    renderAt("/assinar?plan=monthly&step=card");
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /mensal/i })).toHaveAttribute("aria-checked", "true");
    });
    fireEvent.click(screen.getByRole("radio", { name: /anual/i }));
    expect(screen.getByRole("radio", { name: /anual/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("brick")).toBeInTheDocument();
  });

  // Regressão: ao concluir o signup o userId muda e o RootProviders remonta a árvore,
  // resetando o step pra ?step=signup. Se o usuário já está autenticado, a página deve
  // pular o formulário e ir direto pro cartão (e não voltar pro form vazio).
  it("skips the signup form straight to the card step when already authenticated", async () => {
    authState.user = { id: "user-123" };
    renderAt("/assinar?step=signup");
    await waitFor(() => {
      expect(screen.getByText(/abra todas as portas/i)).toBeInTheDocument();
    });
  });

  // Quem já é assinante não deve recolocar cartão: pós-login no step de cadastro,
  // o status real de assinatura decide — premium vai pro app.
  it("routes premium accounts to /app instead of the card step", async () => {
    authState.user = { id: "user-premium" };
    subscriptionState.isPremium = true;
    renderAt("/assinar?step=signup");
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/app", { replace: true });
    });
    expect(screen.queryByText(/abra todas as portas/i)).not.toBeInTheDocument();
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
      expect(screen.getByText(/abra todas as portas/i)).toBeInTheDocument();
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

  test("goals.Pular → conta (pula a tela de validação)", async () => {
    renderAt("/assinar?plan=monthly");
    fireEvent.click(screen.getByRole("button", { name: /^Pular$/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /crie a sua conta/i })).toBeInTheDocument();
    });
  });

  test("validation.Experimente → conta", async () => {
    renderAt("/assinar?plan=monthly&step=validation");
    fireEvent.click(screen.getByRole("button", { name: /Experimente por \$0/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /crie a sua conta/i })).toBeInTheDocument();
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

describe("AssinarPage · visual do reino", () => {
  it("logado entrando pelo plano vai direto para plano + cartão", async () => {
    authState.user = { id: "user-123" };
    renderAt("/assinar?step=plan&from=upgrade_modal");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /abra todas as portas/i })).toBeInTheDocument();
    });
    expect(screen.getByText("brick")).toBeInTheDocument();
  });

  it("visitante vindo de uma landing vê a conta, e o voltar leva à landing", async () => {
    renderAt("/assinar?step=plan&from=eco_ia_hero");
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /crie a sua conta/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^voltar$/i }));
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
