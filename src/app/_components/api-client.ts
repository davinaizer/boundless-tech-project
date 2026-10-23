import type { z } from "zod";
import {
  ApiError,
  ExplainResponse,
  HealthResponse,
  InterpretResponse,
  SearchResponse,
  type ApiErrorCode,
} from "@/domain/api";
import type { Filters } from "@/domain/filters";

export type ClientErrorCode = ApiErrorCode | "network" | "bad_response";

export class ApiRequestError extends Error {
  constructor(readonly code: ClientErrorCode) {
    super(code);
  }
}

// Plain sentences for the error state; none carries a cause (architecture: errors).
const MESSAGES: Record<ClientErrorCode, string> = {
  invalid_request: "That request could not be used. Try shorter wording.",
  unsupported_media_type: "Something went wrong sending the request. Please try again.",
  payload_too_large: "That request is too long. Try shorter wording.",
  rate_limited: "Too many requests. Please wait a minute and try again.",
  internal_error: "Something went wrong on our side. Please try again.",
  network: "We could not reach the server. Check your connection and try again.",
  bad_response: "We got an answer we could not read. Please try again.",
};

export const errorMessage = (code: ClientErrorCode) => MESSAGES[code];

export const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

async function call<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, signal });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiRequestError("network");
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiRequestError("bad_response");
  }
  if (!response.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError(parsed.success ? parsed.data.error.code : "bad_response");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiRequestError("bad_response");
  return parsed.data;
}

const post = <T>(path: string, body: unknown, schema: z.ZodType<T>, signal: AbortSignal) =>
  call(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    schema,
    signal,
  );

export const interpretRequest = (query: string, signal: AbortSignal) =>
  post("/api/interpret", { query }, InterpretResponse, signal);

export const searchRequest = (filters: Filters, signal: AbortSignal) =>
  post("/api/search", { filters }, SearchResponse, signal);

export const explainRequest = (filters: Filters, offerIds: string[], signal: AbortSignal) =>
  post("/api/explain", { filters, offerIds }, ExplainResponse, signal);

export const healthRequest = (signal: AbortSignal) =>
  call("/api/health", { method: "GET" }, HealthResponse, signal);
