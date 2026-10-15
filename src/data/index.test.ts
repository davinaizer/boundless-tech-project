import { describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { getSearchOffers } from "./index";
import { CATALOGUE_OFFERS, SAMPLE_OFFERS } from "./sample-catalogue";

describe("getSearchOffers", () => {
  it("searches the whole catalogue, hiding the expired offers", async () => {
    const today = "2026-10-15";
    const found = await getSearchOffers().search(Filters.parse({}), today);
    const valid = CATALOGUE_OFFERS.filter((o) => !o.expiryDate || o.expiryDate >= today);
    expect(found).toHaveLength(valid.length);
    expect(valid.length).toBeLessThan(CATALOGUE_OFFERS.length);
    for (const id of ["offer-004", "offer-012", "offer-020"]) {
      expect(found.map((o) => o.id)).not.toContain(id);
    }
  });

  it("returns one adapter for the process", () => {
    expect(getSearchOffers()).toBe(getSearchOffers());
  });

  it("looks offers up by id from the same catalogue", async () => {
    const [first] = SAMPLE_OFFERS;
    expect(await getSearchOffers().getByIds([first!.id])).toEqual([first]);
  });
});
