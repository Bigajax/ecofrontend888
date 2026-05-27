import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, register: vi.fn(), signInWithGoogle: vi.fn() }),
}));
vi.mock("@mercadopago/sdk-react", () => ({ initMercadoPago: vi.fn(), CardPayment: () => <div>brick</div> }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock("@/config/apiBase", () => ({ apiUrl: (p: string) => p }));

import AssinarPage from "../AssinarPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AssinarPage />
    </MemoryRouter>
  );
}

describe("AssinarPage", () => {
  it("defaults to monthly and shows the $0-today timeline + signup step when logged out", () => {
    renderAt("/assinar");
    expect(screen.getAllByText(/R\$ 0/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeInTheDocument();
  });

  it("reads ?plan=annual and shows the annual timeline", () => {
    renderAt("/assinar?plan=annual");
    expect(screen.getAllByText(/R\$ 142,80/).length).toBeGreaterThan(0);
  });
});
