import "server-only";
import type { z } from "zod";
import { API_ERROR_STATUS, type ApiError, type ApiErrorCode } from "@/domain/api";
import { env } from "@/lib/env";
import { estimateCostUsd, logRequest, type RequestLog } from "@/lib/log";
import { APP_VERSION } from "@/lib/version";
import { PROMPT_VERSION } from "@/services/prompt-version";

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_request: "The request is not valid.",
  unsupported_media_type: "The request body must be JSON.",
  payload_too_large: "The request body is too large.",
  internal_error: "Something went wrong. Please try again.",
};

function errorResponse(code: ApiErrorCode, requestId: string): Response {
  const body: ApiError = { error: { code, message: MESSAGES[code], requestId } };
  return Response.json(body, {
    status: API_ERROR_STATUS[code],
    headers: { "x-request-id": requestId },
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
  },
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  let telemetry: Telemetry | undefined;

  const finish = (
    response: Response,
    outcome: RequestLog["outcome"],
    errorName?: string,
  ): Response => {
    const usage = telemetry?.usage ?? { inputTokens: 0, outputTokens: 0 };
    logRequest({
      requestId,
      endpoint: options.endpoint,
      status: response.status,
      outcome,
      latencyMs: Math.round(performance.now() - started),
      promptVersion: PROMPT_VERSION,
      appVersion: APP_VERSION,
      modelCalls: telemetry?.modelCalls ?? 0,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: estimateCostUsd(usage),
      ...(telemetry?.source ? { source: telemetry.source } : {}),
      ...(telemetry?.failure ? { failure: telemetry.failure } : {}),
      ...(errorName ? { errorName } : {}),
    });
    return response;
  };

  try {
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
    return finish(Response.json(result, { headers: { "x-request-id": requestId } }), "ok");
  } catch (error) {
    // Nothing from the cause reaches the client or the log but its class name.
    return finish(
      errorResponse("internal_error", requestId),
      "internal_error",
      error instanceof Error ? error.name : "unknown",
    );
  }
}
