import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemorySearchOffers } from "@/data/in-memory-search-offers";
import { SAMPLE_OFFERS } from "@/data/sample-catalogue";
import { Filters } from "@/domain/filters";
import { estimateSavings } from "@/domain/savings";
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

  // The catalogue includes generated offers (ADR-013), so these assert the
  // hand-written offers are found rather than pinning the whole result.
  it("finds the matching offers from the catalogue", async () => {
    const found = await findOffers(Filters.parse({ categories: ["dining"] }), "2026-10-15");
    expect(found.every((o) => o.category === "dining")).toBe(true);
    expect(found.map((o) => o.id)).toEqual(
      expect.arrayContaining(["offer-005", "offer-006", "offer-007", "offer-008"]),
    );
  });

  it("defaults today to the UK date", async () => {
    // offer-012 expires 2026-08-31 and is valid through that day.
    const ids = async () =>
      (await findOffers(Filters.parse({ keywords: ["clothing"] }))).map((o) => o.id);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-31T22:30:00Z"));
    expect(await ids()).toContain("offer-012");

    // 23:30 UTC on 31 August is already 1 September in London.
    vi.setSystemTime(new Date("2026-08-31T23:30:00Z"));
    expect(await ids()).not.toContain("offer-012");
  });
});

// Phase 1 "done when": search and savings run end to end with no model call.
// Runs on the hand-written offers only, so the hand-checked figures stay exact.
describe("search then savings, no AI", () => {
  it("finds family days out under £30 a head and estimates the saving against each fee", async () => {
    const filters = Filters.parse({
      categories: ["days-out"],
      audience: "family",
      maxPricePerPerson: 30,
    });
    const found = await createInMemorySearchOffers(SAMPLE_OFFERS).search(filters, "2026-10-15");
    // offer-004 is neither for families nor still valid; the rest rank by annual saving.
    expect(found.map((o) => o.id)).toEqual(["offer-001", "offer-003", "offer-002"]);

    const savings = estimateSavings(found);
    // 7.25 x 3 = £21.75, 9 x 2 = £18 (Plus only), 5.50 x 2 = £11.
    expect(savings.offers.map((o) => o.annualSavingPence)).toEqual([2175, 1800, 1100]);
    expect(savings.tiers).toEqual([
      {
        tier: "standard",
        feePence: 4500,
        usableOffers: 2,
        usableSavingPence: 3275,
        marginPence: -1225,
      },
      {
        tier: "plus",
        feePence: 7800,
        usableOffers: 3,
        usableSavingPence: 5075,
        marginPence: -2725,
      },
    ]);
    expect(savings.countedOffers).toBe(3);
    expect(savings.bestAnnualSavingPence).toBe(5075);
  });
});
