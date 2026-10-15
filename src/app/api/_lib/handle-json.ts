import "server-only";
import type { z } from "zod";
import { API_ERROR_STATUS, type ApiError, type ApiErrorCode } from "@/domain/api";
import { env } from "@/lib/env";

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

// The shared shell of every POST endpoint (ADR-009 rule 10): content type and
// size are checked before parsing, the body is validated with Zod, and every
// failure leaves as the one error shape. A model failure is not an error here:
// the service returns its fallback and `run` answers normally.
export async function handleJson<TBody, TResult>(
  request: Request,
  options: {
    body: z.ZodType<TBody>;
    result: z.ZodType<TResult>;
    run: (body: TBody) => Promise<unknown>;
  },
): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    if (!isJson(request.headers.get("content-type"))) {
      return errorResponse("unsupported_media_type", requestId);
    }
    let text: string;
    try {
      text = await readText(request, env.MAX_BODY_BYTES);
    } catch (error) {
      if (error instanceof PayloadTooLarge) return errorResponse("payload_too_large", requestId);
      throw error;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return errorResponse("invalid_request", requestId);
    }
    const body = options.body.safeParse(json);
    if (!body.success) return errorResponse("invalid_request", requestId);

    const result = options.result.parse(await options.run(body.data));
    return Response.json(result, { headers: { "x-request-id": requestId } });
  } catch {
    // Nothing from the cause reaches the client; the log line (a later item)
    // is where it will be recorded.
    return errorResponse("internal_error", requestId);
  }
}
