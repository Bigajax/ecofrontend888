import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { saveObjetivos, linkUserToObjetivos } from "../onboardingObjetivos";

vi.mock("@/config/apiBase", () => ({
  apiUrl: (p: string) => `http://test.local${p}`,
}));

vi.mock("@/utils/identity", () => ({
  getOrCreateGuestId: () => "guest-test-123",
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saveObjetivos", () => {
  test("POST com headers + body corretos (resposta normal)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "uuid-1" }),
    });

    const result = await saveObjetivos({ answers: ["sono", "estresse"], skipped: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api/quiz/response");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "x-eco-guest-id": "guest-test-123",
    });
    expect(JSON.parse(init.body)).toEqual({
      quiz_source: "onboarding_objetivos",
      answers: [{ question: "objetivos", answer: ["sono", "estresse"] }],
      skipped: false,
    });
    expect(result).toEqual({ id: "uuid-1" });
  });

  test("body para Pular (answers vazio + skipped true)", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "uuid-2" }) });
    await saveObjetivos({ answers: [], skipped: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ answers: [{ question: "objetivos", answer: [] }], skipped: true });
  });

  test("retorna null quando fetch falha (não-throw)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await saveObjetivos({ answers: ["sono"], skipped: false });
    expect(result).toBeNull();
  });

  test("retorna null quando response não-OK", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await saveObjetivos({ answers: ["sono"], skipped: false });
    expect(result).toBeNull();
  });
});

describe("linkUserToObjetivos", () => {
  test("PATCH com Bearer token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api/quiz/response/uuid-1/link-user");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt-token" });
    expect(result).toBe(true);
  });

  test("retorna false em erro de rede", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(result).toBe(false);
  });

  test("retorna false em 401", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const result = await linkUserToObjetivos("uuid-1", "jwt-token");
    expect(result).toBe(false);
  });
});
