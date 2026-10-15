import { describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { getSearchOffers } from "./index";
import { SAMPLE_OFFERS } from "./sample-catalogue";

describe("getSearchOffers", () => {
  it("searches the sample catalogue, hiding the expired offers", async () => {
    const found = await getSearchOffers().search(Filters.parse({}), "2026-10-15");
    expect(found).toHaveLength(21);
    for (const id of ["offer-004", "offer-012", "offer-020"]) {
      expect(found.map((o) => o.id)).not.toContain(id);
    }
  });

  it("looks offers up by id from the same catalogue", async () => {
    const [first] = SAMPLE_OFFERS;
    expect(await getSearchOffers().getByIds([first!.id])).toEqual([first]);
  });
});
