import { describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { addFilter, filterChips, removeChip } from "./chips";

const filters = Filters.parse({
  categories: ["days-out", "dining"],
  audience: "family",
  region: "South East",
  maxPricePerPerson: 30,
  tier: "plus",
  keywords: ["spa"],
});

describe("filterChips", () => {
  it("has no chips for empty filters", () => {
    expect(filterChips(Filters.parse({}))).toEqual([]);
  });

  it("writes each set field as a labelled chip, in a stable order", () => {
    expect(filterChips(filters).map((c) => `${c.label}: ${c.value}`)).toEqual([
      "Category: Days out",
      "Category: Dining",
      "Who: Family",
      "Where: South East",
      "Price: up to £30 each",
      "Membership: Plus",
      "Keyword: spa",
    ]);
  });

  it("gives every chip a distinct id", () => {
    const ids = filterChips(filters).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("removeChip", () => {
  it("removes one category and leaves the rest", () => {
    const chip = filterChips(filters).find((c) => c.id === "category:dining")!;
    expect(removeChip(filters, chip).categories).toEqual(["days-out"]);
  });

  it("clears a single-value field", () => {
    for (const [id, key] of [
      ["audience", "audience"],
      ["region", "region"],
      ["price", "maxPricePerPerson"],
      ["tier", "tier"],
    ] as const) {
      const chip = filterChips(filters).find((c) => c.id === id)!;
      expect(removeChip(filters, chip)[key]).toBeUndefined();
    }
  });

  it("removes a keyword", () => {
    const chip = filterChips(filters).find((c) => c.id === "keyword:spa")!;
    expect(removeChip(filters, chip).keywords).toEqual([]);
  });

  it("does not change the original filters", () => {
    const chip = filterChips(filters)[0]!;
    removeChip(filters, chip);
    expect(filters.categories).toEqual(["days-out", "dining"]);
  });
});

describe("addFilter", () => {
  it("adds to the list fields and de-duplicates", () => {
    expect(addFilter(filters, { field: "category", value: "travel" })?.categories).toEqual([
      "days-out",
      "dining",
      "travel",
    ]);
    expect(addFilter(filters, { field: "category", value: "dining" })?.categories).toEqual([
      "days-out",
      "dining",
    ]);
    expect(addFilter(filters, { field: "keyword", value: "SPA" })?.keywords).toEqual(["spa"]);
  });

  it("replaces the single-value fields", () => {
    expect(addFilter(filters, { field: "region", value: "London" })?.region).toBe("London");
    expect(addFilter(filters, { field: "price", value: 20 })?.maxPricePerPerson).toBe(20);
    expect(addFilter(filters, { field: "tier", value: "standard" })?.tier).toBe("standard");
    expect(addFilter(filters, { field: "audience", value: "solo" })?.audience).toBe("solo");
  });

  it("returns null for a value the schema rejects", () => {
    expect(addFilter(filters, { field: "price", value: 5000 })).toBeNull();
    expect(addFilter(filters, { field: "price", value: -1 })).toBeNull();
    expect(addFilter(filters, { field: "keyword", value: "   " })).toBeNull();
  });
});
