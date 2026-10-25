import "server-only";
import type { z } from "zod";
import { API_ERROR_STATUS, type ApiError, type ApiErrorCode } from "@/domain/api";
import { env } from "@/lib/env";
import { estimateCostUsd, logRequest, logRuntimeOnce, type RequestLog } from "@/lib/log";
import { cut, noteRequest, withRequest } from "@/lib/debug-store";
import { clientKey, type RateLimiter } from "@/lib/rate-limit";
import { APP_VERSION } from "@/lib/version";
import { PROMPT_VERSION } from "@/services/prompt-version";
import { describeRuntime } from "@/services/runtime-info";

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_request: "The request is not valid.",
  unsupported_media_type: "The request body must be JSON.",
  payload_too_large: "The request body is too large.",
  rate_limited: "Too many requests. Please wait and try again.",
  internal_error: "Something went wrong. Please try again.",
};

function errorResponse(
  code: ApiErrorCode,
  requestId: string,
  headers: Record<string, string> = {},
): Response {
  const body: ApiError = { error: { code, message: MESSAGES[code], requestId } };
  noteRequest({ response: cut(body) });
  return Response.json(body, {
    status: API_ERROR_STATUS[code],
    headers: { "x-request-id": requestId, ...headers },
  });
}

class PayloadTooLarge extends Error {}

// Reads at most `max` bytes, so an oversized body is refused without buffering it.
async function readText(request: Request, max: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) throw new PayloadTooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new PayloadTooLarge();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const isJson = (contentType: string | null) =>
  contentType !== null && contentType.split(";")[0]!.trim().toLowerCase() === "application/json";

// What a handler reports about the model work behind its answer, for the log line.
export type Telemetry = {
  modelCalls: number;
  usage: { inputTokens: number; outputTokens: number };
  source?: "llm" | "fallback";
  failure?: string;
  groundingRule?: string;
};

// The shared shell of every POST endpoint (ADR-009 rule 10): content type and
// size are checked before parsing, the body is validated with Zod, every failure
// leaves as the one error shape, and one log line is written per request. A model
// failure is not an error here: the service returns its fallback and `run`
// answers normally.
export async function handleJson<TBody, TResult>(
  request: Request,
  options: {
    endpoint: string;
    body: z.ZodType<TBody>;
    result: z.ZodType<TResult>;
    run: (body: TBody) => Promise<{ body: unknown; telemetry?: Telemetry }>;
    // Checked before anything is read, so a refused request costs nothing. Only
    // the endpoints that call the model set it (ADR-006).
    rateLimit?: RateLimiter;
  },
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  let telemetry: Telemetry | undefined;
  const { ai, data } = describeRuntime();
  const adapter = data.adapter;
  logRuntimeOnce(() => ({
    ...ai,
    adapter,
    nodeEnv: env.NODE_ENV,
    appVersion: APP_VERSION,
    promptVersion: PROMPT_VERSION,
    aiTimeoutMs: env.AI_TIMEOUT_MS,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    apiKeyPresent: env.ANTHROPIC_API_KEY !== undefined,
  }));

  const finish = (
    response: Response,
    outcome: RequestLog["outcome"],
    errorName?: string,
  ): Response => {
    const usage = telemetry?.usage ?? { inputTokens: 0, outputTokens: 0 };
    const line: RequestLog = {
      requestId,
      endpoint: options.endpoint,
      status: response.status,
      outcome,
      latencyMs: Math.round(performance.now() - started),
      promptVersion: PROMPT_VERSION,
      appVersion: APP_VERSION,
      provider: ai.provider,
      model: ai.model,
      adapter,
      modelCalls: telemetry?.modelCalls ?? 0,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: estimateCostUsd(usage),
      ...(telemetry?.source ? { source: telemetry.source } : {}),
      ...(telemetry?.failure ? { failure: telemetry.failure } : {}),
      ...(telemetry?.groundingRule ? { groundingRule: telemetry.groundingRule } : {}),
      ...(errorName ? { errorName } : {}),
    };
    logRequest(line);
    noteRequest({ log: line });
    return response;
  };

  // In development the request becomes an entry of the inspector (ADR-017).
  return withRequest(requestId, options.endpoint, async () => {
    try {
      const verdict = options.rateLimit?.check(clientKey(request.headers));
      if (verdict !== undefined && !verdict.allowed) {
        return finish(
          errorResponse("rate_limited", requestId, {
            "retry-after": String(verdict.retryAfterSeconds),
          }),
          "rate_limited",
        );
      }
      if (!isJson(request.headers.get("content-type"))) {
        return finish(errorResponse("unsupported_media_type", requestId), "unsupported_media_type");
      }
      let text: string;
      try {
        text = await readText(request, env.MAX_BODY_BYTES);
      } catch (error) {
        if (error instanceof PayloadTooLarge) {
          return finish(errorResponse("payload_too_large", requestId), "payload_too_large");
        }
        throw error;
      }
      noteRequest({ request: cut(text) });
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return finish(errorResponse("invalid_request", requestId), "invalid_request");
      }
      const body = options.body.safeParse(json);
      if (!body.success)
        return finish(errorResponse("invalid_request", requestId), "invalid_request");

      const run = await options.run(body.data);
      telemetry = run.telemetry;
      const result = options.result.parse(run.body);
      noteRequest({ response: cut(result) });
      return finish(Response.json(result, { headers: { "x-request-id": requestId } }), "ok");
    } catch (error) {
      // Nothing from the cause reaches the client or the log but its class name.
      return finish(
        errorResponse("internal_error", requestId),
        "internal_error",
        error instanceof Error ? error.name : "unknown",
      );
    }
  });
}
