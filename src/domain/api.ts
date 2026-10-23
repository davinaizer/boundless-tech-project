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
});
export type HealthResponse = z.infer<typeof HealthResponse>;

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
