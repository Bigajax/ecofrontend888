/** Normaliza quebras de linha do SSE (CRLF/CR/LF → LF) */
export const normalizeSseNewlines = (value: string): string => value.replace(/\r\n|\r|\n/g, "\n");

// Ignora heartbeats ":" e linhas vazias. NUNCA finalize por controle
// "prompt_ready" ou status diversos; finalize apenas por:
// 1) evt { type: 'control', name: 'done' } OU
// 2) reader.read().done === true (fechamento do servidor)
export const parseSseEvent = (
  eventBlock: string,
): { type?: string; payload?: any; rawData?: string } | undefined => {
  const normalizedLines = eventBlock.split("\n").map((line) => line.replace(/\r$/, ""));
  const firstNonEmptyLine = normalizedLines.find((line) => line.length > 0);

  if (firstNonEmptyLine?.startsWith(":")) {
    console.log("[SSE] Heartbeat received");
    return undefined;
  }

  const lines = normalizedLines.filter((line) => line.length > 0 && !line.startsWith(":"));

  if (lines.length === 0) return undefined;

  let eventName: string | undefined;
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      if (line.startsWith("data: ")) {
        dataParts.push(line.slice(6));
      } else {
        dataParts.push(line.slice(5));
      }
      continue;
    }

    dataParts.push(line);
  }

  const dataStr = dataParts.join("\n");
  if (dataStr.length === 0) return { type: eventName, payload: undefined };

  if (dataStr === "[DONE]") {
    return { type: eventName ?? "done", payload: { done: true }, rawData: dataStr };
  }

  try {
    const parsed = JSON.parse(dataStr);
    return { type: eventName, payload: parsed, rawData: dataStr };
  } catch {
    if (eventName === "chunk") {
      return { type: eventName, payload: { text: dataStr }, rawData: dataStr };
    }
    return { type: eventName, payload: {}, rawData: dataStr };
  }
};
