import { describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { scoreCase } from "./score";

const filters = (value: unknown) => Filters.parse(value);

describe("scoreCase", () => {
  it("passes a result that matches every named field", () => {
    const actual = filters({
      categories: ["dining", "days-out"],
      region: "london",
      maxPricePerPerson: 20,
      audience: "couple",
      tier: "plus",
      keywords: ["Pizza"],
    });
    const verdict = scoreCase(
      {
        categories: ["days-out", "dining"],
        region: "London",
        maxPricePerPerson: 20,
        audience: "couple",
        tier: "plus",
        keywordsInclude: ["pizza"],
      },
      actual,
    );
    expect(verdict).toEqual({ pass: true });
  });

  it("fails a wrong value and says which field", () => {
    const verdict = scoreCase({ region: "Wales" }, filters({ region: "Scotland" }));
    expect(verdict).toEqual({
      pass: false,
      reasons: ["region: expected Wales, got Scotland"],
    });
  });

  it("fails a field that was expected but is missing", () => {
    const verdict = scoreCase({ maxPricePerPerson: 15 }, filters({}));
    expect(verdict).toEqual({
      pass: false,
      reasons: ["maxPricePerPerson: expected 15, got absent"],
    });
  });

  it("fails a field the model invented", () => {
    const verdict = scoreCase({}, filters({ tier: "plus", categories: ["travel"] }));
    expect(verdict.pass).toBe(false);
    expect(verdict).toMatchObject({
      reasons: ["categories: expected [], got [travel]", "tier: expected absent, got plus"],
    });
  });

  it("allows extra keywords but requires the named ones", () => {
    const actual = filters({ keywords: ["cinema", "tickets"] });
    expect(scoreCase({ keywordsInclude: ["cinema"] }, actual)).toEqual({ pass: true });
    expect(scoreCase({}, actual)).toEqual({ pass: true });
    expect(scoreCase({ keywordsInclude: ["spa"] }, actual)).toMatchObject({ pass: false });
  });

  it("compares categories as a set, so the order does not matter", () => {
    const actual = filters({ categories: ["events", "dining"] });
    expect(scoreCase({ categories: ["dining", "events"] }, actual)).toEqual({ pass: true });
    expect(scoreCase({ categories: ["dining"] }, actual)).toMatchObject({ pass: false });
  });
});
