import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows the limit within a window and refuses the next call", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: time.now });
    for (let i = 0; i < 3; i++) expect(limiter.check("a")).toEqual({ allowed: true });
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("reports the time left in the window, rounded up and at least 1 s", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: time.now });
    limiter.check("a");
    time.advance(30_500);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 30 });
    time.advance(29_400);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
  });

  it("starts a new window once the old one has passed", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: time.now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    time.advance(1000);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("counts each key on its own", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock().now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("does not grow past maxKeys: expired keys go first, then the oldest", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2, now: time.now });
    limiter.check("a");
    time.advance(500);
    limiter.check("b");
    time.advance(600); // a has expired, b has not
    expect(limiter.check("c").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(false); // b was kept
    // Full of live keys (b, c): a new key evicts the oldest (b), which fails open.
    expect(limiter.check("d").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers the Netlify header, then the first x-forwarded-for entry, then one shared key", () => {
    expect(
      clientKey(
        new Headers({ "x-nf-client-connection-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }),
      ),
    ).toBe("1.1.1.1");
    expect(clientKey(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientKey(new Headers())).toBe("unknown");
  });

  it("caps the key length so a long header cannot bloat the map", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "x".repeat(500) })).length).toBe(64);
  });
});
