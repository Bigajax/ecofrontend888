import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

const restoreNodeEnv = () => {
  if (typeof ORIGINAL_NODE_ENV === "undefined") {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
};

describe("orchestratorConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    restoreNodeEnv();
    delete (globalThis as Record<string, unknown>).__API_BASE__;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    restoreNodeEnv();
    delete (globalThis as Record<string, unknown>).__API_BASE__;
  });

  const importConfig = async () => await import("../orchestratorConfig");

  describe("resolveAbsoluteAskEcoUrl", () => {
    it("builds an absolute URL from VITE_API_URL", async () => {
      vi.stubEnv("VITE_API_URL", "https://api.example.com/base/");
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { resolveAbsoluteAskEcoUrl } = await importConfig();
      const result = resolveAbsoluteAskEcoUrl();

      expect(result).toMatchObject({
        url: "https://api.example.com/base/api/ask-eco",
        base: "https://api.example.com/base",
        source: "VITE_API_URL",
      });
      expect(result.nodeEnv).toBe(process.env.NODE_ENV ?? "");
      expect(consoleLog).toHaveBeenCalledWith("[SSE-DEBUG] env_probe", {
        hasDefine: false,
        hasNextPub: false,
        hasVite: true,
      });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("throws when the resolved base URL is invalid", async () => {
      vi.stubEnv("VITE_API_URL", "notaurl");
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { resolveAbsoluteAskEcoUrl } = await importConfig();

      expect(() => resolveAbsoluteAskEcoUrl()).toThrowError(/API_BASE invalid/);
      expect(consoleLog).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith("[SSE] Invalid API_BASE", {
        base: "notaurl",
        source: "VITE_API_URL",
      });
    });

    it("blocks localhost bases when NODE_ENV is production", async () => {
      vi.stubEnv("VITE_API_URL", "https://localhost:3000");
      process.env.NODE_ENV = "production";
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { resolveAbsoluteAskEcoUrl } = await importConfig();

      expect(() => resolveAbsoluteAskEcoUrl()).toThrowError(/localhost not allowed/);
      expect(consoleLog).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        "[SSE] API_BASE localhost blocked in production",
        expect.objectContaining({ source: "VITE_API_URL" }),
      );
    });
  });
});
