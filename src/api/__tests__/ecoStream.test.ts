import { describe, expect, it, vi } from "vitest";
import { processEventStream, startEcoStream } from "../ecoStream";
import type { Message } from "../../contexts/ChatContext";

describe("processEventStream", () => {
  it("keeps chunk boundaries literal when streaming without explicit separators", async () => {
    const encoder = new TextEncoder();
    const messages = [
      `event: chunk\ndata: {"text":"Olá"}\n\n`,
      `event: chunk\ndata: {"text":"mundo"}\n\n`,
      `event: done\ndata: {"done":true}\n\n`,
    ];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const message of messages) {
          controller.enqueue(encoder.encode(message));
        }
        controller.close();
      },
    });

    const response = new Response(stream);
    const result = await processEventStream(response);

    expect(result.text).toBe("Olámundo");
  });

  it("maps eco history role to assistant when starting stream", async () => {
    const history = [
      {
        id: "msg-eco",
        role: "eco",
        sender: "eco",
        content: "Olá",
      } as unknown as Message,
    ];

    const fetchMock = vi.fn(async () => new Response("", { headers: { "Content-Type": "text/event-stream" } }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await startEcoStream({ history, clientMessageId: "client-123" });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init).toBeTruthy();
    const body = init?.body;
    expect(typeof body).toBe("string");
    const parsed = JSON.parse(body as string);
    expect(parsed?.history?.[0]?.role).toBe("assistant");
  });
});
