import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRef, type ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import type { GoogleSignInButtonStatus } from "@/hooks/useGoogleOneTap";

const register = vi.fn();
const signIn = vi.fn();
const signInWithGoogle = vi.fn();
const signInWithGoogleIdToken = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ register, signIn, signInWithGoogle, signInWithGoogleIdToken }),
}));

// O componente usa <Link>, então todo render precisa de um Router.
const renderInRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// Sem script GSI no jsdom — controla o status do botão oficial do Google.
let googleBtnStatus: GoogleSignInButtonStatus = "failed";
vi.mock("@/hooks/useGoogleOneTap", () => ({
  useGoogleSignInButton: () => ({
    containerRef: createRef<HTMLDivElement>(),
    status: googleBtnStatus,
    ready: googleBtnStatus === "ready",
  }),
}));

// CAPI/Pixel não tem efeito em teste.
vi.mock("@/lib/fbpixel", () => ({ trackWithCAPI: vi.fn() }));

import { SonoInlineSignup } from "../SonoInlineSignup";

const defaultProps = {
  returnTo: "/sono/experiencia?play=night1",
};

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signIn.mockReset().mockResolvedValue(undefined);
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
  signInWithGoogleIdToken.mockReset().mockResolvedValue(undefined);
  googleBtnStatus = "failed";
});

const emailField = () => screen.getByLabelText(/endereço de email/i) as HTMLInputElement;
const senhaField = () => screen.getByLabelText(/crie uma senha/i) as HTMLInputElement;
const submitBtn = () =>
  screen.getByRole("button", { name: /criar conta e continuar/i });

describe("SonoInlineSignup", () => {
  it("blocks submit with invalid email or short password", () => {
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "nope" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());
    expect(register).not.toHaveBeenCalled();

    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "123" } });
    fireEvent.click(submitBtn());
    expect(register).not.toHaveBeenCalled();
  });

  it("trims whitespace before validating the email (mobile autofill)", async () => {
    const onCreated = vi.fn();
    renderInRouter(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "  ana@x.com  " } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith(
      "ana@x.com",
      "12345678",
      "ana",
      "",
      expect.stringContaining("/sono/experiencia?play=night1"),
    );
  });

  // Webview do FB/IG (tráfego pago): autofill preenche o DOM sem disparar o
  // onChange do React → o e-mail visível e válido era rejeitado ("validacao:
  // email"). O submit precisa ler o value real do <input>.
  it("registers when the browser autofills inputs without firing onChange", async () => {
    const onCreated = vi.fn();
    renderInRouter(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
    emailField().value = "ana@x.com";
    senhaField().value = "12345678";
    fireEvent.click(submitBtn());
    await waitFor(() => expect(register).toHaveBeenCalled());
    expect(register).toHaveBeenCalledWith(
      "ana@x.com",
      "12345678",
      "ana",
      "",
      expect.stringContaining("/sono/experiencia?play=night1"),
    );
  });

  // Usuario que ja tem conta e volta pelo anuncio: o cadastro falha com "ja
  // registrado" e tentamos logar com as credenciais digitadas. Se a senha
  // confere, segue o fluxo sem o usuario perceber.
  it("loga automaticamente quando o e-mail ja tem conta e a senha confere", async () => {
    register.mockRejectedValueOnce(new Error("User already registered"));
    signIn.mockResolvedValueOnce(undefined);
    const onCreated = vi.fn();
    renderInRouter(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(signIn).toHaveBeenCalledWith("ana@x.com", "12345678");
  });

  // Se a senha nao confere, oferecemos o link "Entrar" preservando o returnTo.
  it('oferece "Entrar na minha conta" quando o e-mail ja tem conta mas a senha nao confere', async () => {
    register.mockRejectedValueOnce(new Error("User already registered"));
    signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "senhaerrada" } });
    fireEvent.click(submitBtn());
    const link = await screen.findByRole("link", { name: /entrar na minha conta/i });
    expect(link.getAttribute("href")).toContain("/login?returnTo=");
  });
});
