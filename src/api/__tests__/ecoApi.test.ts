import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock, getSessionMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getSessionMock: vi.fn().mockResolvedValue({ data: { session: { access_token: "token-mock" } } }),
}));

vi.stubGlobal("fetch", fetchMock);

vi.mock("../axios", () => ({
  default: {
    defaults: { baseURL: "https://eco.test/api" },
  },
}));

vi.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("uuid", () => ({
  v4: () => "uuid-mock",
}));

import { enviarMensagemParaEco, EcoEventHandlers } from "../ecoApi";

const mensagens = [
  { role: "user", content: "Olá" },
  { role: "assistant", content: "Oi" },
  { role: "user", content: "Tudo bem?" },
];

const createSseResponse = (events: unknown[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        const chunk = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
};

describe("enviarMensagemParaEco", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    getSessionMock.mockClear();
  });

  const callApi = async () => enviarMensagemParaEco(mensagens);

  it("concatena deltas e retorna metadata do evento done", async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "chunk", payload: { type: "chunk", delta: { content: "Olá" } } },
        { type: "chunk", payload: { type: "chunk", delta: { content: " mundo" } } },
        { type: "done", payload: { type: "done", metadata: { intensidade: 8 } } },
      ])
    );

    const resposta = await callApi();

    expect(resposta.text).toBe("Olá mundo");
    expect(resposta.metadata).toEqual({ intensidade: 8 });
    expect(resposta.done).toEqual({ type: "done", metadata: { intensidade: 8 } });
  });

  it("ignora eventos auxiliares e processa conteúdo estruturado", async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "latency", payload: { type: "latency", value: 123 } },
        {
          type: "chunk",
          payload: {
            type: "chunk",
            delta: { content: [{ text: "Parte 1" }, { text: " + Parte 2" }] },
          },
        },
        {
          type: "done",
          payload: {
            type: "done",
            response: { mensagem: { texto: "Parte 1 + Parte 2" } },
          },
        },
      ])
    );

    const resposta = await callApi();

    expect(resposta.text).toBe("Parte 1 + Parte 2");
    expect(resposta.metadata).toEqual({ mensagem: { texto: "Parte 1 + Parte 2" } });
  });

  it('lança erro quando o stream termina sem evento "done"', async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "chunk", payload: { type: "chunk", delta: { content: "Olá" } } },
      ])
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(callApi()).rejects.toThrow('Fluxo SSE encerrado sem evento "done".');

    errorSpy.mockRestore();
  });

  it("dispara callbacks incrementais conforme eventos SSE chegam", async () => {
    const events = [
      { type: "prompt_ready", payload: { type: "prompt_ready" } },
      { type: "latency", payload: { type: "latency", value: 321 } },
      {
        type: "first_token",
        payload: { type: "first_token", delta: { content: "Olá" } },
      },
      { type: "chunk", payload: { type: "chunk", delta: { content: " Eco" } } },
      {
        type: "meta_pending",
        payload: { type: "meta_pending", metadata: { status: "pending" } },
      },
      { type: "meta", payload: { type: "meta", metadata: { intensidade: 6 } } },
      {
        type: "memory_saved",
        payload: {
          type: "memory_saved",
          memoria: { intensidade: 8 },
          primeiraMemoriaSignificativa: true,
        },
      },
      {
        type: "done",
        payload: { type: "done", metadata: { intensidade: 9 } },
      },
    ];

    fetchMock.mockResolvedValue(createSseResponse(events));

    const ordem: string[] = [];
    let texto = "";
    const metas: unknown[] = [];
    const memorias: unknown[] = [];
    let latencia: number | undefined;

    const handlers: EcoEventHandlers = {
      onPromptReady: (event) => ordem.push(event.type),
      onLatency: (event) => {
        ordem.push(event.type);
        latencia = event.latencyMs;
      },
      onFirstToken: (event) => {
        ordem.push(event.type);
        texto += event.text ?? "";
      },
      onChunk: (event) => {
        ordem.push(event.type);
        texto += event.text ?? "";
      },
      onMetaPending: (event) => {
        ordem.push(event.type);
        metas.push(event.metadata);
      },
      onMeta: (event) => {
        ordem.push(event.type);
        metas.push(event.metadata);
      },
      onMemorySaved: (event) => {
        ordem.push(event.type);
        memorias.push(event.memory);
      },
      onDone: (event) => ordem.push(event.type),
    };

    const resposta = await enviarMensagemParaEco(
      mensagens,
      undefined,
      undefined,
      undefined,
      undefined,
      handlers
    );

    expect(ordem).toEqual([
      "prompt_ready",
      "latency",
      "first_token",
      "chunk",
      "meta_pending",
      "meta",
      "memory_saved",
      "done",
    ]);
    expect(texto).toBe("Olá Eco");
    expect(latencia).toBe(321);
    expect(metas).toEqual([{ status: "pending" }, { intensidade: 6 }]);
    expect(memorias).toEqual([{ intensidade: 8 }]);
    expect(resposta.text).toBe("Olá Eco");
    expect(resposta.metadata).toEqual({ intensidade: 9 });
    expect(resposta.primeiraMemoriaSignificativa).toBe(true);
  });

  it("inclui cabeçalho e payload de convidado quando isGuest é informado", async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "done", payload: { type: "done", message: { content: "oi" } } },
      ])
    );

    await enviarMensagemParaEco(
      mensagens,
      "Convidado",
      undefined,
      undefined,
      undefined,
      undefined,
      { guestId: "guest-123", isGuest: true }
    );

    const [, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(init?.headers).toMatchObject({ "x-guest-id": "guest-123" });
    const body = init?.body ? JSON.parse(init.body as string) : {};
    expect(body.isGuest).toBe(true);
    expect(body.guestId).toBe("guest-123");
    expect(body.usuario_id).toBeUndefined();
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

