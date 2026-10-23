import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// Fresh modules per test, so the log starts empty and disabled.
async function load() {
  const log = await import("./debug-log");
  const client = await import("./api-client");
  return { log, client };
}

const signal = new AbortController().signal;
const answer = () =>
  vi.fn(async () =>
    Response.json(
      { offers: [], savings: { lines: [], total: 0 } },
      { headers: { "x-request-id": "r1" } },
    ),
  );

describe("client debug log", () => {
  it("records nothing until it is enabled", async () => {
    const { log, client } = await load();
    vi.stubGlobal("fetch", answer());
    await client.searchRequest({ categories: [], keywords: ["spa"] }, signal).catch(() => {});
    expect(log.debugLogSnapshot()).toEqual([]);
  });

  it("once enabled, records path, bodies, status and request ID, newest first", async () => {
    const { log, client } = await load();
    log.enableDebugLog();
    vi.stubGlobal("fetch", answer());
    await client.searchRequest({ categories: [], keywords: ["spa"] }, signal).catch(() => {});
    expect(log.debugLogSnapshot()).toEqual([
      expect.objectContaining({
        path: "/api/search",
        requestBody: { filters: { categories: [], keywords: ["spa"] } },
        status: 200,
        requestId: "r1",
        responseBody: { offers: [], savings: { lines: [], total: 0 } },
      }),
    ]);
  });

  it("does not record the health call, and records a network failure with no status", async () => {
    const { log, client } = await load();
    log.enableDebugLog();
    vi.stubGlobal("fetch", answer());
    await client.healthRequest(signal).catch(() => {});
    expect(log.debugLogSnapshot()).toEqual([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    await client.interpretRequest("spa", signal).catch(() => {});
    expect(log.debugLogSnapshot()).toEqual([
      expect.objectContaining({ path: "/api/interpret", status: null, requestId: null }),
    ]);
  });

  it("keeps the last 20 and tells subscribers", async () => {
    const { log } = await load();
    log.enableDebugLog();
    const listener = vi.fn();
    const unsubscribe = log.subscribeDebugLog(listener);
    for (let i = 0; i < 25; i++) {
      log.recordClientCall({
        path: `/p${i}`,
        requestBody: {},
        status: 200,
        ms: 1,
        responseBody: {},
        requestId: `r${i}`,
      });
    }
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(25);
    expect(log.debugLogSnapshot()).toHaveLength(log.DEBUG_LOG_LIMIT);
    expect(log.debugLogSnapshot()[0]!.path).toBe("/p24");
  });
});
