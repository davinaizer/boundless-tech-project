import { describe, expect, it } from "vitest";
import { Audience, Category, Offer, Tier } from "@/domain/offer";
import { SAMPLE_OFFERS } from "./sample-catalogue";

// A fixed date, so the expiry coverage does not depend on the wall clock.
const REFERENCE_DATE = "2026-10-15";

const distinct = <T>(values: T[]) => new Set(values);

describe("SAMPLE_OFFERS", () => {
  it("contains only valid offers", () => {
    for (const offer of SAMPLE_OFFERS) {
      expect(Offer.safeParse(offer).success, offer.id).toBe(true);
    }
  });

  it("has unique ids and unique partner names", () => {
    expect(distinct(SAMPLE_OFFERS.map((o) => o.id)).size).toBe(SAMPLE_OFFERS.length);
    expect(distinct(SAMPLE_OFFERS.map((o) => o.partner)).size).toBe(SAMPLE_OFFERS.length);
  });

  it("covers every category with at least three offers", () => {
    for (const category of Category.options) {
      const count = SAMPLE_OFFERS.filter((o) => o.category === category).length;
      expect(count, category).toBeGreaterThanOrEqual(3);
    }
  });

  it("covers both tiers, every audience and at least three regions", () => {
    expect(distinct(SAMPLE_OFFERS.map((o) => o.tier))).toEqual(new Set(Tier.options));
    expect(distinct(SAMPLE_OFFERS.flatMap((o) => o.audience))).toEqual(new Set(Audience.options));
    expect(distinct(SAMPLE_OFFERS.map((o) => o.region)).size).toBeGreaterThanOrEqual(3);
  });

  it("includes multi-audience offers and a free offer", () => {
    expect(SAMPLE_OFFERS.some((o) => o.audience.length > 1)).toBe(true);
    expect(SAMPLE_OFFERS.some((o) => o.typicalPricePerPerson === 0)).toBe(true);
  });

  it("mixes expired, future-dated and undated offers", () => {
    // ISO dates compare correctly as strings.
    const expired = SAMPLE_OFFERS.filter((o) => o.expiryDate && o.expiryDate < REFERENCE_DATE);
    const future = SAMPLE_OFFERS.filter((o) => o.expiryDate && o.expiryDate >= REFERENCE_DATE);
    const undated = SAMPLE_OFFERS.filter((o) => !o.expiryDate);
    expect(expired.length).toBeGreaterThanOrEqual(2);
    expect(future.length).toBeGreaterThanOrEqual(3);
    expect(undated.length).toBeGreaterThanOrEqual(3);
  });
});
