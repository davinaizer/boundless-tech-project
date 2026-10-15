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
