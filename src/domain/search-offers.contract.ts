import { describe, expect, it } from "vitest";
import { Filters } from "./filters";
import type { Offer } from "./offer";
import { UK_WIDE_REGION, type SearchOffers } from "./search-offers";

// Builds an adapter holding exactly these offers. The in-memory adapter wraps
// the list; the Postgres adapter resets the table and inserts them.
export type CreateSearchOffers = (offers: readonly Offer[]) => Promise<SearchOffers>;

const TODAY = "2026-10-15";

// Neutral defaults, so a test only sets the field it is about. The title and
// partner contain none of the keywords used below.
const base: Omit<Offer, "id"> = {
  title: "Plain title",
  partner: "Plain partner",
  category: "days-out",
  tier: "standard",
  region: "London",
  audience: ["solo"],
  typicalPricePerPerson: 10,
  typicalSavingPerUse: 1,
  assumedUsesPerYear: 1,
};

const offer = (id: string, overrides: Partial<Offer> = {}): Offer => ({
  ...base,
  id,
  ...overrides,
});
const idsOf = (offers: readonly Offer[]) => offers.map((o) => o.id);
const filters = (input: Record<string, unknown> = {}) => Filters.parse(input);

// The behaviours are the table in docs/architecture.md (SearchOffers port).
export function describeSearchOffersContract(name: string, create: CreateSearchOffers): void {
  const search = async (
    offers: readonly Offer[],
    input: Record<string, unknown> = {},
    today: string = TODAY,
  ) => idsOf(await (await create(offers)).search(filters(input), today));

  describe(`SearchOffers contract: ${name}`, () => {
    describe("search", () => {
      it("returns offers unchanged, with or without an expiry date", async () => {
        const offers = [
          offer("a"),
          offer("b", { expiryDate: "2027-01-31", audience: ["couple", "family"] }),
        ];
        const port = await create(offers);
        expect(await port.search(filters(), TODAY)).toEqual(offers);
      });

      it("returns an empty list, not an error, when nothing matches", async () => {
        expect(await search([offer("a")], { region: "Scotland" })).toEqual([]);
        expect(await search([], {})).toEqual([]);
      });

      it("treats absent and empty filters as no constraint", async () => {
        const offers = [offer("a"), offer("b", { category: "dining" })];
        expect(await search(offers, {})).toEqual(["a", "b"]);
        expect(await search(offers, { categories: [], keywords: [] })).toEqual(["a", "b"]);
      });

      it("requires every supplied filter to match", async () => {
        const offers = [
          offer("a", { category: "dining", region: "London" }),
          offer("b", { category: "dining", region: "Wales" }),
          offer("c", { category: "travel", region: "London" }),
        ];
        expect(await search(offers, { categories: ["dining"], region: "London" })).toEqual(["a"]);
      });

      describe("categories", () => {
        it("matches any of the listed categories", async () => {
          const offers = [
            offer("a", { category: "days-out" }),
            offer("b", { category: "dining" }),
            offer("c", { category: "travel" }),
          ];
          expect(await search(offers, { categories: ["days-out", "dining"] })).toEqual(["a", "b"]);
        });
      });

      describe("tier", () => {
        const offers = [offer("a", { tier: "standard" }), offer("b", { tier: "plus" })];

        it("standard returns Standard offers only", async () => {
          expect(await search(offers, { tier: "standard" })).toEqual(["a"]);
        });

        it("plus returns Standard and Plus offers", async () => {
          expect(await search(offers, { tier: "plus" })).toEqual(["a", "b"]);
        });

        it("absent returns every tier", async () => {
          expect(await search(offers, {})).toEqual(["a", "b"]);
        });
      });

      describe("audience", () => {
        it("matches when the offer's audience list contains the value", async () => {
          const offers = [
            offer("a", { audience: ["solo"] }),
            offer("b", { audience: ["couple", "family"] }),
            offer("c", { audience: ["family"] }),
          ];
          expect(await search(offers, { audience: "family" })).toEqual(["b", "c"]);
        });
      });

      describe("region", () => {
        it("matches case-insensitively", async () => {
          const offers = [offer("a", { region: "South East" }), offer("b", { region: "Wales" })];
          expect(await search(offers, { region: "south EAST" })).toEqual(["a"]);
        });

        it("ignores surrounding whitespace in the filter", async () => {
          expect(await search([offer("a", { region: "Wales" })], { region: "  Wales " })).toEqual([
            "a",
          ]);
        });

        it("does not match on a substring", async () => {
          const offers = [offer("a", { region: "South East" })];
          expect(await search(offers, { region: "South" })).toEqual([]);
          expect(await search(offers, { region: "South East England" })).toEqual([]);
        });

        it("matches UK-wide offers for any region", async () => {
          const offers = [
            offer("a", { region: UK_WIDE_REGION }),
            offer("b", { region: "Wales" }),
            offer("c", { region: "Scotland" }),
          ];
          expect(await search(offers, { region: "Wales" })).toEqual(["a", "b"]);
          expect(await search(offers, { region: "Nowhere" })).toEqual(["a"]);
        });
      });

      describe("maxPricePerPerson", () => {
        it("is inclusive", async () => {
          const offers = [
            offer("a", { typicalPricePerPerson: 9.99 }),
            offer("b", { typicalPricePerPerson: 10 }),
            offer("c", { typicalPricePerPerson: 10.01 }),
          ];
          expect(await search(offers, { maxPricePerPerson: 10 })).toEqual(["a", "b"]);
        });

        it("lets a free offer pass every limit, including 0", async () => {
          const offers = [
            offer("a", { typicalPricePerPerson: 0 }),
            offer("b", { typicalPricePerPerson: 5 }),
          ];
          expect(await search(offers, { maxPricePerPerson: 0 })).toEqual(["a"]);
          expect(await search(offers, { maxPricePerPerson: 1 })).toEqual(["a"]);
        });
      });

      describe("keywords", () => {
        const offers = [
          offer("a", { title: "Garden day pass" }),
          offer("b", { partner: "Orchard Garden Co" }),
          offer("c", { title: "Cinema ticket", region: "Garden City", category: "events" }),
          offer("d", { title: "Kids workshop" }),
        ];

        it("matches case-insensitively as a substring of title or partner", async () => {
          expect(await search(offers, { keywords: ["GARD"] })).toEqual(["a", "b"]);
        });

        it("matches any of the keywords", async () => {
          expect(await search(offers, { keywords: ["garden", "workshop"] })).toEqual([
            "a",
            "b",
            "d",
          ]);
        });

        it("does not search region or category", async () => {
          expect(await search(offers, { keywords: ["city"] })).toEqual([]);
          expect(await search(offers, { keywords: ["events"] })).toEqual([]);
        });
      });

      describe("expiry", () => {
        const offers = [
          offer("a", { expiryDate: "2026-10-14" }),
          offer("b", { expiryDate: "2026-10-15" }),
          offer("c", { expiryDate: "2026-10-16" }),
          offer("d"),
        ];

        it("hides offers whose expiry date is before today", async () => {
          expect(await search(offers, {})).toEqual(["b", "c", "d"]);
        });

        it("keeps an offer valid through its expiry date", async () => {
          expect(await search([offers[1]], {})).toEqual(["b"]);
        });

        it("reads today from the argument, not a clock", async () => {
          expect(await search(offers, {}, "2026-10-16")).toEqual(["c", "d"]);
          expect(await search(offers, {}, "2020-01-01")).toEqual(["a", "b", "c", "d"]);
        });
      });

      describe("ranking", () => {
        it("puts more keyword matches first, ahead of annual saving", async () => {
          const offers = [
            offer("a", { title: "Garden pass", typicalSavingPerUse: 50 }),
            offer("b", { title: "Garden kids pass", typicalSavingPerUse: 1 }),
          ];
          expect(await search(offers, { keywords: ["garden", "kids"] })).toEqual(["b", "a"]);
        });

        it("orders by estimated annual saving, higher first", async () => {
          const offers = [
            offer("a", { typicalSavingPerUse: 5, assumedUsesPerYear: 1 }),
            offer("b", { typicalSavingPerUse: 1, assumedUsesPerYear: 10 }),
            offer("c", { typicalSavingPerUse: 2, assumedUsesPerYear: 2 }),
          ];
          expect(await search(offers, {})).toEqual(["b", "a", "c"]);
        });

        it("breaks ties by id ascending, whatever the input order", async () => {
          const offers = [offer("c"), offer("a"), offer("b")];
          expect(await search(offers, {})).toEqual(["a", "b", "c"]);
        });

        it("compares annual saving in whole pence, so float noise cannot break a tie", async () => {
          // 0.07 * 3 is 0.21000000000000002 in floating point; both are 21p a year.
          const offers = [
            offer("z", { typicalSavingPerUse: 0.07, assumedUsesPerYear: 3 }),
            offer("a", { typicalSavingPerUse: 0.21, assumedUsesPerYear: 1 }),
          ];
          expect(await search(offers, {})).toEqual(["a", "z"]);
        });
      });
    });

    describe("getByIds", () => {
      it("returns known offers ordered by id, whatever the request order", async () => {
        const port = await create([offer("a"), offer("b"), offer("c")]);
        expect(idsOf(await port.getByIds(["c", "a"]))).toEqual(["a", "c"]);
      });

      it("omits unknown ids and returns each offer once", async () => {
        const port = await create([offer("a"), offer("b")]);
        expect(idsOf(await port.getByIds(["b", "missing", "b"]))).toEqual(["b"]);
      });

      it("returns an empty list for an empty request", async () => {
        const port = await create([offer("a")]);
        expect(await port.getByIds([])).toEqual([]);
      });

      it("still returns expired offers", async () => {
        const expired = offer("a", { expiryDate: "2000-01-01" });
        const port = await create([expired]);
        expect(await port.getByIds(["a"])).toEqual([expired]);
      });
    });
  });
}
