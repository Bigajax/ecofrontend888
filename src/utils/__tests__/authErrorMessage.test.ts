import { describe, it, expect } from "vitest";
import { translateAuthError } from "../authErrorMessage";

describe("translateAuthError", () => {
  it("traduz e-mail já registrado (cadastro)", () => {
    expect(translateAuthError(new Error("User already registered"))).toBe(
      "Este e-mail já tem uma conta. Tente entrar.",
    );
    expect(translateAuthError({ code: "user_already_exists" })).toBe(
      "Este e-mail já tem uma conta. Tente entrar.",
    );
  });

  it("traduz credenciais inválidas (login)", () => {
    expect(translateAuthError(new Error("Invalid login credentials"))).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("traduz e-mail inválido", () => {
    expect(
      translateAuthError(new Error("Unable to validate email address: invalid format")),
    ).toBe("E-mail inválido.");
  });

  it("traduz rate limit", () => {
    expect(translateAuthError(new Error("email rate limit exceeded"))).toBe(
      "Muitas tentativas. Tente novamente em alguns minutos.",
    );
  });

  it("traduz senha fraca", () => {
    expect(
      translateAuthError(new Error("Password should be at least 6 characters")),
    ).toBe("A senha precisa ter ao menos 8 caracteres.");
  });

  it("traduz falha de rede", () => {
    expect(translateAuthError(new TypeError("Failed to fetch"))).toBe(
      "Falha de rede. Verifique sua conexão e tente novamente.",
    );
  });

  it("usa fallback por contexto quando não reconhece o erro", () => {
    expect(translateAuthError(new Error("boom xyz"), "signup")).toBe(
      "Não foi possível criar a conta. Tente novamente.",
    );
    expect(translateAuthError(new Error("boom xyz"), "login")).toBe(
      "Não foi possível entrar. Tente novamente.",
    );
    expect(translateAuthError(null)).toBe("Não foi possível entrar. Tente novamente.");
  });
});
