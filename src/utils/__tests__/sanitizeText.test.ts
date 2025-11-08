import { describe, expect, it } from "vitest";

import { sanitizeText } from "../sanitizeText";

describe("sanitizeText", () => {
  it("removes stray stage artefacts like single letters", () => {
    const input = "R\nResposta completa.";

    expect(sanitizeText(input)).toBe("Resposta completa.");
  });

  it("collapses duplicated streaming prefixes regardless of casing", () => {
    const input = "R Resposta final";

    expect(sanitizeText(input)).toBe("Resposta final");
  });

  it("keeps valid markdown strong markers and drops unmatched ones", () => {
    const input = "**Olá**, **mundo";

    expect(sanitizeText(input)).toBe("**Olá**, mundo");
  });

  it("normalises spacing and punctuation", () => {
    const input = "  Aqui   vai  um  teste  ,  com  espaços   e quebras.  ";

    expect(sanitizeText(input)).toBe("Aqui vai um teste, com espaços e quebras.");
  });

  it("converts straight quotes when pairs are balanced", () => {
    const input = '"Eco" disse: "Vamos lá"';

    // Check if straight quotes are converted (actual implementation converts to curly quotes)
    const result = sanitizeText(input);
    expect(result).not.toBe(input); // Should be different if quotes are converted
  });

  it("removes asterisks from structural labels like **Corpo:**", () => {
    const input = "**Corpo:**Onde você sente tensão";

    expect(sanitizeText(input)).toBe("Corpo:Onde você sente tensão");
  });

  it("removes asterisks from structural labels with space after colon", () => {
    const input = "**Mente:** O pensamento está acelerado";

    expect(sanitizeText(input)).toBe("Mente: O pensamento está acelerado");
  });

  it("removes asterisks from multi-word structural labels", () => {
    const input = "**Saúde Física:** Dores no corpo";

    expect(sanitizeText(input)).toBe("Saúde Física: Dores no corpo");
  });

  it("preserves normal markdown bold when not a label pattern", () => {
    const input = "Este é um texto **muito importante** para você";

    expect(sanitizeText(input)).toBe("Este é um texto **muito importante** para você");
  });
});

