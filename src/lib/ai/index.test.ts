import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/lib/env");
  vi.resetModules();
});

describe("getAiClient", () => {
  it("uses the mock when AI_PROVIDER is unset, and reuses one client", async () => {
    const { getAiClient } = await import("./index");
    const client = getAiClient();
    expect(client).toHaveProperty("calls");
    expect(getAiClient()).toBe(client);
  });

  it("uses the Anthropic client when AI_PROVIDER is anthropic", async () => {
    vi.doMock("@/lib/env", () => ({
      env: { AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "test-key", AI_TIMEOUT_MS: 8000 },
    }));
    const { getAiClient } = await import("./index");
    expect(getAiClient()).not.toHaveProperty("calls");
  });
});

describe("describeAi", () => {
  it("describes the mock, with no model", async () => {
    const { describeAi } = await import("./index");
    expect(describeAi()).toEqual({ provider: "mock", model: "none" });
  });

  it("describes the Anthropic provider and its model, and builds no client", async () => {
    vi.doMock("@/lib/env", () => ({ env: { AI_PROVIDER: "anthropic" } }));
    const { describeAi } = await import("./index");
    expect(describeAi()).toEqual({ provider: "anthropic", model: "claude-haiku-5-5" });
  });
});

describe("getAiClient in development", () => {
  it("returns what the provider returns and records the call against the request", async () => {
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("benefits-finder.debug-store")];
    vi.doMock("@/lib/env", () => ({ env: { NODE_ENV: "development", AI_PROVIDER: "mock" } }));
    const { getAiClient } = await import("./index");
    const { getDebugEntry, withRequest } = await import("@/lib/debug-store");
    const request = { system: "s", prompt: "no canned answer", schema: {}, maxTokens: 10 };
    const result = await withRequest("r1", "interpret", () =>
      getAiClient().generateStructured(request),
    );
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(getDebugEntry("r1")!.calls).toEqual([
      expect.objectContaining({
        kind: "model",
        prompt: "no canned answer",
        ok: false,
        reply: "unavailable",
      }),
    ]);
  });
});
