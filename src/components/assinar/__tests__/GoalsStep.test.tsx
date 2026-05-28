import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsStep } from "../GoalsStep";

describe("GoalsStep", () => {
  test("renderiza as 6 opções", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Durma bem/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gerenciar a ansiedade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reduzir o estresse/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Esteja presente e consciente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sinta-se calmo e relaxado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Outra coisa/i })).toBeInTheDocument();
  });

  test("Continuar desabilitado sem seleção", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeDisabled();
  });

  test("toggle: clicar marca, clicar de novo desmarca", () => {
    render(<GoalsStep onContinue={vi.fn()} onSkip={vi.fn()} />);
    const sono = screen.getByRole("button", { name: /Durma bem/i });
    fireEvent.click(sono);
    expect(sono).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(sono);
    expect(sono).toHaveAttribute("aria-pressed", "false");
  });

  test("Continuar habilita com ≥1 seleção e chama onContinue com array", () => {
    const onContinue = vi.fn();
    render(<GoalsStep onContinue={onContinue} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Durma bem/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reduzir o estresse/i }));
    const cont = screen.getByRole("button", { name: /Continuar/i });
    expect(cont).not.toBeDisabled();
    fireEvent.click(cont);
    expect(onContinue).toHaveBeenCalledWith(["sono", "estresse"]);
  });

  test("Pular sempre habilitado e chama onSkip", () => {
    const onSkip = vi.fn();
    render(<GoalsStep onContinue={vi.fn()} onSkip={onSkip} />);
    const pular = screen.getByRole("button", { name: /^Pular$/i });
    expect(pular).not.toBeDisabled();
    fireEvent.click(pular);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
