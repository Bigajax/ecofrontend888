import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AcaoRecomendadaCard from "../AcaoRecomendadaCard";

const navigateMock = vi.fn();
const requestUpgradeMock = vi.fn();
let tierValue = "premium";
let canAccessValue = true;

vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("../../../hooks/usePremiumContent", () => ({
  useSubscriptionTier: () => tierValue,
  usePremiumContent: () => ({ requestUpgrade: requestUpgradeMock }),
}));
vi.mock("../../../constants/meditationTiers", () => ({
  canAccessMeditation: () => canAccessValue,
}));
vi.mock("../../../analytics/track", () => ({ track: vi.fn() }));

beforeEach(() => {
  navigateMock.mockReset();
  requestUpgradeMock.mockReset();
  tierValue = "premium";
  canAccessValue = true;
});

const base = { titulo: "T", descricao: "D", cta: "C" };

describe("AcaoRecomendadaCard", () => {
  it("programa: clique navega para a rota", () => {
    render(<AcaoRecomendadaCard acao={{ id: "aneis", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/app/rings");
  });

  it("meditacao liberada: navega para o player com state", () => {
    render(<AcaoRecomendadaCard acao={{ id: "liberar_estresse", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith(
      "/app/meditation-player",
      expect.objectContaining({ state: expect.objectContaining({ meditation: expect.any(Object) }) }),
    );
  });

  it("meditacao premium para free: abre upgrade, não navega", () => {
    tierValue = "free";
    canAccessValue = false;
    render(<AcaoRecomendadaCard acao={{ id: "liberar_estresse", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(requestUpgradeMock).toHaveBeenCalledWith("acao_liberar_estresse");
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("id legado via tipo continua funcionando", () => {
    render(<AcaoRecomendadaCard acao={{ tipo: "sono", ...base }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/app/meditacoes-sono");
  });

  it("id desconhecido não renderiza", () => {
    const { container } = render(<AcaoRecomendadaCard acao={{ id: "inexistente", ...base }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
