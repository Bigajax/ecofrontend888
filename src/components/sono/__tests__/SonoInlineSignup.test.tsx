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

// Sem script GSI no jsdom — controla o status do botão oficial do Google e
// captura as opções (onSuccess/onClick) para simular o popup.
let googleBtnStatus: GoogleSignInButtonStatus = "failed";
let googleOptions: any = null;
vi.mock("@/hooks/useGoogleOneTap", () => ({
  useGoogleSignInButton: (opts: any) => {
    googleOptions = opts;
    return {
      containerRef: createRef<HTMLDivElement>(),
      status: googleBtnStatus,
      ready: googleBtnStatus === "ready",
    };
  },
}));

// CAPI/Pixel não tem efeito em teste.
vi.mock("@/lib/fbpixel", () => ({ trackWithCAPI: vi.fn() }));

// Telemetria do funil — espionada para asseverar QUAL evento o componente
// dispara (validação vs falha real). Todos os exports usados viram vi.fn().
vi.mock("@/lib/mixpanelAssinarFunnel", () => ({
  trackCadastroVisto: vi.fn(),
  trackCadastroEnviado: vi.fn(),
  trackCadastroConcluido: vi.fn(),
  trackCadastroFalhou: vi.fn(),
  trackCadastroValidacao: vi.fn(),
  trackGoogleIndisponivel: vi.fn(),
  markCadastroPendente: vi.fn(),
  clearCadastroPendente: vi.fn(),
  marcarSaidaIntencionalDoFunil: vi.fn(),
}));

// Captura de lead (backend) e detecção de webview — mockadas para asserção.
vi.mock("@/api/leadCapture", () => ({
  captureLead: vi.fn().mockResolvedValue(undefined),
  replayPendingLeads: vi.fn(),
}));
vi.mock("@/utils/isInAppBrowser", () => ({ isInAppBrowser: vi.fn(() => false) }));

import { SonoInlineSignup } from "../SonoInlineSignup";
import { captureLead } from "@/api/leadCapture";
import { trackWithCAPI } from "@/lib/fbpixel";
import { isInAppBrowser } from "@/utils/isInAppBrowser";
import {
  trackCadastroFalhou,
  trackCadastroValidacao,
  trackGoogleIndisponivel,
} from "@/lib/mixpanelAssinarFunnel";

const defaultProps = {
  returnTo: "/sono/experiencia?play=night1",
};

beforeEach(() => {
  register.mockReset().mockResolvedValue({ needsConfirmation: false });
  signIn.mockReset().mockResolvedValue(undefined);
  signInWithGoogle.mockReset().mockResolvedValue(undefined);
  signInWithGoogleIdToken.mockReset().mockResolvedValue(undefined);
  googleBtnStatus = "failed";
  googleOptions = null;
  vi.mocked(captureLead).mockReset().mockResolvedValue(undefined);
  vi.mocked(trackWithCAPI).mockReset();
  vi.mocked(isInAppBrowser).mockReset().mockReturnValue(false);
  vi.mocked(trackCadastroFalhou).mockReset();
  vi.mocked(trackCadastroValidacao).mockReset();
  vi.mocked(trackGoogleIndisponivel).mockReset();
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

// A métrica "Cadastro falhou" só pode contar tentativa REAL de cadastro
// (register, ou Google após clique). Validação de campo e erro de render do
// botão Google inflavam o número sem nunca ter chamado o backend.
describe("SonoInlineSignup · telemetria de falha não mente", () => {
  it("e-mail inválido emite 'validação rejeitada', NÃO 'Cadastro falhou'", () => {
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "nope" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());

    expect(vi.mocked(trackCadastroValidacao)).toHaveBeenCalledWith(
      expect.objectContaining({ method: "email", motivo: "email" }),
    );
    expect(vi.mocked(trackCadastroFalhou)).not.toHaveBeenCalled();
  });

  it("senha curta emite 'validação rejeitada' (motivo senha_curta), NÃO 'Cadastro falhou'", () => {
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "123" } });
    fireEvent.click(submitBtn());

    expect(vi.mocked(trackCadastroValidacao)).toHaveBeenCalledWith(
      expect.objectContaining({ method: "email", motivo: "senha_curta" }),
    );
    expect(vi.mocked(trackCadastroFalhou)).not.toHaveBeenCalled();
  });

  it("erro do botão Google SEM clique emite 'Google indisponível', NÃO 'Cadastro falhou'", () => {
    googleBtnStatus = "ready";
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    // GIS dispara onError na render/init, sem o usuário ter clicado.
    googleOptions.onError(new Error("render failed"));

    expect(vi.mocked(trackGoogleIndisponivel)).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: "render failed" }),
    );
    expect(vi.mocked(trackCadastroFalhou)).not.toHaveBeenCalled();
  });

  it("erro do Google APÓS o clique conta como 'Cadastro falhou' (tentativa real)", () => {
    googleBtnStatus = "ready";
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    googleOptions.onClick(); // usuário clicou e escolheu a conta
    googleOptions.onError(new Error("token rejected"));

    expect(vi.mocked(trackCadastroFalhou)).toHaveBeenCalledWith(
      expect.objectContaining({ method: "google", error_message: "token rejected" }),
    );
    expect(vi.mocked(trackGoogleIndisponivel)).not.toHaveBeenCalled();
  });
});

describe("SonoInlineSignup · lead + resiliência", () => {
  it("salva o lead e dispara Pixel Lead no submit por e-mail, ANTES do register", async () => {
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());

    await waitFor(() => expect(vi.mocked(captureLead)).toHaveBeenCalled());
    expect(vi.mocked(captureLead)).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@x.com", source: "sono_signup_gate", provider: "email" }),
    );
    expect(vi.mocked(trackWithCAPI)).toHaveBeenCalledWith("Lead", expect.anything());
    // lead salvo antes de provisionar a conta
    expect(vi.mocked(captureLead).mock.invocationCallOrder[0]).toBeLessThan(
      register.mock.invocationCallOrder[0],
    );
  });

  it("salva o lead mesmo quando o cadastro falha", async () => {
    register.mockRejectedValueOnce(new Error("boom"));
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());
    await waitFor(() => expect(vi.mocked(captureLead)).toHaveBeenCalled());
  });

  it("mostra o botão 'Tentar de novo' quando o cadastro estoura por timeout", async () => {
    register.mockRejectedValueOnce(
      Object.assign(new Error("Tempo esgotado ao criar a conta."), { isTimeout: true }),
    );
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());
    const retry = await screen.findByRole("button", { name: /tentar de novo/i });
    expect(retry).toBeTruthy();
  });

  it("em webview (FB/IG) não oferece o botão do Google", () => {
    vi.mocked(isInAppBrowser).mockReturnValue(true);
    googleBtnStatus = "failed";
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /continuar com google/i })).toBeNull();
  });

  it("salva o lead e dispara Pixel Lead no sucesso do Google (popup)", async () => {
    googleBtnStatus = "ready";
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    // JWT fake com e-mail no payload.
    const b64url = (o: Record<string, unknown>) =>
      btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const idToken = `h.${b64url({ email: "ana@gmail.com" })}.s`;

    await googleOptions.onSuccess(idToken);

    expect(vi.mocked(captureLead)).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@gmail.com", provider: "google" }),
    );
    expect(vi.mocked(trackWithCAPI)).toHaveBeenCalledWith("Lead", expect.anything());
    expect(signInWithGoogleIdToken).toHaveBeenCalledWith(idToken);
  });
});

// Anti-rajada: a causa real do ~70% de "Cadastro falhou" no tráfego pago era o
// `fireLead` (fetch sem timeout) pendurar ANTES do botão desabilitar, deixando o
// usuário martelar o botão → N× register → "already registered"/rate-limit.
describe("SonoInlineSignup · anti-rajada (double-submit)", () => {
  it("trava o botão no 1º clique, ANTES de aguardar o lead", async () => {
    let resolveLead!: () => void;
    vi.mocked(captureLead).mockImplementationOnce(
      () => new Promise<void>((res) => { resolveLead = () => res(); }),
    );
    renderInRouter(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });
    fireEvent.click(submitBtn());

    // setLoading(true) roda antes do await fireLead → botão já desabilitado e o
    // register ainda não foi chamado (preso na captura do lead).
    const btn = screen.getByRole("button", { name: /criando sua conta/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(register).not.toHaveBeenCalled();

    resolveLead();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
  });

  it("ignora marteladas enquanto o cadastro está em andamento (1 só register)", async () => {
    let resolveRegister!: (v: { needsConfirmation: boolean }) => void;
    register.mockReset().mockImplementation(
      () => new Promise((res) => { resolveRegister = res; }),
    );
    const onCreated = vi.fn();
    renderInRouter(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
    fireEvent.change(emailField(), { target: { value: "ana@x.com" } });
    fireEvent.change(senhaField(), { target: { value: "12345678" } });

    const btn = submitBtn();
    fireEvent.click(btn);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    // marteladas extras enquanto pendura no register não disparam novo cadastro
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(register).toHaveBeenCalledTimes(1);

    resolveRegister({ needsConfirmation: false });
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });
});
