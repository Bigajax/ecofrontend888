import { smartJoin } from "../utils/streamJoin";

const TEXTUAL_KEYS = [
  "content",
  "texto",
  "text",
  "output_text",
  "outputText",
  "output",
  "answer",
  "resposta",
  "reply",
  "fala",
  "speech",
  "response",
  "final",
  "resultText",
  "value",
] as const;

const NESTED_KEYS = [
  "message",
  "messages",
  "mensagem",
  "resposta",
  "response",
  "data",
  "delta",
  "result",
  "payload",
  "choices",
] as const;

export const normalizeMessageContent = (
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    if (visited.has(value as object)) return "";
    visited.add(value as object);

    if (Array.isArray(value)) {
      let combined = "";
      for (const item of value) {
        const fragment = normalizeMessageContent(item, visited);
        if (!fragment) {
          continue;
        }
        // For arrays, keep text parts together with smartJoin (e.g., array of strings)
        combined = combined ? smartJoin(combined, fragment) : fragment;
      }
      return combined;
    }

    const obj = value as Record<string, unknown> & { choices?: unknown };
    let aggregated = "";

    for (const key of TEXTUAL_KEYS) {
      if (key in obj) {
        const textValue = normalizeMessageContent(obj[key], visited);
        aggregated = aggregated ? smartJoin(aggregated, textValue) : textValue;
      }
    }

    for (const key of NESTED_KEYS) {
      if (key in obj) {
        const nestedValue = normalizeMessageContent(obj[key], visited);
        aggregated = aggregated ? smartJoin(aggregated, nestedValue) : nestedValue;
      }
    }

    if (Array.isArray(obj.choices)) {
      const choicesText = obj.choices
        .map((choice) => normalizeMessageContent(choice, visited))
        .reduce((acc: string, text: string) => acc ? smartJoin(acc, text) : text, "");
      aggregated = aggregated ? smartJoin(aggregated, choicesText) : choicesText;
    }

    return aggregated;
  }

  return "";
};

export default normalizeMessageContent;
