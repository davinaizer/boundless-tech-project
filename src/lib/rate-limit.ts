import "server-only";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = { check(key: string): RateLimitResult };

// A fixed window per key, kept in memory. Best effort by design (ADR-006): on
// serverless every instance has its own map, so the limit is per instance, and a
// restart forgets it. The provider spend limit is the real control. The map is
// bounded so a flood of distinct keys cannot grow it; when full, the oldest key
// is forgotten, which lets that key in again (fail open, accepted).
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}): RateLimiter {
  const { limit, windowMs, maxKeys = 10_000, now = Date.now } = options;
  const windows = new Map<string, { start: number; count: number }>();

  const makeRoom = (at: number) => {
    for (const [key, entry] of windows) {
      if (at - entry.start >= windowMs) windows.delete(key);
    }
    while (windows.size >= maxKeys) {
      const oldest = windows.keys().next();
      if (oldest.done) break;
      windows.delete(oldest.value);
    }
  };

  return {
    check(key) {
      const at = now();
      let entry = windows.get(key);
      if (entry === undefined || at - entry.start >= windowMs) {
        if (entry === undefined && windows.size >= maxKeys) makeRoom(at);
        entry = { start: at, count: 0 };
        windows.set(key, entry);
      }
      if (entry.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.start + windowMs - at) / 1000));
        return { allowed: false, retryAfterSeconds };
      }
      entry.count++;
      return { allowed: true };
    },
  };
}

const MAX_KEY_LENGTH = 64;

// The caller's address as the platform reports it. Netlify sets
// x-nf-client-connection-ip itself; x-forwarded-for is the fallback and a client
// can write it, which is part of why this limit is best effort. With neither
// header all callers share one bucket ("unknown").
export function clientKey(headers: Headers): string {
  const netlify = headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify.slice(0, MAX_KEY_LENGTH);
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, MAX_KEY_LENGTH);
  return "unknown";
}
