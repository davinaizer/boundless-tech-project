import { describe, expect, it } from "vitest";
import { Filters } from "./filters";
import { MAX_EXPLANATION_LENGTH, describeMatch, groundExplanations } from "./match-reasons";
import type { Offer } from "./offer";

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "offer-x",
  title: "Two-course lunch for two",
  partner: "Larder Row",
  category: "dining",
  tier: "standard",
  region: "London",
  audience: ["couple"],
  typicalPricePerPerson: 16,
  typicalSavingPerUse: 5,
  assumedUsesPerYear: 4,
  ...overrides,
});

describe("describeMatch", () => {
  it("names only the category when no filter is set", () => {
    expect(describeMatch(offer(), Filters.parse({}))).toBe("Dining offer");
  });

  it("mentions each filter that is set and nothing else", () => {
    const filters = Filters.parse({
      region: "London",
      audience: "couple",
      maxPricePerPerson: 20,
      tier: "plus",
      keywords: ["lunch", "cinema"],
    });
    expect(describeMatch(offer(), filters)).toBe(
      'Dining offer, in London, for couples, £16 per person, within your £20 budget, included with your Plus membership, matches "lunch"',
    );
  });

  it("says UK-wide for a UK-wide offer under a region filter", () => {
    const filters = Filters.parse({ region: "Wales" });
    expect(describeMatch(offer({ region: "UK-wide" }), filters)).toBe(
      "Dining offer, available UK-wide",
    );
  });

  it("formats pence and free offers", () => {
    const filters = Filters.parse({ maxPricePerPerson: 10.5 });
    expect(describeMatch(offer({ typicalPricePerPerson: 4.2 }), filters)).toContain(
      "£4.20 per person, within your £10.50 budget",
    );
    expect(describeMatch(offer({ typicalPricePerPerson: 0 }), filters)).toContain(
      "free (within your £10.50 budget)",
    );
  });

  it("matches keywords case-insensitively in the partner name too", () => {
    const filters = Filters.parse({ keywords: ["LARDER"] });
    expect(describeMatch(offer(), filters)).toBe('Dining offer, matches "LARDER"');
  });
});

describe("groundExplanations", () => {
  const sent = ["offer-1", "offer-2"];
  const entry = (offerId: string, text: string) => ({ offerId, text });

  it("accepts entries for offers that were sent, and trims the text", () => {
    expect(
      groundExplanations(
        { explanations: [entry("offer-1", "  A fit for a family day out.  ")] },
        sent,
      ),
    ).toEqual({ ok: true, explanations: [entry("offer-1", "A fit for a family day out.")] });
  });

  it("accepts an answer that leaves an offer without a line", () => {
    const result = groundExplanations({ explanations: [entry("offer-2", "Close to you.")] }, sent);
    expect(result).toEqual({ ok: true, explanations: [entry("offer-2", "Close to you.")] });
  });

  it("rejects the whole answer for an ID that was not sent", () => {
    const answer = { explanations: [entry("offer-1", "Fine."), entry("offer-9", "Invented.")] };
    expect(groundExplanations(answer, sent)).toEqual({ ok: false, rule: "unknown_id" });
  });

  it("rejects a repeated ID", () => {
    const answer = { explanations: [entry("offer-1", "One."), entry("offer-1", "Again.")] };
    expect(groundExplanations(answer, sent)).toEqual({ ok: false, rule: "duplicate_id" });
  });

  it("rejects empty, whitespace and over-long text", () => {
    for (const text of ["", "   "]) {
      expect(groundExplanations({ explanations: [entry("offer-1", text)] }, sent)).toEqual({
        ok: false,
        rule: "empty_line",
      });
    }
    const over = "x".repeat(MAX_EXPLANATION_LENGTH + 1);
    expect(groundExplanations({ explanations: [entry("offer-1", over)] }, sent)).toEqual({
      ok: false,
      rule: "too_long",
    });
    const atLimit = "x".repeat(MAX_EXPLANATION_LENGTH);
    expect(groundExplanations({ explanations: [entry("offer-1", atLimit)] }, sent).ok).toBe(true);
  });

  it("rejects text with a numeric character, a pound sign or a percent sign", () => {
    for (const text of [
      "Save £5 here.",
      "Half price, 50% off.",
      "Two for 1.",
      "About 20 pounds.",
      "½ price today.",
      "Booked ５ times.",
    ]) {
      expect(groundExplanations({ explanations: [entry("offer-1", text)] }, sent)).toEqual({
        ok: false,
        rule: "number_or_symbol",
      });
    }
  });

  it("rejects data that does not have the expected shape", () => {
    for (const raw of [
      null,
      "text",
      {},
      { explanations: "no" },
      { explanations: [{ offerId: "offer-1" }] },
    ]) {
      expect(groundExplanations(raw, sent)).toEqual({ ok: false, rule: "invalid_shape" });
    }
    expect(groundExplanations({ explanations: [], extra: true }, sent)).toEqual({
      ok: false,
      rule: "invalid_shape",
    });
  });
});
