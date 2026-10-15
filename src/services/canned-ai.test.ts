import { describe, expect, it } from "vitest";
import { getSearchOffers } from "@/data";
import { CANNED_EXPLANATION, CANNED_FILTERS, CANNED_QUERY, cannedResponder } from "@/lib/ai/canned";
import { createMockAiClient } from "@/lib/ai/mock";
import { explainResults } from "./explain-results";
import { interpretQuery } from "./interpret-query";

// The canned answers e2e relies on (ADR-007), run through the real services so a
// change to a schema, to Filters or to the grounding check fails here first.
const ai = () => createMockAiClient(cannedResponder);
const TODAY = "2026-10-15";

describe("canned mock answers", () => {
  it("interprets the canned query as the canned filters, from the model", async () => {
    const result = await interpretQuery(CANNED_QUERY, ai());
    expect(result).toMatchObject({ source: "llm", modelCalls: 1, filters: CANNED_FILTERS });
    expect(result.failure).toBeUndefined();
  });

  it("answers like an unreachable model for any other query", async () => {
    const result = await interpretQuery("a spa day in Leeds", ai());
    expect(result).toMatchObject({ source: "fallback", failure: "unavailable" });
  });

  it("finds offers for the canned filters, and explains them with grounded lines", async () => {
    const { filters } = await interpretQuery(CANNED_QUERY, ai());
    const offers = await getSearchOffers().search(filters, TODAY);
    expect(offers.length).toBeGreaterThan(0);

    const result = await explainResults(
      filters,
      offers.map((offer) => offer.id),
      { ai: ai() },
    );
    expect(result.source).toBe("llm");
    expect(result.failure).toBeUndefined();
    expect(result.explanations.length).toBeGreaterThan(0);
    for (const line of result.explanations) expect(line.text).toBe(CANNED_EXPLANATION);
  });

  it("answers an unrecognised explain prompt as unavailable", async () => {
    const result = await createMockAiClient(cannedResponder).generateStructured({
      system: "s",
      prompt: "not json",
      schema: { properties: { explanations: {} } },
      maxTokens: 64,
    });
    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });
});
