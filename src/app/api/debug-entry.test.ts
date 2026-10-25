import { afterEach, describe, expect, it, vi } from "vitest";

// handleJson under `next dev` (ADR-017): the request becomes an inspector entry.
// The env module is the real one with NODE_ENV switched, so the routes keep their limits.

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/env");
  vi.resetModules();
});

async function load(nodeEnv: string) {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("benefits-finder.debug-store")];
  vi.doMock("@/lib/env", async (importOriginal) => {
    const real = await importOriginal<typeof import("@/lib/env")>();
    return { ...real, env: { ...real.env, NODE_ENV: nodeEnv } };
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  return {
    search: (await import("./search/route")).POST,
    store: await import("@/lib/debug-store"),
  };
}

const searchRequest = (body: unknown) =>
  new Request("http://localhost/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("handleJson and the request inspector", () => {
  it("in development, records the bodies, the log line and the data call", async () => {
    const { search, store } = await load("development");
    const body = { filters: { categories: ["dining"] } };
    const response = await search(searchRequest(body));
    const requestId = response.headers.get("x-request-id")!;
    const answer = (await response.json()) as { offers: unknown[] };

    const entry = store.getDebugEntry(requestId)!;
    expect(entry).toMatchObject({
      requestId,
      endpoint: "search",
      request: JSON.stringify(body),
      log: { requestId, endpoint: "search", status: 200, outcome: "ok" },
      calls: [{ kind: "data", method: "search", rows: answer.offers.length }],
    });
    // The response is stored as JSON text, cut at the field limit (search answers run long).
    expect(entry.response).toBe(store.cut(answer));
  });

  it("in development, records a refused request with its error body", async () => {
    const { search, store } = await load("development");
    const response = await search(searchRequest({ filters: { categories: ["nope"] } }));
    const entry = store.getDebugEntry(response.headers.get("x-request-id")!)!;
    expect(entry.log).toMatchObject({ status: 400, outcome: "invalid_request" });
    expect(JSON.parse(entry.response!)).toMatchObject({ error: { code: "invalid_request" } });
    expect(entry.calls).toEqual([]);
  });

  it("in production, keeps nothing", async () => {
    const { search, store } = await load("production");
    const response = await search(searchRequest({ filters: {} }));
    expect(response.status).toBe(200);
    expect(store.getDebugEntry(response.headers.get("x-request-id")!)).toBeUndefined();
  });
});
