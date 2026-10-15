import { describe, expect, it } from "vitest";
import { FILTER_LIMITS, Filters } from "@/domain/filters";
import { filtersFromSearch, filtersToSearch } from "./filters-url";

const full = Filters.parse({
  categories: ["days-out", "dining"],
  region: "Yorkshire and The Humber",
  maxPricePerPerson: 12.5,
  audience: "family",
  tier: "plus",
  keywords: ["spa", "cinema & more"],
});

describe("filtersToSearch", () => {
  it("is empty for empty filters", () => {
    expect(filtersToSearch(Filters.parse({}))).toBe("");
  });

  it("writes every field, repeating the list fields, and encodes values", () => {
    const search = filtersToSearch(full);
    expect(search).toContain("category=days-out&category=dining");
    expect(search).toContain("region=Yorkshire+and+The+Humber");
    expect(search).toContain("maxPrice=12.5");
    expect(search).toContain("audience=family");
    expect(search).toContain("tier=plus");
    expect(search).toContain("keyword=cinema+%26+more");
  });
});

describe("filtersFromSearch", () => {
  it("round-trips filters", () => {
    expect(filtersFromSearch(filtersToSearch(full))).toEqual(full);
    for (const filters of [
      Filters.parse({ categories: ["travel"] }),
      Filters.parse({ region: "London" }),
      Filters.parse({ maxPricePerPerson: 0 }),
      Filters.parse({ keywords: ["a b"] }),
    ]) {
      expect(filtersFromSearch(filtersToSearch(filters))).toEqual(filters);
    }
  });

  it("accepts a leading question mark", () => {
    expect(filtersFromSearch("?category=dining")?.categories).toEqual(["dining"]);
  });

  it("returns null when no filter is present", () => {
    for (const search of ["", "?", "?utm_source=x", "?category=casino", "?maxPrice=abc"]) {
      expect(filtersFromSearch(search)).toBeNull();
    }
  });

  it("drops invalid values and keeps the valid ones", () => {
    const filters = filtersFromSearch(
      "category=casino&category=dining&maxPrice=-5&audience=everyone&tier=plus&region=London",
    );
    expect(filters).toEqual(
      Filters.parse({ categories: ["dining"], tier: "plus", region: "London" }),
    );
  });

  it("rejects out-of-range and non-finite prices", () => {
    for (const price of ["5000", "-1", "NaN", "Infinity", ""]) {
      expect(
        filtersFromSearch(`region=London&maxPrice=${price}`)?.maxPricePerPerson,
      ).toBeUndefined();
    }
  });

  it("caps keywords and drops over-long ones", () => {
    const many = Array.from({ length: 20 }, (_, i) => `keyword=k${i}`).join("&");
    expect(filtersFromSearch(many)?.keywords).toHaveLength(FILTER_LIMITS.maxKeywords);
    const long = "x".repeat(FILTER_LIMITS.maxKeywordLength + 1);
    expect(filtersFromSearch(`keyword=${long}&keyword=spa`)?.keywords).toEqual(["spa"]);
  });

  it("uses the first value of a repeated single-value parameter", () => {
    expect(filtersFromSearch("region=London&region=Wales")?.region).toBe("London");
  });

  it("ignores markup and keeps it as plain text", () => {
    const filters = filtersFromSearch("keyword=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(filters?.keywords).toEqual(
      ["<script>alert(1)</script>"].filter((k) => k.length <= FILTER_LIMITS.maxKeywordLength),
    );
  });
});
