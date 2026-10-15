import { describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { describeMatch } from "@/domain/match-reasons";
import type { Offer } from "@/domain/offer";
import type { SearchOffers } from "@/domain/search-offers";
import type { StructuredFailure, StructuredResult } from "@/lib/ai";
import { createMockAiClient, type MockResponder } from "@/lib/ai/mock";
import {
  EXPLAIN_SCHEMA,
  MAX_EXPLAINED_OFFERS,
  explainResults,
  EXPLAIN_SYSTEM_PROMPT,
} from "./explain-results";

const usage = { inputTokens: 400, outputTokens: 60 };
const answer = (data: unknown): StructuredResult => ({ ok: true, data, usage });

const offer = (n: number, overrides: Partial<Offer> = {}): Offer => ({
  id: `offer-${String(n).padStart(3, "0")}`,
  title: `Title ${n}`,
  partner: `Partner ${n}`,
  category: "dining",
  tier: "standard",
  region: "London",
  audience: ["couple"],
  typicalPricePerPerson: 12,
  typicalSavingPerUse: 3,
  assumedUsesPerYear: 4,
  ...overrides,
});

// A port holding exactly these offers; getByIds returns known IDs in ID order.
function portWith(offers: readonly Offer[]): SearchOffers {
  return {
    search: () => Promise.reject(new Error("search is not used by explainResults")),
    getByIds: (ids) =>
      Promise.resolve(
        offers.filter((o) => ids.includes(o.id)).sort((a, b) => a.id.localeCompare(b.id)),
      ),
  };
}

function scripted(...results: StructuredResult[]) {
  const queue = [...results];
  const responder: MockResponder = () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra model call");
    return next;
  };
  return createMockAiClient(responder);
}

const filters = Filters.parse({ categories: ["dining"], region: "London" });
const one = offer(1);
const two = offer(2);
const fallback = (o: Offer) => ({
  offerId: o.id,
  text: describeMatch(o, filters),
  source: "fallback" as const,
});
const modelLine = (o: Offer, text: string) => ({ offerId: o.id, text, source: "llm" as const });

describe("explainResults", () => {
  it("makes no model call and loads nothing for an empty ID list", async () => {
    const ai = scripted();
    const result = await explainResults(filters, [], { ai, offers: portWith([one]) });
    expect(result).toEqual({
      explanations: [],
      source: "fallback",
      modelCalls: 0,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    expect(ai.calls).toHaveLength(0);
  });

  it("makes no model call when none of the IDs is known", async () => {
    const ai = scripted();
    const result = await explainResults(filters, ["offer-999"], { ai, offers: portWith([one]) });
    expect(result.explanations).toEqual([]);
    expect(ai.calls).toHaveLength(0);
  });

  it("returns the model's grounded lines, with usage and one call", async () => {
    const ai = scripted(
      answer({
        explanations: [
          { offerId: one.id, text: "Dining in London, as you asked." },
          { offerId: two.id, text: "A London table for two." },
        ],
      }),
    );
    const result = await explainResults(filters, [two.id, one.id], {
      ai,
      offers: portWith([one, two]),
    });
    expect(result).toEqual({
      explanations: [
        modelLine(one, "Dining in London, as you asked."),
        modelLine(two, "A London table for two."),
      ],
      source: "llm",
      modelCalls: 1,
      usage,
    });
  });

  it("fills an offer the model left out with the deterministic line", async () => {
    const ai = scripted(answer({ explanations: [{ offerId: two.id, text: "A London table." }] }));
    const result = await explainResults(filters, [one.id, two.id], {
      ai,
      offers: portWith([one, two]),
    });
    expect(result.source).toBe("llm");
    expect(result.explanations).toEqual([fallback(one), modelLine(two, "A London table.")]);
  });

  it("leaves failure out on success and when no call is made", async () => {
    const ok = scripted(answer({ explanations: [{ offerId: one.id, text: "A London table." }] }));
    const lines = await explainResults(filters, [one.id], { ai: ok, offers: portWith([one]) });
    expect(lines).not.toHaveProperty("failure");
    const none = await explainResults(filters, [], { ai: scripted(), offers: portWith([one]) });
    expect(none).not.toHaveProperty("failure");
  });

  it("rejects the whole answer for an unknown ID, with one call and no retry", async () => {
    const ai = scripted(
      answer({
        explanations: [
          { offerId: one.id, text: "Fine." },
          { offerId: "offer-404", text: "Invented." },
        ],
      }),
    );
    const result = await explainResults(filters, [one.id, two.id], {
      ai,
      offers: portWith([one, two]),
    });
    expect(result).toEqual({
      explanations: [fallback(one), fallback(two)],
      source: "fallback",
      modelCalls: 1,
      usage,
      failure: "ungrounded",
    });
    expect(ai.calls).toHaveLength(1);
  });

  it("rejects text that states a number, a price or a percentage", async () => {
    for (const text of ["Costs £12 each.", "Save 20% here.", "Two for 1 deal."]) {
      const ai = scripted(answer({ explanations: [{ offerId: one.id, text }] }));
      const result = await explainResults(filters, [one.id], { ai, offers: portWith([one]) });
      expect(result.explanations).toEqual([fallback(one)]);
      expect(result.source).toBe("fallback");
      expect(result.failure).toBe("ungrounded");
    }
  });

  it("uses the deterministic lines after any failed call, reporting the reason", async () => {
    const reasons: StructuredFailure[] = [
      "refusal",
      "truncated",
      "invalid_json",
      "unavailable",
      "timeout",
      "rejected",
    ];
    for (const reason of reasons) {
      const ai = scripted({ ok: false, reason });
      const result = await explainResults(filters, [one.id], { ai, offers: portWith([one]) });
      expect(result).toEqual({
        explanations: [fallback(one)],
        source: "fallback",
        modelCalls: 1,
        usage: { inputTokens: 0, outputTokens: 0 },
        failure: reason,
      });
      expect(ai.calls).toHaveLength(1);
    }
  });

  it("counts the usage of a refused call", async () => {
    const ai = scripted({ ok: false, reason: "refusal", usage });
    const result = await explainResults(filters, [one.id], { ai, offers: portWith([one]) });
    expect(result.usage).toEqual(usage);
  });

  it("treats an answer with no lines as a failure", async () => {
    const ai = scripted(answer({ explanations: [] }));
    const result = await explainResults(filters, [one.id], { ai, offers: portWith([one]) });
    expect(result).toMatchObject({ source: "fallback", modelCalls: 1, failure: "ungrounded" });
    expect(result.explanations).toEqual([fallback(one)]);
  });

  it("sends the filters and catalogue fields only, never the saving or expiry terms", async () => {
    const ai = scripted(answer({ explanations: [] }));
    const sample = offer(1, { expiryDate: "2099-01-01" });
    await explainResults(filters, [sample.id], { ai, offers: portWith([sample]) });
    const [call] = ai.calls;
    expect(call?.system).toBe(EXPLAIN_SYSTEM_PROMPT);
    expect(call?.schema).toBe(EXPLAIN_SCHEMA);
    expect(JSON.parse(call?.prompt ?? "")).toEqual({
      filters,
      offers: [
        {
          offerId: sample.id,
          title: sample.title,
          partner: sample.partner,
          category: "dining",
          region: "London",
          audience: ["couple"],
          typicalPricePerPerson: 12,
        },
      ],
    });
  });

  it("explains at most the first MAX_EXPLAINED_OFFERS found, ignoring repeats", async () => {
    const many = Array.from({ length: MAX_EXPLAINED_OFFERS + 5 }, (_, i) => offer(i + 1));
    const ai = scripted(answer({ explanations: [] }));
    const ids = [...many.map((o) => o.id), many[0]!.id];
    const result = await explainResults(filters, ids, { ai, offers: portWith(many) });
    expect(result.explanations.map((e) => e.offerId)).toEqual(
      many.slice(0, MAX_EXPLAINED_OFFERS).map((o) => o.id),
    );
    const sent = JSON.parse(ai.calls[0]?.prompt ?? "") as { offers: unknown[] };
    expect(sent.offers).toHaveLength(MAX_EXPLAINED_OFFERS);
  });
});
