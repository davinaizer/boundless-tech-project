import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `connection()` only works inside a Next request scope.
vi.mock("next/server", () => ({ connection: async () => {} }));

beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("benefits-finder.debug-store")];
});

afterEach(() => {
  vi.doUnmock("@/lib/env");
  vi.resetModules();
});

const context = (requestId: string) => ({ params: Promise.resolve({ requestId }) });

async function load(nodeEnv: string) {
  vi.doMock("@/lib/env", () => ({ env: { NODE_ENV: nodeEnv } }));
  return {
    route: await import("./route"),
    store: await import("@/lib/debug-store"),
  };
}

describe("GET /api/debug/[requestId]", () => {
  it("answers 404 outside development, even for a recorded ID", async () => {
    const { route, store } = await load("production");
    await store.withRequest("r1", "search", async () => {});
    const response = await route.GET(new Request("http://localhost"), context("r1"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("in development, returns a recorded entry and 404 for an unknown ID", async () => {
    const { route, store } = await load("development");
    await store.withRequest("r1", "search", async () => store.noteRequest({ request: "{}" }));
    const found = await route.GET(new Request("http://localhost"), context("r1"));
    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({
      requestId: "r1",
      endpoint: "search",
      request: "{}",
    });
    expect((await route.GET(new Request("http://localhost"), context("nope"))).status).toBe(404);
  });
});
