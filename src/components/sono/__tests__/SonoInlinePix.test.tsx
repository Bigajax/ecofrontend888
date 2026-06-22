import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// apiUrl passa o path direto (sem base) pra inspecionar as chamadas.
vi.mock("@/config/apiBase", () => ({ apiUrl: (p: string) => p }));

// Pixel/CAPI sem efeito; event_id determinístico.
vi.mock("@/lib/fbpixel", () => ({
  trackWithCAPI: vi.fn(),
  ensurePurchaseEventId: vi.fn(() => "evt_purchase_1"),
  getPurchaseEventId: vi.fn(() => "evt_purchase_1"),
  getFbp: vi.fn(() => "fbp.1"),
  resolveFbc: vi.fn(() => "fbc.1"),
}));

import { SonoInlinePix } from "../SonoInlinePix";
import { readSonoLifetime, LIFETIME_LS_KEY } from "../sonoLifetime";
import { trackWithCAPI } from "@/lib/fbpixel";

const PIX_RESPONSE = {
  id: "123456",
  qr_code: "00020126PIXCOPIAECOLA",
  qr_code_base64: "QkFTRTY0",
  external_reference: "sono_guest_abc_1_deadbe",
};

function mockFetchSequence(statusBody: { status: string }) {
  return vi.fn((url: string) => {
    if (url === "/api/payments/sono-pix") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(PIX_RESPONSE) });
    }
    if (url.startsWith("/api/payments/status/")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(statusBody) });
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("SonoInlinePix", () => {
  it("cria o Pix no mount, dispara InitiateCheckout e envia o guest_id", async () => {
    const fetchMock = mockFetchSequence({ status: "pending" });
    vi.stubGlobal("fetch", fetchMock);

    render(<SonoInlinePix price={37} guestId="guest_abc" onPaid={vi.fn()} />);

    expect(await screen.findByText("Copiar código Pix")).toBeTruthy();

    const createCall = fetchMock.mock.calls.find((c) => c[0] === "/api/payments/sono-pix");
    expect(createCall).toBeTruthy();
    const body = JSON.parse((createCall![1] as RequestInit).body as string);
    expect(body.guest_id).toBe("guest_abc");
    expect(body.purchaseEventId).toBe("evt_purchase_1");

    expect(trackWithCAPI).toHaveBeenCalledWith(
      "InitiateCheckout",
      expect.objectContaining({ value: 37, currency: "BRL" }),
    );
  });

  it("ao aprovar, grava o cache vitalício e chama onPaid (1×)", async () => {
    const fetchMock = mockFetchSequence({ status: "approved" });
    vi.stubGlobal("fetch", fetchMock);
    const onPaid = vi.fn();

    render(<SonoInlinePix price={37} guestId="guest_abc" onPaid={onPaid} />);

    // Dispara a verificação imediata (sem esperar o polling de 4s).
    fireEvent.click(await screen.findByText("Já paguei, verificar"));

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));

    const cache = readSonoLifetime();
    expect(cache?.unlocked).toBe(true);
    expect(cache?.externalReference).toBe(PIX_RESPONSE.external_reference);
    expect(cache?.paymentId).toBe(PIX_RESPONSE.id);
    expect(localStorage.getItem(LIFETIME_LS_KEY)).toBeTruthy();

    // Purchase no client (dedup com o webhook).
    expect(trackWithCAPI).toHaveBeenCalledWith(
      "Purchase",
      expect.objectContaining({ value: 37, currency: "BRL" }),
      "evt_purchase_1",
    );
  });
});
