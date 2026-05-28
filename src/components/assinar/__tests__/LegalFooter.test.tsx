import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegalFooter } from "../LegalFooter";

describe("LegalFooter", () => {
  test("renderiza copyright", () => {
    render(<LegalFooter />);
    expect(screen.getByText(/© 2026 Ecotopia Inc\./i)).toBeInTheDocument();
  });

  test("renderiza os 6 links legais", () => {
    render(<LegalFooter />);
    expect(screen.getByRole("link", { name: /Termos e condições/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de cookies/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Aviso de Privacidade da Califórnia/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de Privacidade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Suas opções de privacidade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dados de saúde do consumidor/i })).toBeInTheDocument();
  });

  test("todos os links têm atributo href", () => {
    render(<LegalFooter />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    links.forEach((a) => expect(a).toHaveAttribute("href"));
  });
});
