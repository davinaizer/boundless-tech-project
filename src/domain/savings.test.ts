import { describe, expect, it } from "vitest";
import type { Offer } from "./offer";
import {
  MEMBERSHIP_FEES_PENCE,
  SAVINGS_BASIS_COUNT,
  SavingsEstimate,
  estimateSavings,
} from "./savings";

const offer = (id: string, overrides: Partial<Offer> = {}): Offer => ({
  id,
  title: "Plain title",
  partner: "Plain partner",
  category: "days-out",
  tier: "standard",
  region: "London",
  audience: ["family"],
  typicalPricePerPerson: 10,
  typicalSavingPerUse: 1,
  assumedUsesPerYear: 1,
  ...overrides,
});

const tier = (estimate: SavingsEstimate, name: "standard" | "plus") =>
  estimate.tiers.find((t) => t.tier === name)!;

describe("MEMBERSHIP_FEES_PENCE", () => {
  it("holds the published annual fees", () => {
    expect(MEMBERSHIP_FEES_PENCE).toEqual({ standard: 4500, plus: 7800 });
  });
});

describe("estimateSavings", () => {
  // The worked example in docs/design/benefits-finder-mockup-boundless.png.
  const mockup = [
    offer("aquarium", { typicalSavingPerUse: 12, assumedUsesPerYear: 2 }),
    offer("train", { typicalSavingPerUse: 9, assumedUsesPerYear: 3 }),
    offer("gardens", { tier: "plus", typicalSavingPerUse: 16, assumedUsesPerYear: 2 }),
  ];

  it("works out each offer's yearly saving", () => {
    expect(estimateSavings(mockup).offers).toEqual([
      { offerId: "aquarium", savingPerUsePence: 1200, usesPerYear: 2, annualSavingPence: 2400 },
      { offerId: "train", savingPerUsePence: 900, usesPerYear: 3, annualSavingPence: 2700 },
      { offerId: "gardens", savingPerUsePence: 1600, usesPerYear: 2, annualSavingPence: 3200 },
    ]);
  });

  it("totals what each tier can use against its fee", () => {
    const estimate = estimateSavings(mockup);
    expect(estimate.tiers).toEqual([
      {
        tier: "standard",
        feePence: 4500,
        usableOffers: 2,
        usableSavingPence: 5100,
        marginPence: 600,
      },
      { tier: "plus", feePence: 7800, usableOffers: 3, usableSavingPence: 8300, marginPence: 500 },
    ]);
    expect(estimate.bestAnnualSavingPence).toBe(8300);
    expect(estimate.countedOffers).toBe(3);
  });

  describe("the basis", () => {
    // Ranked best first: only the first three feed the totals.
    const ranked = [
      offer("a", { typicalSavingPerUse: 10, assumedUsesPerYear: 1 }),
      offer("b", { typicalSavingPerUse: 20, assumedUsesPerYear: 1 }),
      offer("c", { tier: "plus", typicalSavingPerUse: 30, assumedUsesPerYear: 1 }),
      offer("d", { typicalSavingPerUse: 400, assumedUsesPerYear: 10 }),
      offer("e", { tier: "plus", typicalSavingPerUse: 500, assumedUsesPerYear: 10 }),
    ];

    it("counts only the first few offers in the totals and the badge", () => {
      const estimate = estimateSavings(ranked);
      expect(SAVINGS_BASIS_COUNT).toBe(3);
      expect(estimate.countedOffers).toBe(3);
      expect(tier(estimate, "standard")).toMatchObject({
        usableOffers: 2,
        usableSavingPence: 3000,
      });
      expect(tier(estimate, "plus")).toMatchObject({ usableOffers: 3, usableSavingPence: 6000 });
      expect(estimate.bestAnnualSavingPence).toBe(6000);
    });

    it("still gives every offer its own line, for the per-use tags on the cards", () => {
      const estimate = estimateSavings(ranked);
      expect(estimate.offers.map((o) => o.offerId)).toEqual(["a", "b", "c", "d", "e"]);
      expect(estimate.offers[4]!.annualSavingPence).toBe(500000);
    });

    it("counts every offer when there are fewer than the basis", () => {
      const estimate = estimateSavings(ranked.slice(0, 2));
      expect(estimate.countedOffers).toBe(2);
      expect(tier(estimate, "plus").usableSavingPence).toBe(3000);
    });

    it("takes the basis as a parameter", () => {
      const estimate = estimateSavings(ranked, 1);
      expect(estimate.countedOffers).toBe(1);
      expect(estimate.bestAnnualSavingPence).toBe(1000);
    });
  });

  it("counts a Plus-only offer for Plus and not for Standard", () => {
    const estimate = estimateSavings([offer("p", { tier: "plus", typicalSavingPerUse: 5 })]);
    expect(tier(estimate, "standard").usableSavingPence).toBe(0);
    expect(tier(estimate, "plus").usableSavingPence).toBe(500);
  });

  it("reports a negative margin when the offers do not cover the fee", () => {
    const estimate = estimateSavings([
      offer("a", { typicalSavingPerUse: 10, assumedUsesPerYear: 2 }),
    ]);
    expect(tier(estimate, "standard").marginPence).toBe(-2500);
    expect(tier(estimate, "plus").marginPence).toBe(-5800);
  });

  it("returns zero totals for an empty list", () => {
    const estimate = estimateSavings([]);
    expect(estimate.offers).toEqual([]);
    expect(estimate.countedOffers).toBe(0);
    expect(estimate.tiers.map((t) => [t.usableSavingPence, t.marginPence])).toEqual([
      [0, -4500],
      [0, -7800],
    ]);
    expect(estimate.bestAnnualSavingPence).toBe(0);
  });

  it("counts a free saving or zero uses as nothing", () => {
    const estimate = estimateSavings([
      offer("a", { typicalSavingPerUse: 0, assumedUsesPerYear: 4 }),
      offer("b", { typicalSavingPerUse: 3, assumedUsesPerYear: 0 }),
    ]);
    expect(estimate.bestAnnualSavingPence).toBe(0);
  });

  it("is exact in pence where pounds would drift", () => {
    // 0.07 * 3 is 0.21000000000000002 in floating point.
    const estimate = estimateSavings([
      offer("a", { typicalSavingPerUse: 0.07, assumedUsesPerYear: 3 }),
    ]);
    expect(estimate.offers[0]!.annualSavingPence).toBe(21);
  });

  it("returns a value that satisfies its own schema", () => {
    expect(SavingsEstimate.parse(estimateSavings(mockup))).toEqual(estimateSavings(mockup));
  });
});

describe("SavingsEstimate", () => {
  const valid = estimateSavings([offer("a", { typicalSavingPerUse: 2 })]);
  const withTier = (changes: Record<string, unknown>) => ({
    ...valid,
    tiers: [{ ...valid.tiers[0], ...changes }, valid.tiers[1]],
  });

  it("rejects fractional pence", () => {
    expect(SavingsEstimate.safeParse(withTier({ marginPence: -4299.5 })).success).toBe(false);
    expect(SavingsEstimate.safeParse({ ...valid, bestAnnualSavingPence: 200.1 }).success).toBe(
      false,
    );
  });

  it("rejects a negative fee or usable total, while allowing a negative margin", () => {
    expect(SavingsEstimate.safeParse(withTier({ feePence: -1 })).success).toBe(false);
    expect(SavingsEstimate.safeParse(withTier({ usableSavingPence: -1 })).success).toBe(false);
    expect(SavingsEstimate.safeParse(withTier({ marginPence: -4300 })).success).toBe(true);
  });

  it("rejects an unknown tier and unknown keys", () => {
    expect(SavingsEstimate.safeParse(withTier({ tier: "gold" })).success).toBe(false);
    expect(SavingsEstimate.safeParse({ ...valid, total: 1 }).success).toBe(false);
  });
});
