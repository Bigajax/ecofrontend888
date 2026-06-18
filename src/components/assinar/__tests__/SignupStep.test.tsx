import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRef } from "react";
import type { GoogleSignInButtonStatus } from "@/hooks/useGoogleOneTap";

const register = vi.fn();
const signInWithGoogle = vi.fn();
const signInWithGoogleIdToken = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ register, signInWithGoogle, signInWithGoogleIdToken }),
}));

// Controla o status do botão oficial do Google sem depender do script GSI
// (ausente no jsdom). Default 'failed' = fallback por redirect renderizado.
let googleBtnStatus: GoogleSignInButtonStatus = "failed";
vi.mock("@/hooks/useGoogleOneTap", () => ({
  useGoogleSignInButton: () => ({
    containerRef: createRef<HTMLDivElement>(),
    status: googleBtnStatus,
    ready: googleBtnStatus === "ready",
  }),
}));

import { SignupStep } from "../SignupStep";

const defaultProps = {
  funnelReturnTo: "/assinar?plan=monthly&step=card",
  loginReturnTo: "/login?returnTo=%2Fassinar%3Fplan%3Dmonthly%26step%3Dcard",
};

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
  googleBtnStatus = "failed";
});

describe("SignupStep", () => {
  it("shows Google as the first interactive option and only email+password fields", () => {
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent(/continuar com google/i);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha \(8/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/primeiro nome/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sobrenome/i)).not.toBeInTheDocument();
    // Único checkbox é a newsletter, opcional e desmarcada.
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it("blocks submit with invalid email or short password", () => {
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "nope" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    expect(register).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    expect(register).not.toHaveBeenCalled();
  });

  it("trims whitespace before validating the email (mobile autofill)", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "  ana@x.com  " } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith(
      "ana@x.com",
      "12345678",
      "ana",
      "",
      expect.stringContaining("/assinar?plan=monthly&step=card"),
    );
  });

  // Webview do FB/IG (tráfego pago): autofill/gerenciador de senha preenche o
  // DOM SEM disparar o onChange do React → o state controlado fica vazio e a
  // validação rejeitava um e-mail visível e válido ("validacao: email"). O
  // submit precisa ler o valor real do <input>, não só o state.
  it("registers when the browser autofills inputs without firing onChange", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} {...defaultProps} />);
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const senhaInput = screen.getByLabelText(/senha \(8/i) as HTMLInputElement;
    // Autofill nativo: muda o value do DOM sem evento React.
    emailInput.value = "ana@x.com";
    senhaInput.value = "12345678";
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith(
      "ana@x.com",
      "12345678",
      "ana",
      "",
      expect.stringContaining("/assinar?plan=monthly&step=card"),
    );
  });

  it("registers without terms checkbox, deriving the name from the email", async () => {
    const onCreated = vi.fn();
    render(<SignupStep onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@x.com" } });
    fireEvent.change(screen.getByLabelText(/senha \(8/i), { target: { value: "12345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^continuar$/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    // 5º arg: emailRedirectTo de volta pro funil (se a confirmação de e-mail
    // estiver ligada no Supabase, o link devolve direto ao step do cartão).
    expect(register).toHaveBeenCalledWith(
      "ana@x.com",
      "12345678",
      "ana",
      "",
      expect.stringContaining("/assinar?plan=monthly&step=card"),
    );
  });

  // status 'failed' (GSI bloqueado/ausente): o botão é o fallback por redirect —
  // que precisa voltar pro funil, não pro /app (senão o bug original volta no iOS).
  it("on Google failure, the redirect fallback returns to the funnel", () => {
    googleBtnStatus = "failed";
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /google/i }));
    expect(signInWithGoogle).toHaveBeenCalledWith("/assinar?plan=monthly&step=card");
  });

  // status 'loading' (GSI ainda carregando): mostra placeholder, NUNCA o redirect
  // — senão a página navegaria pra fora por puro timing.
  it("while Google is loading, shows a placeholder and no redirect button", () => {
    googleBtnStatus = "loading";
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });

  // status 'ready': popup oficial do GIS disponível, sem botão de redirect.
  it("when Google is ready, does not render the redirect fallback", () => {
    googleBtnStatus = "ready";
    render(<SignupStep onCreated={vi.fn()} {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();
  });
});
