import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = Symbol.for("benefits-finder.debug-store");

beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[KEY];
});

afterEach(() => {
  vi.doUnmock("@/lib/env");
  vi.resetModules();
});

async function load(nodeEnv: string) {
  vi.doMock("@/lib/env", () => ({ env: { NODE_ENV: nodeEnv } }));
  return import("./debug-store");
}

const model = {
  kind: "model",
  ms: 1,
  prompt: "p",
  ok: true,
  reply: "{}",
  inputTokens: 1,
  outputTokens: 1,
} as const;

describe("debug store outside development", () => {
  for (const nodeEnv of ["production", "test"]) {
    it(`records and serves nothing under ${nodeEnv}`, async () => {
      const store = await load(nodeEnv);
      expect(store.isDebugEnabled()).toBe(false);
      const result = await store.withRequest("r1", "search", async () => {
        store.noteRequest({ request: "zebra-sentinel" });
        store.recordCall(model);
        return 42;
      });
      expect(result).toBe(42);
      expect(store.getDebugEntry("r1")).toBeUndefined();
      // No buffer was ever created, so the query text is held nowhere.
      expect((globalThis as Record<symbol, unknown>)[KEY]).toBeUndefined();
    });
  }
});

describe("debug store in development", () => {
  it("records the request fields and its calls against the request", async () => {
    const store = await load("development");
    await store.withRequest("r1", "interpret", async () => {
      store.noteRequest({ request: '{"query":"spa"}' });
      await Promise.resolve();
      store.recordCall(model);
      store.noteRequest({ response: "{}" });
    });
    expect(store.getDebugEntry("r1")).toMatchObject({
      requestId: "r1",
      endpoint: "interpret",
      request: '{"query":"spa"}',
      response: "{}",
      calls: [model],
    });
  });

  it("keeps calls of concurrent requests apart", async () => {
    const store = await load("development");
    const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
    await Promise.all(
      ["a", "b"].map((id) =>
        store.withRequest(id, "search", async () => {
          await tick();
          store.recordCall({ ...model, prompt: id });
        }),
      ),
    );
    expect(store.getDebugEntry("a")!.calls.map((c) => c.kind === "model" && c.prompt)).toEqual([
      "a",
    ]);
    expect(store.getDebugEntry("b")!.calls.map((c) => c.kind === "model" && c.prompt)).toEqual([
      "b",
    ]);
  });

  it("keeps the last 20 requests and ignores calls made outside a request", async () => {
    const store = await load("development");
    for (let i = 0; i < 25; i++) await store.withRequest(`r${i}`, "search", async () => {});
    store.recordCall(model);
    expect(store.getDebugEntry("r4")).toBeUndefined();
    expect(store.getDebugEntry("r5")).toBeDefined();
    expect(store.getDebugEntry("r24")!.calls).toEqual([]);
  });

  it("cuts long text with a mark", async () => {
    const store = await load("development");
    const long = store.cut("x".repeat(store.DEBUG_FIELD_LIMIT + 10));
    expect(long).toBe("x".repeat(store.DEBUG_FIELD_LIMIT) + "…(cut)");
    expect(store.cut({ a: 1 })).toBe('{"a":1}');
  });
});
