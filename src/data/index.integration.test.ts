import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Filters } from "@/domain/filters";
import { env } from "@/lib/env";
import { getSearchOffers } from "./index";
import { replaceOffers } from "./postgres-search-offers";
import { SAMPLE_OFFERS } from "./sample-catalogue";

// DATABASE_URL is the test database (vitest.integration.config.mts), so
// getSearchOffers must choose Postgres. The in-memory adapter never touches the
// database, so finding the rows loaded here proves which adapter was chosen.
if (env.DATABASE_URL === undefined)
  throw new Error("DATABASE_URL is not set for integration tests.");

const pool = new Pool({ connectionString: env.DATABASE_URL });
afterAll(() => pool.end());

// Not in the sample catalogue, so only the Postgres adapter can return it.
const POSTGRES_ONLY = { ...SAMPLE_OFFERS[0]!, id: "offer-postgres-only" };

describe("getSearchOffers with DATABASE_URL set", () => {
  beforeAll(() => replaceOffers(pool, [...SAMPLE_OFFERS.slice(0, 2), POSTGRES_ONLY]));

  it("searches Postgres", async () => {
    const found = await getSearchOffers().search(Filters.parse({}), "2026-10-15");
    expect(found.map((o) => o.id).toSorted()).toEqual([
      ...SAMPLE_OFFERS.slice(0, 2).map((o) => o.id),
      POSTGRES_ONLY.id,
    ]);
  });

  it("looks offers up by id in Postgres", async () => {
    expect(await getSearchOffers().getByIds([POSTGRES_ONLY.id])).toEqual([POSTGRES_ONLY]);
  });
});
