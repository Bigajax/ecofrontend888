const JSON_BLOCK_REGEX = /\{[\s\S]*"emocao_principal"[\s\S]*\}\s*$/;

const STAGE_INLINE_PATTERNS = [
  "refl(?:ete|ito) suavemente",
  "pausa breve",
  "observa",
  "sil[eê]ncio",
  "sorri",
  "inspira",
  "expira",
  "respira",
  "nota",
  "inspira\\s*/\\s*expira",
  "em sil[eê]ncio",
];

const STAGE_START_PATTERNS = [
  ...STAGE_INLINE_PATTERNS,
  "(olha|encara) (de modo|com)",
  "em tom[^\n.,!?]*",
];

const buildStartPattern = () => {
  const joined = STAGE_START_PATTERNS.join("|");
  return new RegExp(`^(?:\\s*(?:${joined})[\\s:.,-]*)+`, "i");
};

const buildInlinePattern = () => {
  const joined = STAGE_INLINE_PATTERNS.join("|");
  return new RegExp(`\\b(?:${joined})(?:[\\s:.,-]+)?`, "gi");
};

const STAGE_START = buildStartPattern();
const STAGE_INLINE = buildInlinePattern();
const STAGE_PARENS = /[\(\[]\s*(pausa|observa|sil[eê]ncio|nota|respira|inspira|expira)[^\)\]]*[\)\]]/gi;
const MULTISPACE = /[ \t\f\v\u00a0]{2,}/g;
const LEADING_SPACE_BEFORE_BREAK = /[ \t\f\v\u00a0]+\n/g;
const TRAILING_SPACE_AFTER_BREAK = /\n[ \t\f\v\u00a0]+/g;
const MULTIBREAK = /\n{3,}/g;
const SPACE_BEFORE_PUNCT = /\s+([.,!?;:])/g;

const splitTextAndJson = (full: string) => {
  const match = full.match(JSON_BLOCK_REGEX);
  if (!match || match.index === undefined) {
    return { text: full, json: "" } as const;
  }
  const index = match.index;
  return {
    text: full.slice(0, index).trimEnd(),
    json: full.slice(index),
  } as const;
};

export function sanitizeEcoText(full: string): string {
  if (!full) return "";

  const { text, json } = splitTextAndJson(full);

  let sanitized = text
    .replace(STAGE_START, "")
    .replace(STAGE_PARENS, "")
    .replace(STAGE_INLINE, "")
    .replace(LEADING_SPACE_BEFORE_BREAK, "\n")
    .replace(TRAILING_SPACE_AFTER_BREAK, "\n")
    .replace(MULTISPACE, " ")
    .replace(MULTIBREAK, "\n\n")
    .replace(SPACE_BEFORE_PUNCT, "$1")
    .trim();

  if (json) {
    return sanitized ? `${sanitized}\n${json}` : json;
  }

  return sanitized;
}

