import { describe, expect, it, beforeEach, vi } from "vitest";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("../axios", () => ({
  default: {
    post: postMock,
  },
}));

vi.mock("uuid", () => ({
  v4: () => "uuid-mock",
}));

import { enviarMensagemParaEco } from "../ecoApi";

const mensagens = [
  { role: "user", content: "Olá" },
  { role: "assistant", content: "Oi" },
  { role: "user", content: "Tudo bem?" },
];

describe("enviarMensagemParaEco", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  const callApi = async () => enviarMensagemParaEco(mensagens);

  it("extrai texto de strings simples", async () => {
    postMock.mockResolvedValue({ data: { message: "Resposta direta" }, status: 200 });

    await expect(callApi()).resolves.toBe("Resposta direta");
  });

  it("extrai texto de objetos com content", async () => {
    postMock.mockResolvedValue({ data: { message: { content: "Texto interno" } }, status: 200 });

    await expect(callApi()).resolves.toBe("Texto interno");
  });

  it("extrai texto de objetos com texto", async () => {
    postMock.mockResolvedValue({ data: { resposta: { texto: "Texto em português" } }, status: 200 });

    await expect(callApi()).resolves.toBe("Texto em português");
  });

  it("concatena itens de arrays quando necessário", async () => {
    postMock.mockResolvedValue({ data: { message: ["Parte 1", "Parte 2"] }, status: 200 });

    await expect(callApi()).resolves.toBe("Parte 1\n\nParte 2");
  });

  it("extrai texto de estruturas compatíveis com OpenAI", async () => {
    postMock.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: "Resposta da assistente",
            },
          },
        ],
      },
      status: 200,
    });

    await expect(callApi()).resolves.toBe("Resposta da assistente");
  });

  it("lança erro quando não há conteúdo textual", async () => {
    postMock.mockResolvedValue({ data: { vazio: true }, status: 200 });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(callApi()).rejects.toThrow("Formato inválido na resposta da Eco.");

    errorSpy.mockRestore();
  });
});

