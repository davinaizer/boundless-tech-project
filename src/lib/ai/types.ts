import "server-only";

// One structured-output model call. The schema is plain JSON Schema written for
// the model: structured outputs reject numeric and string-length constraints, so
// the caller re-validates `data` with its own Zod schema (ADR-005).
export type StructuredRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  signal?: AbortSignal;
};

export type ModelUsage = { inputTokens: number; outputTokens: number };

// Every way a call can fail to give usable JSON. The services treat each one as
// a failed attempt (retry once, then fall back); none of them is an error response.
// "timeout" is kept apart from "unavailable" so the timeout can be tuned from logs.
export type StructuredFailure =
  | "refusal"
  | "truncated"
  | "invalid_json"
  | "unavailable"
  | "timeout";

export type StructuredResult =
  | { ok: true; data: unknown; usage: ModelUsage }
  // usage is present when the model answered, so a refused or truncated call is still counted.
  | { ok: false; reason: StructuredFailure; usage?: ModelUsage };

export interface AiClient {
  generateStructured(request: StructuredRequest): Promise<StructuredResult>;
}
