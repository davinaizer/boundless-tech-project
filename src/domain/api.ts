import { z } from "zod";
import { Filters } from "./filters";
import { LineSource, MAX_EXPLAINED_OFFERS } from "./match-reasons";
import { Offer } from "./offer";
import { SavingsEstimate } from "./savings";

// The closed set of error codes every endpoint uses, with the HTTP status each
// maps to. Messages are fixed text: no stack, SDK or database detail (architecture).
export const API_ERROR_STATUS = {
  invalid_request: 400,
  unsupported_media_type: 415,
  payload_too_large: 413,
  rate_limited: 429,
  internal_error: 500,
} as const;

export const ApiErrorCode = z.enum(
  Object.keys(API_ERROR_STATUS) as [
    keyof typeof API_ERROR_STATUS,
    ...(keyof typeof API_ERROR_STATUS)[],
  ],
);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCode,
    message: z.string().min(1),
    requestId: z.string().min(1),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// What GET /api/health reports: the running server's version, AI provider with
// its model ("none" for the mock) and data adapter. No key, URL or other config.
export const HealthResponse = z.strictObject({
  status: z.literal("ok"),
  version: z.string().min(1),
  ai: z.strictObject({ provider: z.enum(["anthropic", "mock"]), model: z.string().min(1) }),
  data: z.strictObject({ adapter: z.enum(["postgres", "in-memory"]) }),
  // True only under `next dev`: the request inspector is on (ADR-017).
  debug: z.boolean(),
  // Sent only when `debug` is true; never the key, only whether one is set.
  config: z
    .strictObject({
      aiTimeoutMs: z.number(),
      rateLimitPerMinute: z.number(),
      apiKeyPresent: z.boolean(),
    })
    .optional(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

// One model or data call made while serving a request, recorded in development
// only (ADR-017). Text fields are cut to a fixed length on the server.
export const DebugCall = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("model"),
    ms: z.number(),
    prompt: z.string(),
    ok: z.boolean(),
    // The parsed JSON the client returned, or the failure reason.
    reply: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    error: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal("data"),
    ms: z.number(),
    method: z.enum(["search", "getByIds"]),
    input: z.string(),
    rows: z.number(),
    error: z.string().optional(),
  }),
]);
export type DebugCall = z.infer<typeof DebugCall>;

// What GET /api/debug/[requestId] returns in development.
export const DebugEntry = z.strictObject({
  requestId: z.string(),
  endpoint: z.string(),
  at: z.string(),
  request: z.string().optional(),
  response: z.string().optional(),
  log: z.record(z.string(), z.unknown()).optional(),
  calls: z.array(DebugCall),
});
export type DebugEntry = z.infer<typeof DebugEntry>;

// `query` is capped by the route from configuration (ADR-006), so the schema
// takes the limit rather than fixing it here.
export const interpretRequest = (maxQueryChars: number) =>
  z.strictObject({ query: z.string().max(maxQueryChars) });

export const InterpretResponse = z.strictObject({
  filters: Filters,
  source: z.enum(["llm", "fallback"]),
});

export const SearchRequest = z.strictObject({ filters: Filters });

export const SearchResponse = z.strictObject({
  offers: z.array(Offer),
  savings: SavingsEstimate,
});

// IDs, not offers: the server reloads the offers, so a client cannot put its
// own content in the prompt.
export const ExplainRequest = z.strictObject({
  filters: Filters,
  offerIds: z.array(z.string().min(1).max(64)).max(MAX_EXPLAINED_OFFERS),
});

export const ExplainResponse = z.strictObject({
  explanations: z.array(
    z.strictObject({ offerId: z.string(), text: z.string(), source: LineSource }),
  ),
});
