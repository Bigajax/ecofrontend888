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
    render(<SonoInlineSignup onCreated={vi.fn()} {...defaultProps} />);
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
    render(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
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
    render(<SonoInlineSignup onCreated={onCreated} {...defaultProps} />);
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
});
