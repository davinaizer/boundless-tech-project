import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { handleJson } from "./handle-json";

let logSpy: MockInstance<typeof console.log>;
beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const request = (ip = "1.1.1.1") =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip },
    body: JSON.stringify({}),
  });

function call(rateLimit: ReturnType<typeof createRateLimiter> | undefined, ip?: string) {
  const run = vi.fn(async () => ({ body: { ok: true } }));
  const response = handleJson(request(ip), {
    endpoint: "test",
    body: z.object({}),
    result: z.object({ ok: z.boolean() }),
    run,
    ...(rateLimit ? { rateLimit } : {}),
  });
  return { response, run };
}

describe("handleJson rate limit", () => {
  it("refuses over the limit with 429, Retry-After and the shared error shape, without running", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    await call(limiter).response;
    await call(limiter).response;
    const { response, run } = call(limiter);
    const res = await response;
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(await res.json()).toEqual({
      error: {
        code: "rate_limited",
        message: expect.any(String),
        requestId: res.headers.get("x-request-id"),
      },
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("logs the refusal with no model calls and no tokens", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    await call(limiter).response;
    await call(limiter).response;
    const lines = logSpy.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>);
    expect(lines.at(-1)).toMatchObject({
      outcome: "rate_limited",
      status: 429,
      modelCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("counts each client address separately", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect((await call(limiter, "1.1.1.1").response).status).toBe(200);
    expect((await call(limiter, "2.2.2.2").response).status).toBe(200);
    expect((await call(limiter, "1.1.1.1").response).status).toBe(429);
  });

  it("does nothing without a limiter", async () => {
    for (let i = 0; i < 5; i++) expect((await call(undefined).response).status).toBe(200);
  });
});
