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

  test("Continuar chama onContinue", () => {
    const onContinue = vi.fn();
    render(<ValidationStep onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
