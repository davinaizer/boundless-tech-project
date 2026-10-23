import { afterEach, describe, expect, it, vi } from "vitest";
import { Filters } from "@/domain/filters";
import { describeData, getSearchOffers } from "./index";
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

describe("describeData", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/env");
    vi.resetModules();
  });

  it("reports the in-memory adapter when DATABASE_URL is unset", () => {
    expect(describeData()).toEqual({ adapter: "in-memory" });
  });

  it("reports postgres when DATABASE_URL is set, without opening a connection", async () => {
    vi.doMock("@/lib/env", () => ({ env: { DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" } }));
    const { describeData: describe } = await import("./index");
    expect(describe()).toEqual({ adapter: "postgres" });
  });
});
