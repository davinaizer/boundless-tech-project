import { describe, expect, it } from "vitest";
import { Category, Offer, tierCanUse } from "./offer";

const valid = {
  id: "offer-001",
  title: "Sample garden day pass",
  partner: "Fictional Gardens Ltd",
  category: "days-out",
  tier: "standard",
  region: "South East",
  audience: ["family", "couple"],
  typicalPricePerPerson: 12.5,
  typicalSavingPerUse: 4.5,
  assumedUsesPerYear: 3,
};

describe("Category", () => {
  it("accepts the closed set and rejects anything else", () => {
    for (const value of ["days-out", "dining", "shopping", "travel", "motoring", "events"]) {
      expect(Category.safeParse(value).success).toBe(true);
    }
    expect(Category.safeParse("gift-memberships").success).toBe(false);
  });
});

describe("Offer", () => {
  it("parses a complete offer without an expiry date", () => {
    const result = Offer.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.expiryDate).toBeUndefined();
  });

  it("parses an offer with an ISO expiry date", () => {
    expect(Offer.parse({ ...valid, expiryDate: "2027-03-31" }).expiryDate).toBe("2027-03-31");
  });

  it("rejects a malformed expiry date", () => {
    for (const expiryDate of ["31/03/2027", "2027-13-01", "2027-03-31T10:00:00Z"]) {
      expect(Offer.safeParse({ ...valid, expiryDate }).success).toBe(false);
    }
  });

  it("rejects negative or over-precise money", () => {
    expect(Offer.safeParse({ ...valid, typicalPricePerPerson: -1 }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, typicalSavingPerUse: 1.005 }).success).toBe(false);
  });

  it("accepts ordinary two-decimal amounts despite floating point", () => {
    for (const typicalSavingPerUse of [0.07, 0.1, 19.99, 45, 78.01]) {
      expect(Offer.safeParse({ ...valid, typicalSavingPerUse }).success).toBe(true);
    }
  });

  it("accepts a zero price (free entry)", () => {
    expect(Offer.safeParse({ ...valid, typicalPricePerPerson: 0 }).success).toBe(true);
  });

  it("requires a non-empty audience list of known values", () => {
    expect(Offer.safeParse({ ...valid, audience: [] }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, audience: ["group"] }).success).toBe(false);
  });

  it("rejects an unknown category, tier, empty id and unknown key", () => {
    expect(Offer.safeParse({ ...valid, category: "gifts" }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, tier: "gold" }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, id: "" }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, extra: true }).success).toBe(false);
  });

  it("requires whole, non-negative assumed uses per year", () => {
    expect(Offer.safeParse({ ...valid, assumedUsesPerYear: 1.5 }).success).toBe(false);
    expect(Offer.safeParse({ ...valid, assumedUsesPerYear: -1 }).success).toBe(false);
  });
});

describe("tierCanUse", () => {
  it("lets Standard members use Standard offers only, and Plus members use all", () => {
    expect(tierCanUse("standard", "standard")).toBe(true);
    expect(tierCanUse("standard", "plus")).toBe(false);
    expect(tierCanUse("plus", "standard")).toBe(true);
    expect(tierCanUse("plus", "plus")).toBe(true);
  });
});
