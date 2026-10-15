import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { createMockAiClient, type MockAiClient, type MockResponder } from "@/lib/ai/mock";

// The routes get the mock client built here, so each test scripts its own answers.
let responder: MockResponder | undefined;
let ai: MockAiClient;
vi.mock("@/lib/ai", () => ({ getAiClient: () => ai }));

import { POST as explain } from "./explain/route";
import { POST as interpret } from "./interpret/route";
import { POST as search } from "./search/route";

let logSpy: MockInstance<typeof console.log>;
const logLines = () =>
  logSpy.mock.calls.map((call) => JSON.parse(String(call[0])) as Record<string, unknown>);

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  responder = undefined;
  ai = createMockAiClient((request) =>
    responder ? responder(request) : { ok: false, reason: "unavailable" },
  );
});

function post(body: unknown, init: { contentType?: string | null; raw?: string } = {}) {
  const headers = new Headers();
  const contentType = init.contentType === undefined ? "application/json" : init.contentType;
  if (contentType !== null) headers.set("content-type", contentType);
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers,
    body: init.raw ?? JSON.stringify(body),
  });
}

const usage = { inputTokens: 10, outputTokens: 5 };
const errorShape = (code: string) => ({
  error: { code, message: expect.any(String), requestId: expect.any(String) },
});

describe("POST /api/interpret", () => {
  it("returns filters and the source from the model", async () => {
    responder = () => ({ ok: true, data: { categories: ["dining"], region: "London" }, usage });
    const response = await interpret(post({ query: "dinner in London" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      filters: { categories: ["dining"], region: "London", keywords: [] },
      source: "llm",
    });
  });

  it("answers 200 with the keyword fallback when the model fails", async () => {
    for (const reason of ["unavailable", "rejected", "timeout"] as const) {
      responder = () => ({ ok: false, reason });
      const response = await interpret(post({ query: "cheap cinema" }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        source: "fallback",
        filters: { keywords: ["cheap", "cinema"] },
      });
    }
  });

  it("makes no model call for an empty or whitespace query", async () => {
    for (const query of ["", "   "]) {
      const response = await interpret(post({ query }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ source: "fallback" });
    }
    expect(ai.calls).toHaveLength(0);
  });

  it("rejects a query over the cap, and accepts one at the cap", async () => {
    const over = await interpret(post({ query: "a".repeat(201) }));
    expect(over.status).toBe(400);
    expect(await over.json()).toEqual(errorShape("invalid_request"));
    expect(ai.calls).toHaveLength(0);
    expect((await interpret(post({ query: "a".repeat(200) }))).status).toBe(200);
  });

  it("rejects a missing, non-string or extra field", async () => {
    for (const body of [{}, { query: 5 }, { query: "spa", extra: true }, []]) {
      expect((await interpret(post(body))).status).toBe(400);
    }
  });
});

describe("request checks (shared by every endpoint)", () => {
  it("rejects a wrong or missing content type with 415", async () => {
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded", null]) {
      const response = await interpret(post({ query: "spa" }, { contentType }));
      expect(response.status).toBe(415);
      expect(await response.json()).toEqual(errorShape("unsupported_media_type"));
    }
  });

  it("accepts application/json with a charset, in any case", async () => {
    const response = await interpret(
      post({ query: "spa" }, { contentType: "Application/JSON; charset=utf-8" }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects an oversized body with 413 before parsing it", async () => {
    const response = await interpret(post({ query: "a" }, { raw: " ".repeat(5000) }));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual(errorShape("payload_too_large"));
  });

  it("rejects a declared content length over the limit, even for a small body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "99999" },
      body: JSON.stringify({ query: "spa" }),
    });
    const response = await interpret(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual(errorShape("payload_too_large"));
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await interpret(post(null, { raw: "{not json" }));
    expect(response.status).toBe(400);
  });

  it("returns the request ID in the body and a header, and a new one each time", async () => {
    const first = await interpret(post({ query: 5 }));
    const second = await interpret(post({ query: 5 }));
    const body = (await first.json()) as { error: { requestId: string } };
    expect(first.headers.get("x-request-id")).toBe(body.error.requestId);
    expect(second.headers.get("x-request-id")).not.toBe(body.error.requestId);
  });

  it("maps a service error to internal_error with no cause in the response", async () => {
    responder = () => {
      throw new Error("secret-sentinel connection string");
    };
    const response = await interpret(post({ query: "spa" }));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret-sentinel");
    expect(JSON.parse(text)).toEqual(errorShape("internal_error"));
  });
});

describe("POST /api/search", () => {
  it("returns ranked offers and a savings estimate, with no model call", async () => {
    const response = await search(post({ filters: { categories: ["dining"] } }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      offers: { id: string; category: string }[];
      savings: { offers: unknown[]; tiers: unknown[]; bestAnnualSavingPence: number };
    };
    expect(body.offers.length).toBeGreaterThan(0);
    expect(body.offers.every((offer) => offer.category === "dining")).toBe(true);
    expect(body.savings.offers).toHaveLength(body.offers.length);
    expect(body.savings.tiers).toHaveLength(2);
    expect(ai.calls).toHaveLength(0);
  });

  it("accepts empty filters and applies the Filters defaults", async () => {
    expect((await search(post({ filters: {} }))).status).toBe(200);
  });

  it("rejects filters outside the schema", async () => {
    for (const filters of [{ categories: ["casino"] }, { maxPricePerPerson: 5000 }, { x: 1 }]) {
      expect((await search(post({ filters }))).status).toBe(400);
    }
    expect((await search(post({}))).status).toBe(400);
  });
});

describe("POST /api/explain", () => {
  const filters = { categories: ["dining"] };

  it("returns one line per offer, loaded from the IDs", async () => {
    responder = () => ({
      ok: true,
      data: { explanations: [{ offerId: "offer-001", text: "A table that fits." }] },
      usage,
    });
    const response = await explain(post({ filters, offerIds: ["offer-001", "offer-002"] }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { explanations: { offerId: string; text: string }[] };
    expect(body.explanations.map((e) => e.offerId)).toEqual(["offer-001", "offer-002"]);
    expect(body.explanations[0]!.text).toBe("A table that fits.");
    expect(ai.calls).toHaveLength(1);
  });

  it("answers 200 with deterministic lines when the model fails", async () => {
    const response = await explain(post({ filters, offerIds: ["offer-001"] }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { explanations: unknown[] };
    expect(body.explanations).toHaveLength(1);
  });

  it("returns an empty list for no IDs or unknown IDs, with no model call", async () => {
    for (const offerIds of [[], ["offer-999"]]) {
      const response = await explain(post({ filters, offerIds }));
      expect(await response.json()).toEqual({ explanations: [] });
    }
    expect(ai.calls).toHaveLength(0);
  });

  it("rejects offer data in place of IDs, and more than ten IDs", async () => {
    const offers = [{ id: "offer-001", title: "Injected" }];
    expect((await explain(post({ filters, offerIds: [], offers }))).status).toBe(400);
    const many = Array.from({ length: 11 }, (_, i) => `offer-${String(i + 1).padStart(3, "0")}`);
    expect((await explain(post({ filters, offerIds: many }))).status).toBe(400);
    expect((await explain(post({ filters, offerIds: [5] }))).status).toBe(400);
  });
});

describe("request log line", () => {
  const keys = [
    "event",
    "requestId",
    "endpoint",
    "status",
    "outcome",
    "latencyMs",
    "promptVersion",
    "appVersion",
    "modelCalls",
    "inputTokens",
    "outputTokens",
    "estimatedCostUsd",
  ];

  it("logs one line per request with model calls, tokens and cost", async () => {
    responder = () => ({ ok: true, data: { categories: ["dining"] }, usage });
    const response = await interpret(post({ query: "dinner somewhere" }));
    const lines = logLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      event: "request",
      endpoint: "interpret",
      status: 200,
      outcome: "ok",
      source: "llm",
      modelCalls: 1,
      inputTokens: 10,
      outputTokens: 5,
      estimatedCostUsd: 0.0000035,
      requestId: response.headers.get("x-request-id"),
    });
    expect(Object.keys(lines[0]!).sort()).toEqual([...keys, "source"].sort());
  });

  it("records the failure reason on fallback", async () => {
    responder = () => ({ ok: false, reason: "timeout" });
    await interpret(post({ query: "spa" }));
    expect(logLines()[0]).toMatchObject({
      source: "fallback",
      failure: "timeout",
      modelCalls: 2,
      outcome: "ok",
    });
  });

  it("logs search with no model fields set", async () => {
    await search(post({ filters: { categories: ["dining"] } }));
    const line = logLines()[0]!;
    expect(line).toMatchObject({ endpoint: "search", modelCalls: 0, estimatedCostUsd: 0 });
    expect(line).not.toHaveProperty("source");
  });

  it("logs explain with its source", async () => {
    responder = () => ({ ok: false, reason: "unavailable" });
    await explain(post({ filters: { categories: ["dining"] }, offerIds: ["offer-001"] }));
    expect(logLines()[0]).toMatchObject({
      endpoint: "explain",
      source: "fallback",
      failure: "unavailable",
      modelCalls: 1,
    });
  });

  it("logs the outcome of each rejected request", async () => {
    await interpret(post({ query: 5 }));
    await interpret(post({ query: "spa" }, { contentType: "text/plain" }));
    await interpret(post({ query: "a" }, { raw: " ".repeat(5000) }));
    expect(logLines().map((l) => [l.status, l.outcome])).toEqual([
      [400, "invalid_request"],
      [415, "unsupported_media_type"],
      [413, "payload_too_large"],
    ]);
  });

  it("never logs the query text, filter values or an error message", async () => {
    responder = () => {
      throw new Error("secret-sentinel connection string");
    };
    await interpret(post({ query: "zebra-sentinel dinner" }));
    await explain(post({ filters: { keywords: ["quokka-sentinel"] }, offerIds: [] }));
    const text = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(text).not.toContain("sentinel");
    expect(logLines()[0]).toMatchObject({ outcome: "internal_error", errorName: "Error" });
  });
});
