import "server-only";
import { env } from "@/lib/env";
import { createRateLimiter, type RateLimiter } from "@/lib/rate-limit";

const KEY = Symbol.for("benefits-finder.model-limiter");
type Holder = { [KEY]?: RateLimiter | null };

// One limiter shared by the endpoints that call the model, so a client cannot
// get a separate budget per endpoint. Held on globalThis so route bundles that
// load this module twice still share it. Only a real provider costs money, so
// the mock (local, CI, e2e) is never limited (ADR-006). Best effort: see
// createRateLimiter.
export function getModelLimiter(): RateLimiter | undefined {
  const holder = globalThis as Holder;
  if (holder[KEY] === undefined) {
    holder[KEY] =
      env.AI_PROVIDER === "anthropic"
        ? createRateLimiter({ limit: env.RATE_LIMIT_PER_MINUTE, windowMs: 60_000 })
        : null;
  }
  return holder[KEY] ?? undefined;
}
