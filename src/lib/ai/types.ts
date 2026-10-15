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

// Every way a call can fail to give usable JSON; none of them is an error response.
// "timeout" is kept apart from "unavailable" so the timeout can be tuned from logs.
// "rejected" is the provider refusing the request itself (HTTP 400, 401, 403 or
// 404: a wrong key, a retired model ID, a schema it will not take). Repeating the
// call cannot help, so the services do not retry it; the others get one retry.
export type StructuredFailure =
  | "refusal"
  | "truncated"
  | "invalid_json"
  | "unavailable"
  | "timeout"
  | "rejected";

export type StructuredResult =
  | { ok: true; data: unknown; usage: ModelUsage }
  // usage is present when the model answered, so a refused or truncated call is still counted.
  | { ok: false; reason: StructuredFailure; usage?: ModelUsage };

export interface AiClient {
  generateStructured(request: StructuredRequest): Promise<StructuredResult>;
}
