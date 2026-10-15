import { describe, expect, it } from "vitest";
import { Filters, FILTER_LIMITS } from "./filters";

describe("Filters", () => {
  it("parses an empty object to empty lists and no other constraint", () => {
    expect(Filters.parse({})).toEqual({ categories: [], keywords: [] });
  });

  it("parses a complete filter object", () => {
    const input = {
      categories: ["days-out", "dining"],
      region: "London",
      maxPricePerPerson: 20,
      audience: "family",
      tier: "plus",
      keywords: ["garden", "kids"],
    };
    expect(Filters.parse(input)).toEqual(input);
  });

  it("de-duplicates categories", () => {
    expect(Filters.parse({ categories: ["travel", "travel", "dining"] }).categories).toEqual([
      "travel",
      "dining",
    ]);
  });

  it("rejects unknown keys", () => {
    expect(Filters.safeParse({ colour: "red" }).success).toBe(false);
  });

  it("rejects unknown enum values", () => {
    expect(Filters.safeParse({ categories: ["gifts"] }).success).toBe(false);
    expect(Filters.safeParse({ audience: "group" }).success).toBe(false);
    expect(Filters.safeParse({ tier: "gold" }).success).toBe(false);
  });

  it("enforces the price range", () => {
    expect(Filters.safeParse({ maxPricePerPerson: -1 }).success).toBe(false);
    expect(Filters.safeParse({ maxPricePerPerson: FILTER_LIMITS.maxPrice + 1 }).success).toBe(
      false,
    );
    expect(Filters.safeParse({ maxPricePerPerson: 0 }).success).toBe(true);
  });

  it("bounds keywords and region", () => {
    const tooMany = Array.from({ length: FILTER_LIMITS.maxKeywords + 1 }, (_, i) => `k${i}`);
    expect(Filters.safeParse({ keywords: tooMany }).success).toBe(false);
    expect(
      Filters.safeParse({ keywords: ["x".repeat(FILTER_LIMITS.maxKeywordLength + 1)] }).success,
    ).toBe(false);
    expect(
      Filters.safeParse({ region: "x".repeat(FILTER_LIMITS.maxRegionLength + 1) }).success,
    ).toBe(false);
  });

  it("rejects empty or blank keywords and region", () => {
    expect(Filters.safeParse({ keywords: ["  "] }).success).toBe(false);
    expect(Filters.safeParse({ region: "" }).success).toBe(false);
  });
});
