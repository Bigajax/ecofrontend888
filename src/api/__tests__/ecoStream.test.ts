import { describe, expect, it } from "vitest";
import { processEventStream } from "../ecoStream";

describe("processEventStream", () => {
  it("preserves separators when streaming chunks without leading spaces", async () => {
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

    expect(result.text).toBe("Olá mundo");
  });
});
