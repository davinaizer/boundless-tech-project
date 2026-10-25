import "server-only";
import { describeData } from "@/data";
import { describeAi } from "@/lib/ai";
import { isDebugEnabled } from "@/lib/debug-store";
import { env } from "@/lib/env";

// What the running server uses, for the request log and /api/health. A service so
// the Route Handlers reach the provider and the adapter only through this layer.
// `debug` says whether the development request inspector is on (ADR-017); the
// configuration is added only then.
export function describeRuntime() {
  const debug = isDebugEnabled();
  return {
    ai: describeAi(),
    data: describeData(),
    debug,
    ...(debug && {
      config: {
        aiTimeoutMs: env.AI_TIMEOUT_MS,
        rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
        apiKeyPresent: env.ANTHROPIC_API_KEY !== undefined,
      },
    }),
  };
}
