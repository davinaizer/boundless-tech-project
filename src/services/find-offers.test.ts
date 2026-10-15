import { afterEach, describe, expect, it, vi } from "vitest";
import { Filters } from "@/domain/filters";
import { findOffers, ukDate } from "./find-offers";

describe("ukDate", () => {
  it("returns the UK calendar date, not the UTC one, during summer time", () => {
    // 23:30 UTC is 00:30 the next day in London while BST is in force.
    expect(ukDate(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
  });

  it("matches the UTC date in winter", () => {
    expect(ukDate(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
  });
});

describe("findOffers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ranks the matching offers from the catalogue", async () => {
    const found = await findOffers(Filters.parse({ categories: ["dining"] }), "2026-10-15");
    expect(found.map((o) => o.id)).toEqual(["offer-005", "offer-006", "offer-007", "offer-008"]);
  });

  it("defaults today to the UK date", async () => {
    // offer-012 expires 2026-08-31 and is valid through that day.
    const ids = async () =>
      (await findOffers(Filters.parse({ keywords: ["clothing"] }))).map((o) => o.id);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-31T22:30:00Z"));
    expect(await ids()).toEqual(["offer-012"]);

    // 23:30 UTC on 31 August is already 1 September in London.
    vi.setSystemTime(new Date("2026-08-31T23:30:00Z"));
    expect(await ids()).toEqual([]);
  });
});
