const ZERO_WIDTH_RE = /[\u200B-\u200D\u200E\u200F\u202A-\u202E\u2060\u2061\u2062\u2063\u2064\uFEFF]/g;
const HTML_ENTITY_RE = /&(nbsp|amp|lt|gt|quot|#39|#8216|#8217|#8220|#8221|#8230);/gi;
const VALID_STRONG_RE = /(\*\*|__)(?=\S)([\s\S]*?\S)\1/g;
const STRAY_STRONG_RE = /(\*\*|__)+/g;
// Remove asterisks from structural labels like **Corpo:** → Corpo:
const STRUCTURAL_LABEL_RE = /\*\*([a-záéíóúâêôãõçA-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+):\*\*(\s*)/g;
const SINGLE_LETTER_LINE_RE = /(^|\n)[\p{L}](?=\s*(?:\n|$))/gu;
const LONE_PREFIX_RE = /(^|\n)([\p{L}])\s+([\p{L}])/gu;
const MULTISPACE_RE = /[ \t\f\v\u00A0]{2,}/g;
const TRAILING_SPACE_RE = /[ \t\f\v\u00A0]+$/gm;
const SPACE_BEFORE_PUNCT_RE = /\s+([!?.,;:])/g;
const MULTIBREAK_RE = /\n{3,}/g;
const CODE_SEGMENT_RE = /```[\s\S]*?```|`[^`]*`/g;

const ENTITY_MAP: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  '#8216': '‘',
  '#8217': '’',
  '#8220': '“',
  '#8221': '”',
  '#8230': '…',
};

const decodeEntities = (value: string): string => {
  return value.replace(HTML_ENTITY_RE, (_, entity: string) => {
    const lower = entity.toLowerCase();
    return ENTITY_MAP[lower] ?? '';
  });
};

const convertStraightQuotes = (segment: string): string => {
  let result = segment;

  result = result.replace(/"([^"\n]+)"/g, '“$1”');
  result = result.replace(/'([^'\n]+)'/g, '‘$1’');

  return result;
};

const applyTypography = (input: string): string => {
  if (!input) return input;

  let processed = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CODE_SEGMENT_RE.exec(input)) !== null) {
    const before = input.slice(lastIndex, match.index);
    if (before) {
      processed += convertStraightQuotes(before);
    }
    processed += match[0];
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    processed += convertStraightQuotes(input.slice(lastIndex));
  }

  return processed;
};

const restoreValidStrong = (input: string, placeholders: string[]): string => {
  let restored = input;
  placeholders.forEach((original, index) => {
    const token = `\uF000${index}\uF001`;
    restored = restored.replace(new RegExp(token, 'g'), original);
  });
  return restored;
};

interface SanitizeTextOptions {
  collapseWhitespace?: boolean;
}

export function sanitizeText(raw: string, options?: SanitizeTextOptions): string {
  if (!raw) return '';

  const collapseWhitespace = options?.collapseWhitespace ?? true;

  let sanitized = raw.replace(/\r\n?/g, '\n');
  sanitized = sanitized.replace(ZERO_WIDTH_RE, '');
  sanitized = decodeEntities(sanitized);

  // Remove asterisks from structural labels (e.g., **Corpo:** → Corpo:)
  // This should be done BEFORE valid strong processing to avoid treating labels as markdown
  sanitized = sanitized.replace(STRUCTURAL_LABEL_RE, '$1:$2');

  const preservedStrong: string[] = [];
  sanitized = sanitized.replace(VALID_STRONG_RE, (match) => {
    const token = `\uF000${preservedStrong.length}\uF001`;
    preservedStrong.push(match);
    return token;
  });
  sanitized = sanitized.replace(STRAY_STRONG_RE, '');
  sanitized = restoreValidStrong(sanitized, preservedStrong);

  sanitized = sanitized.replace(SINGLE_LETTER_LINE_RE, '$1');
  sanitized = sanitized.replace(LONE_PREFIX_RE, (full, boundary: string, lone: string, next: string) => {
    if (lone.toLowerCase() === next.toLowerCase()) {
      return `${boundary}${next}`;
    }
    return full;
  });

  sanitized = sanitized.replace(/[\t\v\f\u00A0]+/g, ' ');
  if (collapseWhitespace) {
    sanitized = sanitized.replace(MULTISPACE_RE, ' ');
    sanitized = sanitized.replace(/[ \t\f\v]+\n/g, '\n');
    sanitized = sanitized.replace(/\n[ \t\f\v]+/g, '\n');
  }
  sanitized = sanitized.replace(MULTIBREAK_RE, '\n\n');
  sanitized = sanitized.replace(TRAILING_SPACE_RE, '');
  sanitized = sanitized.replace(SPACE_BEFORE_PUNCT_RE, '$1');

  sanitized = applyTypography(sanitized);

  const lines = sanitized
    .split('\n')
    .map((line) =>
      collapseWhitespace ? line.replace(MULTISPACE_RE, ' ').trimEnd() : line.replace(/\u00A0/g, ' ')
    );

  sanitized = lines.join('\n');

  return collapseWhitespace ? sanitized.trim() : sanitized;
}

export default sanitizeText;
