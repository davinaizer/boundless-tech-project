import { describe, expect, it } from "vitest";
import { estimateSavings } from "@/domain/savings";
import { SAMPLE_OFFERS } from "@/data/sample-catalogue";
import {
  audienceText,
  formatPence,
  formatPounds,
  formatWholePounds,
  priceText,
  tierSentence,
  tiersToShow,
  tierText,
  validityText,
} from "./format";

describe("formatPence", () => {
  it("shows whole pounds without decimals and others with two", () => {
    expect(formatPence(4500)).toBe("£45");
    expect(formatPence(0)).toBe("£0");
    expect(formatPence(1250)).toBe("£12.50");
    expect(formatPence(5)).toBe("£0.05");
  });

  it("groups thousands", () => {
    expect(formatPence(206421)).toBe("£2,064.21");
    expect(formatPence(300000)).toBe("£3,000");
  });

  it("keeps the sign of a negative amount", () => {
    expect(formatPence(-600)).toBe("-£6");
  });

  it("formats pounds through pence, avoiding float noise", () => {
    expect(formatPounds(30)).toBe("£30");
    expect(formatPounds(12.1)).toBe("£12.10");
    expect(formatPounds(0.29)).toBe("£0.29");
  });
});

describe("formatWholePounds", () => {
  it("rounds to whole pounds and groups thousands", () => {
    expect(formatWholePounds(206421)).toBe("£2,064");
    expect(formatWholePounds(18349)).toBe("£183");
    expect(formatWholePounds(18350)).toBe("£184");
    expect(formatWholePounds(0)).toBe("£0");
  });
});

describe("tiersToShow", () => {
  const tier = (name: "standard" | "plus", usableOffers: number) => ({
    tier: name,
    feePence: name === "standard" ? 4500 : 7800,
    usableOffers,
    usableSavingPence: usableOffers * 1000,
    marginPence: usableOffers * 1000 - (name === "standard" ? 4500 : 7800),
  });
  const names = (shown: { tier: string }[]) => shown.map((t) => t.tier);

  it("shows Standard alone when Standard can use every counted offer", () => {
    expect(names(tiersToShow([tier("standard", 3), tier("plus", 3)]))).toEqual(["standard"]);
  });

  it("adds Plus when a counted offer needs it", () => {
    expect(names(tiersToShow([tier("standard", 2), tier("plus", 3)]))).toEqual([
      "standard",
      "plus",
    ]);
  });

  it("still shows Standard when it can use none of the counted offers", () => {
    expect(names(tiersToShow([tier("standard", 0), tier("plus", 3)]))).toEqual([
      "standard",
      "plus",
    ]);
    expect(names(tiersToShow([tier("standard", 0), tier("plus", 0)]))).toEqual(["standard"]);
  });
});

describe("tierSentence", () => {
  const standard = (changes: Partial<Parameters<typeof tierSentence>[0]> = {}) => ({
    tier: "standard" as const,
    feePence: 4500,
    usableOffers: 3,
    usableSavingPence: 18320,
    marginPence: 13820,
    ...changes,
  });

  it("says how much more than the fee the counted offers could save", () => {
    expect(tierSentence(standard(), 3)).toBe(
      "Standard costs £45 a year. These 3 offers could save you about £183, so about £138 more than the fee.",
    );
  });

  it("says less than the fee when the offers do not cover it", () => {
    expect(tierSentence(standard({ usableSavingPence: 2000, marginPence: -2500 }), 3)).toBe(
      "Standard costs £45 a year. These 3 offers could save you about £20, so about £25 less than the fee.",
    );
  });

  it("says about the same when the margin rounds to nothing", () => {
    expect(tierSentence(standard({ usableSavingPence: 4520, marginPence: 20 }), 3)).toContain(
      "so about the same as the fee.",
    );
  });

  it("says how many of the offers the tier includes", () => {
    expect(
      tierSentence(standard({ usableOffers: 2, usableSavingPence: 11300, marginPence: 6800 }), 3),
    ).toBe(
      "Standard costs £45 a year. 2 of these 3 offers are included and could save you about £113, so about £68 more than the fee.",
    );
    expect(
      tierSentence(standard({ usableOffers: 1, usableSavingPence: 5000, marginPence: 500 }), 3),
    ).toContain("1 of these 3 offers is included and could");
  });

  it("handles one offer and none included", () => {
    expect(
      tierSentence(standard({ usableOffers: 1, usableSavingPence: 7000, marginPence: 2500 }), 1),
    ).toBe(
      "Standard costs £45 a year. This offer could save you about £70, so about £25 more than the fee.",
    );
    expect(
      tierSentence(standard({ usableOffers: 0, usableSavingPence: 0, marginPence: -4500 }), 3),
    ).toBe("Standard costs £45 a year. None of these 3 offers are included.");
  });

  it("uses the tier's own name and fee", () => {
    expect(
      tierSentence(
        {
          tier: "plus",
          feePence: 7800,
          usableOffers: 3,
          usableSavingPence: 23000,
          marginPence: 15200,
        },
        3,
      ),
    ).toBe(
      "Plus costs £78 a year. These 3 offers could save you about £230, so about £152 more than the fee.",
    );
  });
});

describe("validityText", () => {
  it("says valid all year with no expiry", () => {
    expect(validityText(undefined)).toBe("Valid all year");
  });

  it("writes the date in full without moving it by time zone", () => {
    expect(validityText("2026-12-31")).toBe("Valid until 31 December 2026");
    expect(validityText("2027-01-01")).toBe("Valid until 1 January 2027");
  });
});

describe("tierText", () => {
  it("writes eligibility in words", () => {
    expect(tierText("standard")).toBe("Included with Standard and Plus");
    expect(tierText("plus")).toBe("Plus membership only");
  });
});

describe("the fee panel's figures", () => {
  it("format the estimate for the sample catalogue without non-finite numbers", () => {
    const savings = estimateSavings(SAMPLE_OFFERS);
    for (const tier of savings.tiers) {
      expect(formatPence(tier.feePence)).toMatch(/^£[\d,]+(\.\d{2})?$/);
      expect(tierSentence(tier, savings.countedOffers)).not.toMatch(/NaN|undefined/);
    }
  });
});

describe("priceText", () => {
  it("says Free for no price and a head otherwise", () => {
    expect(priceText(0)).toBe("Free");
    expect(priceText(12)).toBe("£12 a head");
    expect(priceText(12.5)).toBe("£12.50 a head");
  });
});

describe("audienceText", () => {
  it("reads all three as Anyone, whatever the order", () => {
    expect(audienceText(["family", "solo", "couple"])).toBe("Anyone");
  });

  it("lists fewer in a fixed order, sentence case", () => {
    expect(audienceText(["solo"])).toBe("Solo");
    expect(audienceText(["family"])).toBe("Families");
    expect(audienceText(["family", "couple"])).toBe("Couples and families");
    expect(audienceText(["family", "solo"])).toBe("Solo and families");
  });
});
