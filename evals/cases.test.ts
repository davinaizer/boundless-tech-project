import { describe, expect, it } from "vitest";
import { UK_REGIONS } from "@/domain/search-offers";
import { EVAL_CASES, ExpectSchema } from "./cases";

describe("EVAL_CASES", () => {
  it("has about 15 cases with unique ids and non-empty queries", () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(15);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length);
    for (const { query } of EVAL_CASES) expect(query.trim()).not.toBe("");
  });

  it("holds only valid expectations, with regions from the catalogue vocabulary", () => {
    for (const { expect: expected } of EVAL_CASES) {
      expect(ExpectSchema.safeParse(expected).success).toBe(true);
      if (expected.region !== undefined) {
        expect(UK_REGIONS).toContain(expected.region);
      }
    }
  });

  it("includes cases that must come back with no invented fields", () => {
    const ids = EVAL_CASES.filter((c) => Object.keys(c.expect).length === 0).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["out-of-schema", "instruction-in-query"]));
  });
});
