export interface ContinuityRef {
  id: string;
  emocao_principal?: string;
  dias_desde?: number;
  similarity?: number;
}

export interface ContinuityMeta {
  hasContinuity: boolean;
  memoryRef?: ContinuityRef;
}

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === 'object' ? (value as UnknownRecord) : undefined;

const readBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const toContinuityRef = (value: unknown): ContinuityRef | undefined => {
  const record = toRecord(value);
  if (!record) return undefined;

  const idValue = record['id'];
  if (typeof idValue !== 'string' || !idValue) {
    return undefined;
  }

  const ref: ContinuityRef = { id: idValue };
  const emotion = record['emocao_principal'];
  const days = record['dias_desde'];
  const similarity = record['similarity'];

  if (typeof emotion === 'string') {
    ref.emocao_principal = emotion;
  }
  if (typeof days === 'number') {
    ref.dias_desde = days;
  }
  if (typeof similarity === 'number') {
    ref.similarity = similarity;
  }
  return ref;
};

export function normalizeContinuity(meta: unknown): ContinuityMeta {
  const base = toRecord(meta);
  const packed = toRecord(base?.['continuity']);
  const flags = toRecord(base?.['flags']);

  const has =
    readBoolean(base?.['hasContinuity']) ??
    readBoolean(packed?.['hasContinuity']) ??
    readBoolean(flags?.['hasContinuity']) ??
    false;

  const ref =
    toContinuityRef(base?.['continuityRef']) ??
    toContinuityRef(packed?.['memoryRef']) ??
    toContinuityRef(base?.['memoryRef']);

  return {
    hasContinuity: has,
    ...(ref ? { memoryRef: ref } : {}),
  };
}

function extractContinuity(meta: unknown): ContinuityMeta | undefined {
  const root = toRecord(meta);
  if (!root) return undefined;

  const visited = new Set<object>();
  const queue: UnknownRecord[] = [];

  const enqueue = (value: unknown) => {
    const record = toRecord(value);
    if (!record || visited.has(record)) return;
    visited.add(record);
    queue.push(record);
  };

  enqueue(root);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const normalized = normalizeContinuity(current);
    if (normalized.hasContinuity || normalized.memoryRef) {
      return normalized;
    }

    enqueue(current['meta']);
    enqueue(current['metadata']);
    enqueue(current['payload']);
    enqueue(current['response']);
    enqueue(current['data']);
    enqueue(current['done']);
    enqueue(current['continuity']);
    enqueue(current['continuityRef']);
  }

  return undefined;
}

export function resolveContinuityMeta(
  ...candidates: unknown[]
): ContinuityMeta | undefined {
  for (const candidate of candidates) {
    const resolved = extractContinuity(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}
