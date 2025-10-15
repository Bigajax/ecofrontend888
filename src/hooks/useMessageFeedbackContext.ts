import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

import type { Message } from "../contexts/ChatContext";

export type MessageFeedbackContext = {
  interactionId: string;
  moduleCombo?: string[];
  promptHash?: string;
  messageId?: string;
  latencyMs?: number;
};

type Traversable = Record<string, unknown> | Array<unknown>;

const INTERACTION_KEYS = ["interaction_id", "interactionId", "interaction-id"];
const MODULE_KEYS = [
  "module_combo",
  "moduleCombo",
  "selected_modules",
  "selectedModules",
  "modules",
];
const PROMPT_HASH_KEYS = ["prompt_hash", "promptHash"];
const MESSAGE_ID_KEYS = ["message_id", "messageId", "id"];
const LATENCY_KEYS = ["latency_ms", "latencyMs"];

const fallbackInteractionMap = new WeakMap<Message, string>();

const isObject = (value: unknown): value is Traversable => {
  if (value === null) return false;
  if (Array.isArray(value)) return true;
  return typeof value === "object";
};

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

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => toCleanString(item))
      .filter((item): item is string => Boolean(item));
    return cleaned.length > 0 ? Array.from(new Set(cleaned)) : undefined;
  }
  if (typeof value === "string") {
    const parts = value
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? Array.from(new Set(parts)) : undefined;
  }
  return undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const deepFind = <T>(
  root: unknown,
  predicate: (key: string, value: unknown) => value is T,
): T | undefined => {
  if (!isObject(root)) return undefined;
  const visited = new WeakSet<object>();
  const stack: Array<{ key: string; value: unknown }> = [];

  if (Array.isArray(root)) {
    for (const item of root) {
      stack.push({ key: "", value: item });
    }
  } else {
    for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
      stack.push({ key, value });
    }
  }

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const { key, value } = current;
    if (predicate(key, value)) return value;
    if (!isObject(value)) continue;
    if (visited.has(value as object)) continue;
    visited.add(value as object);
    if (Array.isArray(value)) {
      for (const item of value) {
        stack.push({ key: "", value: item });
      }
    } else {
      for (const [childKey, childValue] of Object.entries(value)) {
        stack.push({ key: childKey, value: childValue });
      }
    }
  }
  return undefined;
};

const findFirstString = (sources: unknown[], keys: string[]): string | undefined => {
  for (const source of sources) {
    const value = deepFind(source, (key, candidate): candidate is string | number => {
      if (!keys.includes(key)) return false;
      return (
        typeof candidate === "string" ||
        (typeof candidate === "number" && Number.isFinite(candidate))
      );
    });
    const normalized = toCleanString(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const findFirstStringArray = (sources: unknown[], keys: string[]): string[] | undefined => {
  for (const source of sources) {
    const value = deepFind(source, (key, candidate): candidate is unknown => keys.includes(key));
    const normalized = toStringArray(value);
    if (normalized && normalized.length > 0) return normalized;
  }
  return undefined;
};

const findFirstNumber = (sources: unknown[], keys: string[]): number | undefined => {
  for (const source of sources) {
    const value = deepFind(source, (key, candidate): candidate is string | number => {
      if (!keys.includes(key)) return false;
      return typeof candidate === "string" || typeof candidate === "number";
    });
    const normalized = toNumber(value);
    if (typeof normalized === "number") return normalized;
  }
  return undefined;
};

const ensureFallbackInteractionId = (message?: Message | null): string => {
  if (!message) {
    return `interaction-${uuidv4()}`;
  }
  if (typeof message.id === "string" && message.id.trim().length > 0) {
    return message.id.trim();
  }
  const cached = fallbackInteractionMap.get(message);
  if (cached) return cached;
  const generated = uuidv4();
  fallbackInteractionMap.set(message, generated);
  return generated;
};

export function extractMessageFeedbackContext(
  message?: Message | null,
): MessageFeedbackContext {
  const sources: unknown[] = [];
  if (message?.donePayload !== undefined) sources.push(message.donePayload);
  if (message?.metadata !== undefined) sources.push(message.metadata);

  const interactionCandidate = findFirstString(sources, INTERACTION_KEYS);
  const messageIdCandidate = findFirstString(sources, MESSAGE_ID_KEYS);
  const moduleCombo = findFirstStringArray(sources, MODULE_KEYS);
  const promptHash = findFirstString(sources, PROMPT_HASH_KEYS);
  const latencyCandidate =
    typeof message?.latencyMs === "number"
      ? message.latencyMs
      : findFirstNumber(sources, LATENCY_KEYS);

  const messageId =
    (typeof message?.id === "string" && message.id.trim().length > 0
      ? message.id.trim()
      : undefined) ?? messageIdCandidate;

  const interactionId =
    (interactionCandidate && interactionCandidate.trim().length > 0
      ? interactionCandidate.trim()
      : undefined) ??
    messageId ??
    ensureFallbackInteractionId(message);

  const context: MessageFeedbackContext = {
    interactionId,
    messageId: messageId ?? ensureFallbackInteractionId(message),
  };

  if (moduleCombo && moduleCombo.length > 0) {
    context.moduleCombo = moduleCombo;
  }

  if (promptHash) {
    context.promptHash = promptHash;
  }

  if (typeof latencyCandidate === "number" && Number.isFinite(latencyCandidate)) {
    context.latencyMs = Math.max(0, Math.round(latencyCandidate));
  }

  return context;
}

export function useMessageFeedbackContext(message?: Message | null) {
  return useMemo(() => extractMessageFeedbackContext(message), [
    message,
    message?.id,
    message?.latencyMs,
    message?.metadata,
    message?.donePayload,
  ]);
}
