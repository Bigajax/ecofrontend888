import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do mixpanel real (evita init + isola o track).
const track = vi.fn();
vi.mock("../mixpanel", () => ({ default: { track: (...args: unknown[]) => track(...args) } }));

import {
  markCadastroPendente,
  clearCadastroPendente,
  flushCadastroPendenteOnHide,
  flushFunilAbandonadoOnHide,
  marcarSaidaIntencionalDoFunil,
  trackAssinaturaIniciada,
  trackCadastroFalhou,
} from "../mixpanelAssinarFunnel";

const PREFIX = "Funil Sono · ";
const BEACON = { transport: "sendBeacon", send_immediately: true };

beforeEach(() => {
  vi.useFakeTimers();
  clearCadastroPendente();
  // trackAssinaturaIniciada reseta as flags de módulo (saidaIntencional /
  // abandonoOnHideEmitido) — usamos como reset de estado entre testes.
  trackAssinaturaIniciada({ entry_step: "signup", plan: "monthly" });
  track.mockClear();
});

afterEach(() => {
  clearCadastroPendente();
  vi.useRealTimers();
});

describe("watchdog do cadastro (escopo de módulo)", () => {
  it('markCadastroPendente emite "Cadastro sem resposta" (timeout, foi_timeout) após 15s', () => {
    markCadastroPendente("email");
    expect(track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(15_000);
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro sem resposta",
      expect.objectContaining({ method: "email", reason: "timeout", foi_timeout: true }),
      undefined,
    );
  });

  it("clearCadastroPendente impede o disparo", () => {
    markCadastroPendente("email");
    clearCadastroPendente();
    vi.advanceTimersByTime(15_000);
    expect(track).not.toHaveBeenCalled();
  });

  it("dedupe de re-submit: só um pending ativo", () => {
    markCadastroPendente("email");
    markCadastroPendente("email"); // re-submit reinicia
    vi.advanceTimersByTime(15_000);
    expect(track).toHaveBeenCalledTimes(1);
  });
});

describe("flushCadastroPendenteOnHide", () => {
  it("pagehide emite page_hidden com sendBeacon e zera o pending", () => {
    markCadastroPendente("email");
    flushCadastroPendenteOnHide("pagehide");
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro sem resposta",
      expect.objectContaining({ method: "email", reason: "page_hidden" }),
      BEACON,
    );
    track.mockClear();
    // pending zerado → timer não dispara depois
    vi.advanceTimersByTime(15_000);
    expect(track).not.toHaveBeenCalled();
  });

  it("e-mail: flush por visibilidade emite (sem proteção de popup)", () => {
    markCadastroPendente("email");
    flushCadastroPendenteOnHide("visibility");
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro sem resposta",
      expect.objectContaining({ method: "email", reason: "page_hidden" }),
      BEACON,
    );
  });

  it("popup Google: visibilidade dentro de 15s NÃO emite e mantém o pending", () => {
    markCadastroPendente("google");
    flushCadastroPendenteOnHide("visibility");
    expect(track).not.toHaveBeenCalled();
    // pending mantido → o timeout ainda dispara
    vi.advanceTimersByTime(15_000);
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro sem resposta",
      expect.objectContaining({ method: "google", reason: "timeout" }),
      undefined,
    );
  });

  it("popup Google: pagehide emite mesmo dentro de 15s", () => {
    markCadastroPendente("google");
    flushCadastroPendenteOnHide("pagehide");
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro sem resposta",
      expect.objectContaining({ method: "google", reason: "page_hidden" }),
      BEACON,
    );
  });

  it("sem pending: flush é no-op", () => {
    flushCadastroPendenteOnHide("pagehide");
    expect(track).not.toHaveBeenCalled();
  });
});

describe("trackCadastroFalhou", () => {
  it("encaminha status_http, error_message e foi_timeout pro evento", () => {
    trackCadastroFalhou({
      method: "email",
      error_message: "Database error saving new user",
      status_http: 500,
      foi_timeout: false,
    });
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro falhou",
      expect.objectContaining({
        method: "email",
        error_message: "Database error saving new user",
        status_http: 500,
        foi_timeout: false,
      }),
      undefined,
    );
  });

  it("marca foi_timeout quando a falha foi por tempo esgotado", () => {
    trackCadastroFalhou({ method: "email", error_message: "Tempo esgotado", foi_timeout: true });
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Cadastro falhou",
      expect.objectContaining({ foi_timeout: true }),
      undefined,
    );
  });
});

describe("flushFunilAbandonadoOnHide", () => {
  it('emite "Funil abandonado" quando não convertido', () => {
    flushFunilAbandonadoOnHide("card", false);
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Funil abandonado",
      expect.objectContaining({ step: "card", destino: "page_hidden" }),
      BEACON,
    );
  });

  it("não emite quando convertido", () => {
    flushFunilAbandonadoOnHide("card", true);
    expect(track).not.toHaveBeenCalled();
  });

  it("não emite após saída intencional (logo / OAuth redirect)", () => {
    marcarSaidaIntencionalDoFunil();
    flushFunilAbandonadoOnHide("card", false);
    expect(track).not.toHaveBeenCalled();
  });

  it("dedupe: segunda chamada não duplica", () => {
    flushFunilAbandonadoOnHide("card", false);
    track.mockClear();
    flushFunilAbandonadoOnHide("card", false);
    expect(track).not.toHaveBeenCalled();
  });

  it("trackAssinaturaIniciada reseta flags: re-entrada reabilita o abandono", () => {
    marcarSaidaIntencionalDoFunil();
    trackAssinaturaIniciada({ entry_step: "goals", plan: "monthly" });
    track.mockClear();
    flushFunilAbandonadoOnHide("goals", false);
    expect(track).toHaveBeenCalledWith(
      PREFIX + "Funil abandonado",
      expect.objectContaining({ step: "goals", destino: "page_hidden" }),
      BEACON,
    );
  });
});
