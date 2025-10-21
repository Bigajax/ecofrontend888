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

    expect(sanitizeText(input)).toBe("“Eco” disse: “Vamos lá”");
  });
});

