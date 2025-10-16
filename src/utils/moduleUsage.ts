export type ModuleUsageCandidate = {
  moduleKey: string;
  position?: number;
  tokens?: number;
};

const MODULE_KEY_FIELDS = [
  "module_key",
  "moduleKey",
  "module",
  "moduleId",
  "module_id",
] as const;

const POSITION_FIELDS = [
  "position",
  "index",
  "order",
  "ordem",
  "rank",
  "step",
  "slot",
] as const;

const TOKEN_FIELDS = [
  "tokens",
  "token_count",
  "tokenCount",
  "estimated_tokens",
  "estimatedTokens",
  "tokenEstimate",
  "token_usage",
  "tokenUsage",
  "tokens_used",
  "tokensUsed",
  "usage_tokens",
  "output_tokens",
  "outputTokens",
] as const;

const ACTIVATED_FIELDS = [
  "activated",
  "active",
  "selected",
  "enabled",
  "applied",
  "used",
] as const;

const VALID_KEY_PATTERN = /^[A-Za-z0-9_.:-]+$/;

const toCleanString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  }
  return undefined;
};

const normalizeModuleKey = (value: unknown): string | undefined => {
  const cleaned = toCleanString(value);
  if (!cleaned) return undefined;
  if (!VALID_KEY_PATTERN.test(cleaned)) return undefined;
  return cleaned;
};

const maybeExtractCandidate = (
  obj: Record<string, unknown>,
): ModuleUsageCandidate | undefined => {
  let moduleKey: string | undefined;
  for (const field of MODULE_KEY_FIELDS) {
    moduleKey = normalizeModuleKey(obj[field]);
    if (moduleKey) break;
  }
  if (!moduleKey) return undefined;

  const activated = ACTIVATED_FIELDS.map((field) => toBoolean(obj[field])).find(
    (value) => value !== undefined,
  );
  if (activated === false) return undefined;

  const positionField = POSITION_FIELDS.map((field) => toNumber(obj[field])).find(
    (value) => value !== undefined,
  );
  const tokensField = TOKEN_FIELDS.map((field) => toNumber(obj[field])).find(
    (value) => value !== undefined,
  );

  const candidate: ModuleUsageCandidate = { moduleKey };
  if (typeof positionField === "number" && Number.isFinite(positionField)) {
    candidate.position = positionField;
  }
  if (typeof tokensField === "number" && Number.isFinite(tokensField)) {
    candidate.tokens = tokensField;
  }
  return candidate;
};

const collectCandidatesFromSource = (
  source: unknown,
  upsert: (candidate: ModuleUsageCandidate) => void,
) => {
  if (source === null || source === undefined) return;
  if (typeof source !== "object") return;

  const visited = new WeakSet<object>();
  const stack: unknown[] = [source];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === "object") stack.push(item);
      }
      continue;
    }

    const obj = current as Record<string, unknown>;
    const candidate = maybeExtractCandidate(obj);
    if (candidate) {
      upsert(candidate);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
};

const upsertCandidateFactory = () => {
  const list: ModuleUsageCandidate[] = [];
  const indexByKey = new Map<string, number>();

  const upsert = (candidate: ModuleUsageCandidate) => {
    const key = `${candidate.moduleKey}#$${
      candidate.position !== undefined ? candidate.position : "_"
    }`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      const existing = list[existingIndex];
      if (existing) {
        if (
          existing.position === undefined &&
          candidate.position !== undefined
        ) {
          existing.position = candidate.position;
        }
        if (existing.tokens === undefined && candidate.tokens !== undefined) {
          existing.tokens = candidate.tokens;
        }
      }
      return;
    }
    indexByKey.set(key, list.length);
    list.push({ ...candidate });
  };

  return { list, upsert };
};

export const extractModuleUsageCandidates = ({
  metadata,
  donePayload,
  fallbackModules,
}: {
  metadata?: unknown;
  donePayload?: unknown;
  fallbackModules?: string[] | null | undefined;
}): ModuleUsageCandidate[] => {
  const { list, upsert } = upsertCandidateFactory();

  collectCandidatesFromSource(metadata, upsert);
  collectCandidatesFromSource(donePayload, upsert);

  const normalizedFallback = Array.isArray(fallbackModules)
    ? fallbackModules
        .map((item) => normalizeModuleKey(item))
        .filter((item): item is string => Boolean(item))
    : [];

  normalizedFallback.forEach((moduleKey, index) => {
    const position = index + 1;
    const existingWithPositionIndex = list.findIndex(
      (candidate) =>
        candidate.moduleKey === moduleKey && candidate.position === position,
    );
    if (existingWithPositionIndex >= 0) return;

    const existingWithoutPositionIndex = list.findIndex(
      (candidate) =>
        candidate.moduleKey === moduleKey && candidate.position === undefined,
    );
    if (existingWithoutPositionIndex >= 0) {
      list[existingWithoutPositionIndex].position = position;
      return;
    }

    upsert({ moduleKey, position });
  });

  return list
    .slice()
    .sort((a, b) => {
      const posA = a.position;
      const posB = b.position;
      if (posA === undefined && posB === undefined) return 0;
      if (posA === undefined) return 1;
      if (posB === undefined) return -1;
      if (posA === posB) return 0;
      return posA - posB;
    })
    .map((item) => ({
      moduleKey: item.moduleKey,
      position: item.position,
      tokens:
        typeof item.tokens === "number" && Number.isFinite(item.tokens)
          ? Math.max(0, Math.round(item.tokens))
          : undefined,
    }));
};
