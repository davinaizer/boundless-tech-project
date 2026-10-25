import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const record = { requestId: "r1", endpoint: "search", at: "", calls: [] };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("debug entry cache", () => {
  it("fetches each request's record once and keeps it", async () => {
    const fetch = vi.fn(async () => Response.json(record));
    vi.stubGlobal("fetch", fetch);
    const cache = await import("./debug-entries");
    const listener = vi.fn();
    cache.subscribeDebugEntries(listener);
    cache.loadDebugEntry("r1");
    cache.loadDebugEntry("r1");
    await settle();
    cache.loadDebugEntry("r1");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.debugEntriesSnapshot().get("r1")).toEqual(record);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps a 404 as missing and does not ask again", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetch);
    const cache = await import("./debug-entries");
    cache.loadDebugEntry("gone");
    await settle();
    cache.loadDebugEntry("gone");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.debugEntriesSnapshot().get("gone")).toBe("missing");
  });
});
