import "server-only";

// Price per million tokens for claude-haiku-5-5, from ADR-005 (checked when that
// ADR was written). The log line's cost is an estimate from these figures and the
// token counts, not billing: update both if the model or its price changes.
export const PRICE_USD_PER_MILLION_TOKENS = { input: 0.1, output: 0.5 } as const;

export function estimateCostUsd(usage: { inputTokens: number; outputTokens: number }): number {
  const cost =
    (usage.inputTokens * PRICE_USD_PER_MILLION_TOKENS.input +
      usage.outputTokens * PRICE_USD_PER_MILLION_TOKENS.output) /
    1_000_000;
  // Rounded to 8 places so float noise does not reach the line.
  return Math.round(cost * 1e8) / 1e8;
}

// The one request log line. Plain fields only: no query text, no filter values,
// no error messages (the cause is its class name).
export type RequestLog = {
  requestId: string;
  endpoint: string;
  status: number;
  outcome:
    | "ok"
    | "invalid_request"
    | "unsupported_media_type"
    | "payload_too_large"
    | "rate_limited"
    | "internal_error";
  latencyMs: number;
  promptVersion: string;
  appVersion: string;
  // What served the request: "mock" or "anthropic", its model ("none" for the
  // mock) and the data adapter. "source: llm" alone does not say whether the model was real.
  provider: string;
  model: string;
  adapter: string;
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  // "llm" or "fallback" for the endpoints that call the model; absent for search.
  source?: string;
  // Why the model gave no usable answer, set only on fallback after a call.
  failure?: string;
  // Class name of an unexpected error, for outcome "internal_error".
  errorName?: string;
};

export function logRequest(line: RequestLog): void {
  console.log(JSON.stringify({ event: "request", ...line }));
}

// What the process runs on, written once. Plain configuration and one boolean for
// the key: never the key itself, a connection string or a query.
export type RuntimeLog = {
  provider: string;
  model: string;
  adapter: string;
  nodeEnv: string;
  appVersion: string;
  promptVersion: string;
  aiTimeoutMs: number;
  rateLimitPerMinute: number;
  apiKeyPresent: boolean;
};

const RUNTIME_LOGGED = Symbol.for("benefits-finder.runtime-logged");

// Held on globalThis, like the model limiter, so route bundles that load this
// module twice still write the line once per process.
export function logRuntimeOnce(line: () => RuntimeLog): void {
  const holder = globalThis as { [RUNTIME_LOGGED]?: true };
  if (holder[RUNTIME_LOGGED]) return;
  holder[RUNTIME_LOGGED] = true;
  console.log(JSON.stringify({ event: "runtime", ...line() }));
}
