import type { MutableRefObject } from "react";

export const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
};

export const toRecordSafe = (input: unknown): Record<string, unknown> => {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
};

export const toCleanString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

export const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => toCleanString(item))
      .filter((item): item is string => Boolean(item));
    if (normalized.length === 0) return undefined;
    return Array.from(new Set(normalized));
  }
  const str = toCleanString(value);
  if (!str) return undefined;
  const parts = str
    .split(/[\,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return Array.from(new Set(parts));
};

const collectCandidates = (records: Array<Record<string, unknown> | undefined>, keys: string[]): unknown[] => {
  const results: unknown[] = [];
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (key in record) {
        const value = record[key];
        if (value !== undefined && value !== null) {
          results.push(value);
        }
      }
    }
  }
  return results;
};

export const pickStringFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): string | undefined => {
  const candidates = collectCandidates(records, keys);
  for (const candidate of candidates) {
    const normalized = toCleanString(candidate);
    if (normalized) return normalized;
  }
  return undefined;
};

export const pickNumberFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): number | undefined => {
  const candidates = collectCandidates(records, keys);
  for (const candidate of candidates) {
    const normalized = toNumber(candidate);
    if (typeof normalized === "number") return normalized;
  }
  return undefined;
};

export const pickStringArrayFromRecords = (
  records: Array<Record<string, unknown> | undefined>,
  keys: string[],
): string[] | undefined => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (!(key in record)) continue;
      const normalized = toStringArray(record[key]);
      if (normalized && normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
};

export const isAlphaNumericChar = (char: string | undefined): boolean =>
  typeof char === "string" && /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/u.test(char);

export const isLetterOrQuoteChar = (char: string | undefined): boolean =>
  typeof char === "string" && /[A-Za-zÀ-ÖØ-öø-ÿ"'“”‘’`]/u.test(char);

export const assignRef = <T>(ref: MutableRefObject<T>, value: T) => {
  ref.current = value;
};

export const safeDebug = (label: string, payload: Record<string, unknown>) => {
  try {
    console.debug(label, payload);
  } catch {
    /* noop */
  }
};

