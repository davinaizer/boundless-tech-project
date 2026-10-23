import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/lib/env");
  vi.resetModules();
});

describe("describeRuntime", () => {
  it("names the AI provider and model and the data adapter, with no config outside development", async () => {
    const { describeRuntime } = await import("./runtime-info");
    expect(describeRuntime()).toEqual({
      ai: { provider: "mock", model: "none" },
      data: { adapter: "in-memory" },
      debug: false,
    });
  });

  it("adds the config in development, with whether a key is set but never the key", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        NODE_ENV: "development",
        AI_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "sk-sentinel",
        AI_TIMEOUT_MS: 8000,
        RATE_LIMIT_PER_MINUTE: 20,
      },
    }));
    const { describeRuntime } = await import("./runtime-info");
    const runtime = describeRuntime();
    expect(runtime).toMatchObject({
      debug: true,
      config: { aiTimeoutMs: 8000, rateLimitPerMinute: 20, apiKeyPresent: true },
    });
    expect(JSON.stringify(runtime)).not.toContain("sentinel");
  });
});
