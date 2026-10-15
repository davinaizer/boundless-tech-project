import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = Symbol.for("benefits-finder.model-limiter");

// env.ts parses at import time, so each case sets the values it needs and loads
// model-limiter.ts fresh.
async function loadLimiter(env: {
  AI_PROVIDER: "mock" | "anthropic";
  RATE_LIMIT_PER_MINUTE: number;
}) {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({ env }));
  return (await import("./model-limiter")).getModelLimiter;
}

beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});
afterEach(() => {
  vi.doUnmock("@/lib/env");
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

describe("getModelLimiter", () => {
  it("is none for the mock provider, so local runs, CI and e2e are never limited", async () => {
    const getModelLimiter = await loadLimiter({ AI_PROVIDER: "mock", RATE_LIMIT_PER_MINUTE: 1 });
    expect(getModelLimiter()).toBeUndefined();
    expect(getModelLimiter()).toBeUndefined();
  });

  it("limits the real provider to RATE_LIMIT_PER_MINUTE per address", async () => {
    const getModelLimiter = await loadLimiter({
      AI_PROVIDER: "anthropic",
      RATE_LIMIT_PER_MINUTE: 2,
    });
    const limiter = getModelLimiter();
    expect(limiter).toBeDefined();
    expect(limiter!.check("a").allowed).toBe(true);
    expect(limiter!.check("a").allowed).toBe(true);
    expect(limiter!.check("a").allowed).toBe(false);
  });

  it("returns one shared limiter, also to a module instance loaded again", async () => {
    const first = await loadLimiter({ AI_PROVIDER: "anthropic", RATE_LIMIT_PER_MINUTE: 5 });
    const limiter = first();
    expect(first()).toBe(limiter);
    const second = await loadLimiter({ AI_PROVIDER: "anthropic", RATE_LIMIT_PER_MINUTE: 5 });
    expect(second()).toBe(limiter);
  });
});
