import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Spies estáveis (vi.hoisted) pra sobreviver ao vi.resetModules entre casos —
// o hook tem um guard de módulo (headlineTracked) que precisa resetar a cada teste.
const { trackHeadlineExibida, registerSonoHeroVariant } = vi.hoisted(() => ({
  trackHeadlineExibida: vi.fn(),
  registerSonoHeroVariant: vi.fn(),
}));

vi.mock("@/lib/mixpanelAssinarFunnel", () => ({
  trackHeadlineExibida,
  registerSonoHeroVariant,
}));

const STORAGE_KEY = "eco.sono.hero_variant";

async function loadHook() {
  const mod = await import("@/hooks/useSonoHeroVariant");
  return mod.useSonoHeroVariant;
}

beforeEach(() => {
  vi.resetModules(); // reseta o guard headlineTracked
  trackHeadlineExibida.mockClear();
  registerSonoHeroVariant.mockClear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/sono");
});

describe("useSonoHeroVariant", () => {
  it("sem utm e storage vazio → durma_rapido (default) + tracking", async () => {
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("durma_rapido");
    expect(result.current.cta).toBe("Começar meus 7 dias grátis");
    expect(result.current.microcopyPrefix).toBe("Sem cobrança hoje · ");
    expect(registerSonoHeroVariant).toHaveBeenCalledWith("durma_rapido");
    expect(trackHeadlineExibida).toHaveBeenCalledWith({ variant: "durma_rapido" });
  });

  it("?utm_term=mente_nao_desliga → variante + persiste no sessionStorage", async () => {
    window.history.replaceState({}, "", "/sono?utm_term=mente_nao_desliga");
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("mente_nao_desliga");
    expect(result.current.cta).toBe("Iniciar a noite 1 · grátis");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("mente_nao_desliga");
    expect(registerSonoHeroVariant).toHaveBeenCalledWith("mente_nao_desliga");
  });

  it("utm_term não mapeado → default", async () => {
    window.history.replaceState({}, "", "/sono?utm_term=xpto_desconhecido");
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("durma_rapido");
  });

  it("?hero=mente_nao_desliga → variante + persiste no sessionStorage", async () => {
    window.history.replaceState({}, "", "/sono?hero=mente_nao_desliga");
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("mente_nao_desliga");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("mente_nao_desliga");
    expect(registerSonoHeroVariant).toHaveBeenCalledWith("mente_nao_desliga");
  });

  it("utm_term numérico do FB (ID do adset) → default, mas ?hero= sobrepõe", async () => {
    // Reproduz o bug real: o template de UTM do FB põe o ID do adset no utm_term.
    window.history.replaceState({}, "", "/sono?utm_term=120242534788860358");
    let useSonoHeroVariant = await loadHook();
    let { result } = renderHook(() => useSonoHeroVariant());
    expect(result.current.variant).toBe("durma_rapido");

    // Com o param dedicado, a variante entra mesmo com o utm_term numérico junto.
    vi.resetModules();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/sono?utm_term=120242534788860358&hero=mente_nao_desliga");
    useSonoHeroVariant = await loadHook();
    ({ result } = renderHook(() => useSonoHeroVariant()));
    expect(result.current.variant).toBe("mente_nao_desliga");
  });

  it("storage da chegada mantém a variante quando a URL não tem utm", async () => {
    sessionStorage.setItem(STORAGE_KEY, "mente_nao_desliga");
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("mente_nao_desliga");
  });

  it("utm explícito sobrescreve o storage existente", async () => {
    sessionStorage.setItem(STORAGE_KEY, "durma_rapido");
    window.history.replaceState({}, "", "/sono?utm_term=mente_nao_desliga");
    const useSonoHeroVariant = await loadHook();
    const { result } = renderHook(() => useSonoHeroVariant());

    expect(result.current.variant).toBe("mente_nao_desliga");
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe("mente_nao_desliga");
  });
});
