export interface AskEcoChoiceMessage {
  content?: AskEcoTextValue;
  texto?: AskEcoTextValue;
  text?: AskEcoTextValue;
  output_text?: AskEcoTextValue;
  outputText?: AskEcoTextValue;
  output?: AskEcoTextValue;
  answer?: AskEcoTextValue;
  reply?: AskEcoTextValue;
  response?: AskEcoTextValue;
}

export interface AskEcoChoice {
  message?: AskEcoChoiceMessage;
  delta?: AskEcoChoiceMessage;
  text?: AskEcoTextValue;
}

export type AskEcoTextValue =
  | string
  | AskEcoTextValue[]
  | {
      content?: AskEcoTextValue;
      texto?: AskEcoTextValue;
      text?: AskEcoTextValue;
      output_text?: AskEcoTextValue;
      outputText?: AskEcoTextValue;
      output?: AskEcoTextValue;
      answer?: AskEcoTextValue;
      resposta?: AskEcoTextValue;
      respostaFinal?: AskEcoTextValue;
      reply?: AskEcoTextValue;
      fala?: AskEcoTextValue;
      speech?: AskEcoTextValue;
      response?: AskEcoTextValue;
      final?: AskEcoTextValue;
      resultText?: AskEcoTextValue;
    };

export type AskEcoPayload =
  | AskEcoTextValue
  | {
      message?: AskEcoPayload;
      resposta?: AskEcoPayload;
      mensagem?: AskEcoPayload;
      data?: AskEcoPayload;
      response?: AskEcoPayload;
      responses?: AskEcoPayload;
      result?: AskEcoPayload;
      results?: AskEcoPayload;
      payload?: AskEcoPayload;
      messages?: AskEcoPayload;
      outputs?: AskEcoPayload;
      items?: AskEcoPayload;
      entries?: AskEcoPayload;
      alternatives?: AskEcoPayload;
      segments?: AskEcoPayload;
      choices?: AskEcoChoice[];
    };

export type AskEcoResponse = AskEcoPayload;

const TEXTUAL_KEYS = [
  "content",
  "texto",
  "text",
  "output_text",
  "outputText",
  "output",
  "answer",
  "resposta",
  "respostaFinal",
  "reply",
  "fala",
  "speech",
  "response",
  "final",
  "resultText",
] as const;

const NESTED_KEYS = [
  "message",
  "mensagem",
  "resposta",
  "response",
  "responses",
  "data",
  "value",
  "delta",
  "result",
  "results",
  "payload",
  "messages",
  "outputs",
  "items",
  "entries",
  "alternatives",
  "segments",
] as const;

export const collectTexts = (value: unknown, visited = new WeakSet<object>()): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectTexts(item, visited));

  if (value && typeof value === "object") {
    if (visited.has(value as object)) return [];
    visited.add(value as object);

    const obj = value as Record<string, unknown> & { choices?: unknown };
    const results: string[] = [];

    TEXTUAL_KEYS.forEach((key) => {
      if (key in obj) results.push(...collectTexts(obj[key], visited));
    });

    NESTED_KEYS.forEach((key) => {
      if (key in obj) results.push(...collectTexts(obj[key], visited));
    });

    if (Array.isArray(obj.choices)) {
      results.push(...obj.choices.flatMap((choice) => collectTexts(choice, visited)));
    }

    return results;
  }
  return [];
};

export const normalizeAskEcoResponse = (payload: AskEcoPayload): string | undefined => {
  const texts = collectTexts(payload);
  const unique = Array.from(
    new Set(texts.map((text) => text.trim()).filter((text) => text.length > 0))
  );
  if (unique.length === 0) return undefined;
  return unique.join("\n\n");
};

export const unwrapPayload = <TPayload>(payload: TPayload): TPayload => {
  if (!payload || typeof payload !== "object") return payload;

  const visited = new Set<object>();
  let current: any = payload;

  while (
    current &&
    typeof current === "object" &&
    "payload" in current &&
    current.payload &&
    typeof current.payload === "object" &&
    !visited.has(current.payload as object)
  ) {
    visited.add(current.payload as object);
    current = current.payload;
  }

  return current as TPayload;
};
