import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidationStep } from "../ValidationStep";

describe("ValidationStep", () => {
  test("renderiza headline e subtitle", () => {
    render(<ValidationStep onContinue={vi.fn()} />);
    expect(screen.getByText(/Você está no lugar certo/i)).toBeInTheDocument();
    expect(screen.getByText(/aumenta a felicidade/i)).toBeInTheDocument();
  });

  test("renderiza os 4 cards de validação", () => {
    render(<ValidationStep onContinue={vi.fn()} />);
    expect(screen.getByText(/Reduza o estresse com o apoio diário do ECO/i)).toBeInTheDocument();
    expect(screen.getByText(/Controle a ansiedade/i)).toBeInTheDocument();
    expect(screen.getByText(/Durma melhor com podcasts/i)).toBeInTheDocument();
    expect(screen.getByText(/Esteja mais presente/i)).toBeInTheDocument();
  });

  test("CTA primário chama onContinue", () => {
    const onContinue = vi.fn();
    render(<ValidationStep onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /Experimente por \$0/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test("Voltar só aparece se onBack for passado", () => {
    const { rerender } = render(<ValidationStep onContinue={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^Voltar$/i })).toBeNull();
    rerender(<ValidationStep onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Voltar$/i })).toBeInTheDocument();
  });

  test("Voltar chama onBack", () => {
    const onBack = vi.fn();
    render(<ValidationStep onContinue={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /^Voltar$/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
