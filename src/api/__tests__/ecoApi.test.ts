import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://supabase.test");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key-test");
  return {
    fetchMock: vi.fn(),
  };
});

vi.stubGlobal("fetch", fetchMock);

vi.mock("../axios", () => ({
  default: {
    defaults: { baseURL: "https://eco.test/api" },
  },
}));

vi.mock("uuid", () => ({
  v4: () => "uuid-mock",
}));

import { supabase } from "../../lib/supabaseClient";
const getSessionMock = vi.spyOn(supabase.auth, "getSession");
getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-mock" } } });

import { enviarMensagemParaEco, EcoEventHandlers } from "../ecoApi";

const mensagens = [
  { role: "user", content: "Olá" },
  { role: "assistant", content: "Oi" },
  { role: "user", content: "Tudo bem?" },
];

const createSseResponse = (events: unknown[], newline = "\n") => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        const chunk = `data: ${JSON.stringify(event)}${newline}${newline}`;
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
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-mock" } },
    });
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

  it("processa eventos SSE separados por CRLF", async () => {
    fetchMock.mockResolvedValue(
      createSseResponse(
        [
          { type: "chunk", payload: { type: "chunk", delta: { content: "Olá" } } },
          { type: "chunk", payload: { type: "chunk", delta: { content: " mundo" } } },
          { type: "done", payload: { type: "done", metadata: { intensidade: 5 } } },
        ],
        "\r\n"
      )
    );

    const resposta = await callApi();

    expect(resposta.text).toBe("Olá mundo");
    expect(resposta.metadata).toEqual({ intensidade: 5 });
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

  it('tolera stream encerrado sem evento "done" quando já recebeu conteúdo', async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "chunk", payload: { type: "chunk", delta: { content: "Olá" } } },
      ])
    );

    const resposta = await callApi();

    expect(resposta.text).toBe("Olá");
    expect(resposta.done).toBeUndefined();
    expect(resposta.noTextReceived).toBeFalsy();
  });

  it("marca quando nenhum texto é recebido antes do done", async () => {
    fetchMock.mockResolvedValue(
      createSseResponse([
        { type: "prompt_ready", payload: { type: "prompt_ready" } },
        { type: "done", payload: { type: "done" } },
      ])
    );

    const resposta = await callApi();

    expect(resposta.text).toBe("");
    expect(resposta.done).toEqual({ type: "done" });
    expect(resposta.noTextReceived).toBe(true);
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
    expect(init?.headers).toMatchObject({
      "X-Guest-Id": "guest_123",
      "X-Guest-Mode": "1",
    });
    expect(init?.credentials).toBe("omit");
    const body = init?.body ? JSON.parse(init.body as string) : {};
    expect(body.isGuest).toBe(true);
    expect(body.guestId).toBe("guest_123");
    expect(body.usuario_id).toBeUndefined();
  });

  it("usa Accept JSON e credentials include quando streaming é desativado", async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: "token-autenticado" } },
    });

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ metadata: { foo: "bar" }, response: { content: "oi" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const resposta = await enviarMensagemParaEco(
      mensagens,
      undefined,
      "usuario-123",
      undefined,
      undefined,
      undefined,
      { stream: false }
    );

    const [, init] = fetchMock.mock.calls.at(-1) ?? [];
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      "X-Guest-Mode": "0",
    });
    expect(init?.credentials).toBe("include");
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(resposta.metadata).toEqual({ foo: "bar" });
    const body = init?.body ? JSON.parse(init.body as string) : {};
    expect(body.usuario_id).toBe("usuario-123");
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

