import { afterEach, describe, expect, it, vi } from "vitest";
import { Filters } from "@/domain/filters";
import {
  ApiRequestError,
  errorMessage,
  interpretRequest,
  isAbort,
  searchRequest,
} from "./api-client";

const signal = new AbortController().signal;

function stubFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => vi.unstubAllGlobals());

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiRequestError) return error.code;
    throw error;
  }
  return "no error";
}

describe("api client", () => {
  it("returns the parsed body of a valid answer", async () => {
    stubFetch(async () => Response.json({ filters: { keywords: ["spa"] }, source: "llm" }));
    expect(await interpretRequest("spa", signal)).toEqual({
      filters: { categories: [], keywords: ["spa"] },
      source: "llm",
    });
  });

  it("maps an error body to its code", async () => {
    stubFetch(async () =>
      Response.json(
        { error: { code: "payload_too_large", message: "big", requestId: "r1" } },
        { status: 413 },
      ),
    );
    expect(await codeOf(interpretRequest("spa", signal))).toBe("payload_too_large");
  });

  it("reports an unreadable error or success body as bad_response", async () => {
    stubFetch(async () => new Response("<html>", { status: 502 }));
    expect(await codeOf(interpretRequest("spa", signal))).toBe("bad_response");
    stubFetch(async () => Response.json({ nope: true }));
    expect(await codeOf(searchRequest(Filters.parse({}), signal))).toBe("bad_response");
  });

  it("reports a failed fetch as network, and lets an abort through", async () => {
    stubFetch(async () => {
      throw new TypeError("failed to fetch");
    });
    expect(await codeOf(interpretRequest("spa", signal))).toBe("network");
    stubFetch(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    await expect(interpretRequest("spa", signal)).rejects.toSatisfy(isAbort);
  });

  it("has a plain message for every code, with no internals", () => {
    for (const code of [
      "invalid_request",
      "unsupported_media_type",
      "payload_too_large",
      "internal_error",
      "network",
      "bad_response",
    ] as const) {
      expect(errorMessage(code)).toMatch(/^[A-Z].*\.$/);
    }
  });
});
