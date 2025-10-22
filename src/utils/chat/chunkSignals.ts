const IDENTIFIER_KEYS = [
  'chunk_index',
  'chunkIndex',
  'index',
  'cursor',
  'cursor_index',
  'cursorIndex',
  'token_index',
  'tokenIndex',
  'delta_index',
  'deltaIndex',
  'delta_id',
  'deltaId',
  'id',
];

const NESTED_KEYS = ['payload', 'delta', 'message', 'content', 'data'];

type AnyRecord = Record<string, unknown>;

type Source = { payload?: unknown; delta?: unknown } | Record<string, unknown> | unknown;

const toIdentifier = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `index:${value}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return `index:${trimmed}`;
    }
  }
  return null;
};

const toNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const collectCandidateValues = (root: unknown): unknown[] => {
  if (!root) return [];
  const values: unknown[] = [];
  const visited = new WeakSet<object>();
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item);
      }
      continue;
    }

    if (typeof current !== 'object') continue;

    const record = current as AnyRecord;
    if (visited.has(record)) continue;
    visited.add(record);

    for (const key of IDENTIFIER_KEYS) {
      if (key in record) {
        values.push(record[key]);
      }
    }

    for (const nestedKey of NESTED_KEYS) {
      const nested = record[nestedKey];
      if (nested !== undefined) {
        stack.push(nested);
      }
    }
  }

  return values;
};

export const resolveChunkIdentifier = (...sources: Source[]): string | null => {
  for (const source of sources) {
    const candidates = collectCandidateValues(source);
    for (const candidate of candidates) {
      const identifier = toIdentifier(candidate);
      if (identifier) {
        return identifier;
      }
    }
  }
  return null;
};

export const resolveChunkIndex = (...sources: Source[]): number | null => {
  for (const source of sources) {
    const candidates = collectCandidateValues(source);
    for (const candidate of candidates) {
      const numeric = toNumeric(candidate);
      if (numeric !== null) {
        return numeric;
      }
    }
  }
  return null;
};
