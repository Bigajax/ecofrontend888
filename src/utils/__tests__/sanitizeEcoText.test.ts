import { describe, expect, it } from "vitest";

import { sanitizeEcoText } from "../sanitizeEcoText";

describe("sanitizeEcoText", () => {
  it("removes stage directions at the start and preserves JSON", () => {
    const input = `reflete suavemente: Excelente percepção, Rafael. (pausa breve)
Quando olhamos... [observa]
{ "emocao_principal": "alegria", "outro": true }`;

    const result = sanitizeEcoText(input);

    expect(result).toBe(`Excelente percepção, Rafael.\nQuando olhamos...\n{ "emocao_principal": "alegria", "outro": true }`);
  });

  it("removes inline stage directions and collapses spaces", () => {
    const input = "Ela sorri e, em silêncio, continua a resposta.";

    expect(sanitizeEcoText(input)).toBe("Ela e, continua a resposta.");
  });

  it("removes parenthetical notes", () => {
    const input = "Aqui vou dizer algo (pausa breve) muito importante [silêncio].";

    expect(sanitizeEcoText(input)).toBe("Aqui vou dizer algo muito importante.");
  });

  it("keeps text untouched when there are no stage directions", () => {
    const input = "Olá, tudo bem?";

    expect(sanitizeEcoText(input)).toBe("Olá, tudo bem?");
  });

  it("handles mixed casing and accents", () => {
    const input = "Pausa breve - em tom calmo, reflito suavemente sobre o assunto.";

    expect(sanitizeEcoText(input)).toBe("sobre o assunto.");
  });

  it("handles empty input", () => {
    expect(sanitizeEcoText("")).toBe("");
  });
});
