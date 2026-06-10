import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegalFooter } from "../LegalFooter";

function renderFooter() {
  return render(
    <MemoryRouter>
      <LegalFooter />
    </MemoryRouter>,
  );
}

describe("LegalFooter", () => {
  test("renderiza copyright", () => {
    renderFooter();
    expect(screen.getByText(/© 2026 Ecotopia Inc\./i)).toBeInTheDocument();
  });

  test("renderiza os 4 links legais", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /Termos e condições/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de cookies/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Política de Privacidade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cancele a qualquer momento/i })).toBeInTheDocument();
  });

  test("não exibe links legais dos EUA (Califórnia, dados de saúde, opções)", () => {
    renderFooter();
    expect(screen.queryByText(/Califórnia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dados de saúde/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/opções de privacidade/i)).not.toBeInTheDocument();
  });

  test("todos os links têm atributo href", () => {
    renderFooter();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    links.forEach((a) => expect(a).toHaveAttribute("href"));
  });
});
