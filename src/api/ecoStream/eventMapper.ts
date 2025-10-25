export const mapResponseEventType = (
  type: string | undefined,
): { normalized?: string; original?: string } => {
  if (!type) return { normalized: type };
  if (!type.startsWith("response.")) return { normalized: type };

  const original = type;
  const lower = type.toLowerCase();

  if (
    lower === "response.created" ||
    lower === "response.started" ||
    lower === "response.in_progress" ||
    lower === "response.input_message.delta"
  ) {
    return { normalized: "prompt_ready", original };
  }

  if (lower === "response.error") {
    return { normalized: "error", original };
  }

  if (
    lower === "response.completed" ||
    lower.endsWith(".completed") ||
    lower.endsWith(".done") ||
    lower === "response.final"
  ) {
    return { normalized: "done", original };
  }

  if (lower.includes("metadata")) {
    const isPending = lower.includes("pending") || lower.endsWith(".delta");
    return { normalized: isPending ? "meta_pending" : "meta", original };
  }

  if (lower.includes("memory")) {
    return { normalized: "memory_saved", original };
  }

  if (lower.includes("latency")) {
    return { normalized: "latency", original };
  }

  if (
    lower.includes("output") ||
    lower.includes("message") ||
    lower.includes("tool") ||
    lower.includes("refusal") ||
    lower.endsWith(".delta")
  ) {
    return { normalized: "chunk", original };
  }

  return { normalized: "chunk", original };
};

export const normalizeControlName = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.\-]+/g, "_")
    .toLowerCase();
};

export const extractInteractionId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const candidates: Array<unknown> = [
    (payload as any).interaction_id,
    (payload as any).interactionId,
    (payload as any).interactionID,
    (payload as any).id,
    (payload as any).message_id,
    (payload as any).messageId,
    (payload as any).response?.interaction_id,
    (payload as any).response?.interactionId,
    (payload as any).response?.id,
    (payload as any).metadata?.interaction_id,
    (payload as any).metadata?.interactionId,
    (payload as any).context?.interaction_id,
    (payload as any).context?.interactionId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
};

export const extractMessageId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const candidates: Array<unknown> = [
    (payload as any).message_id,
    (payload as any).messageId,
    (payload as any).id,
    (payload as any).response?.message_id,
    (payload as any).response?.messageId,
    (payload as any).delta?.message_id,
    (payload as any).delta?.messageId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
};

export const extractCreatedAt = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const candidates: Array<unknown> = [
    (payload as any).created_at,
    (payload as any).createdAt,
    (payload as any).response?.created_at,
    (payload as any).response?.createdAt,
    (payload as any).timestamp,
    (payload as any).ts,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

export const normalizeChunkData = (
  payload: unknown,
): { index: number; text?: string; done?: boolean; meta?: Record<string, unknown> } | null => {
  const rawRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : undefined;
  const dataValue = (rawRecord as { data?: unknown })?.data;
  const dataRecord =
    dataValue && typeof dataValue === "object"
      ? (dataValue as Record<string, unknown>)
      : rawRecord;

  if (!dataRecord || typeof dataRecord !== "object") {
    console.warn("[SSE] Invalid format", payload);
    return null;
  }

  if (!("index" in dataRecord)) {
    console.warn("[SSE] Invalid format", dataRecord);
    return null;
  }

  const indexValue = toFiniteNumber((dataRecord as { index?: unknown }).index);
  if (typeof indexValue !== "number") {
    console.warn("[SSE] Invalid format", dataRecord);
    return null;
  }

  const textCandidates: Array<unknown> = [
    (dataRecord as { text?: unknown }).text,
    (dataRecord as { delta?: unknown }).delta,
    (dataRecord as { content?: unknown }).content,
  ];

  let resolvedText: string | undefined;
  for (const candidate of textCandidates) {
    if (typeof candidate === "string") {
      resolvedText = candidate;
      break;
    }
  }

  const doneValue = (dataRecord as { done?: unknown }).done === true ? true : undefined;

  const metaValue = (dataRecord as { meta?: unknown }).meta;
  const metadataValue = (dataRecord as { metadata?: unknown }).metadata;
  const metaRecord =
    metaValue && typeof metaValue === "object"
      ? (metaValue as Record<string, unknown>)
      : metadataValue && typeof metadataValue === "object"
        ? (metadataValue as Record<string, unknown>)
        : undefined;

  return {
    index: Math.trunc(indexValue),
    text: resolvedText,
    done: doneValue,
    meta: metaRecord,
  };
};
