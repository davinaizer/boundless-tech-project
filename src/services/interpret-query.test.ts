import { describe, expect, it } from "vitest";
import { FILTER_LIMITS, Filters } from "@/domain/filters";
import { Audience, Category, Tier } from "@/domain/offer";
import { createMockAiClient, type MockResponder } from "@/lib/ai/mock";
import type { StructuredFailure, StructuredResult } from "@/lib/ai";
import { INTERPRET_SCHEMA, interpretQuery, keywordFallback } from "./interpret-query";

const usage = { inputTokens: 300, outputTokens: 40 };
const answer = (data: unknown): StructuredResult => ({ ok: true, data, usage });

// Plays the given results in order, one per call.
function scripted(...results: StructuredResult[]) {
  const queue = [...results];
  const responder: MockResponder = () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra model call");
    return next;
  };
  return createMockAiClient(responder);
}

describe("keywordFallback", () => {
  it("keeps the distinct words of three letters or more that are not stop words", () => {
    expect(keywordFallback("A cheap CINEMA near the Cinema in Leeds, for 2").keywords).toEqual([
      "cheap",
      "cinema",
      "leeds",
    ]);
  });

  it("caps the number and length of keywords", () => {
    const words = Array.from({ length: 12 }, (_, i) => `word${i}`).join(" ");
    expect(keywordFallback(words).keywords).toHaveLength(FILTER_LIMITS.maxKeywords);
    const long = "x".repeat(FILTER_LIMITS.maxKeywordLength + 10);
    expect(keywordFallback(long).keywords).toEqual(["x".repeat(FILTER_LIMITS.maxKeywordLength)]);
  });

  it("gives empty filters for empty input", () => {
    expect(keywordFallback("")).toEqual(Filters.parse({}));
  });
});

describe("INTERPRET_SCHEMA", () => {
  it("offers the model exactly the domain's enum values", () => {
    const { properties } = INTERPRET_SCHEMA;
    expect(properties.categories.items.enum).toEqual(Category.options);
    expect(properties.audience.enum).toEqual(Audience.options);
    expect(properties.tier.enum).toEqual(Tier.options);
  });

  it("names exactly the Filters fields", () => {
    expect(Object.keys(INTERPRET_SCHEMA.properties).sort()).toEqual(
      Object.keys(Filters.shape).sort(),
    );
  });
});

describe("interpretQuery", () => {
  it("makes no model call for empty or whitespace input", async () => {
    for (const query of ["", "   \n\t"]) {
      const ai = scripted();
      expect(await interpretQuery(query, ai)).toEqual({
        filters: Filters.parse({}),
        source: "fallback",
        modelCalls: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      });
      expect(ai.calls).toHaveLength(0);
    }
  });

  it("returns the model's filters, checked by Filters", async () => {
    const ai = scripted(answer({ categories: ["events", "events"], keywords: ["cinema"] }));
    expect(await interpretQuery("cinema night out", ai)).toEqual({
      filters: Filters.parse({ categories: ["events"], keywords: ["cinema"] }),
      source: "llm",
      modelCalls: 1,
      usage,
    });
  });

  it("sends only the trimmed query as the user message", async () => {
    const ai = scripted(answer({}));
    await interpretQuery("  spa day for two  ", ai);
    expect(ai.calls).toHaveLength(1);
    expect(ai.calls[0]?.prompt).toBe("spa day for two");
    expect(ai.calls[0]?.schema).toBe(INTERPRET_SCHEMA);
  });

  it("retries once when the answer does not fit Filters, and sums the usage", async () => {
    for (const invalid of [
      { maxPricePerPerson: 5000 },
      { categories: ["casino"] },
      { keywords: ["spa"], memberId: "123" },
      "not an object",
    ]) {
      const ai = scripted(answer(invalid), answer({ keywords: ["spa"] }));
      expect(await interpretQuery("spa", ai)).toEqual({
        filters: Filters.parse({ keywords: ["spa"] }),
        source: "llm",
        modelCalls: 2,
        usage: { inputTokens: 600, outputTokens: 80 },
      });
    }
  });

  it("retries once after a failed call, then succeeds", async () => {
    const ai = scripted({ ok: false, reason: "timeout" }, answer({ categories: ["dining"] }));
    const result = await interpretQuery("dinner", ai);
    expect(result.source).toBe("llm");
    expect(result.modelCalls).toBe(2);
    expect(result.usage).toEqual(usage);
  });

  it("falls back to keywords after two failures of any kind", async () => {
    const reasons: StructuredFailure[] = [
      "refusal",
      "truncated",
      "invalid_json",
      "unavailable",
      "timeout",
    ];
    for (const reason of reasons) {
      const ai = scripted({ ok: false, reason }, { ok: false, reason });
      expect(await interpretQuery("cheap cinema in Leeds", ai)).toEqual({
        filters: Filters.parse({ keywords: ["cheap", "cinema", "leeds"] }),
        source: "fallback",
        modelCalls: 2,
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    }
  });

  it("counts the usage of failed calls that the model answered", async () => {
    const ai = scripted({ ok: false, reason: "refusal", usage }, answer({ audience: "everyone" }));
    const result = await interpretQuery("something", ai);
    expect(result.source).toBe("fallback");
    expect(result.usage).toEqual({ inputTokens: 600, outputTokens: 80 });
  });
});
