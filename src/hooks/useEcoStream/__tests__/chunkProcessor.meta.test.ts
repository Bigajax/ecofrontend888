import { describe, it, expect, vi } from "vitest";

import { processSseLine, type ProcessSseHandlers } from "../chunkProcessor";

const baseHandlers = (): ProcessSseHandlers => ({
  appendAssistantDelta: vi.fn(),
  onStreamDone: vi.fn(),
  onControl: vi.fn(),
  onPromptReady: vi.fn(),
  onError: vi.fn(),
  onMessage: vi.fn(),
  onStart: vi.fn(),
  onEmpty: vi.fn(),
  onMemorySaved: vi.fn(),
  onMeta: vi.fn(),
});

describe("processSseLine — roteamento do evento meta", () => {
  it("roteia o evento `meta` (acao_recomendada) para onMeta, não para onControl", () => {
    const handlers = baseHandlers();
    const acao = { id: "meditacao", titulo: "Uma pausa", cta: "Respirar por 5 minutos" };

    // Shape real do fio (sseEvents.sendMeta → sendEvent("meta", { data: {...} }))
    const wire = JSON.stringify({ type: "meta", streamId: "s1", data: { acao_recomendada: acao } });
    processSseLine(wire, handlers, { eventName: "meta" });

    expect(handlers.onMeta).toHaveBeenCalledTimes(1);
    const [event] = (handlers.onMeta as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((event as any)?.data?.acao_recomendada).toEqual(acao);
    expect(handlers.onControl).not.toHaveBeenCalled();
    expect(handlers.appendAssistantDelta).not.toHaveBeenCalled();
  });
});
