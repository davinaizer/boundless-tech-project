import { Pool } from "pg";
import { afterAll, it } from "vitest";
import { describeSearchOffersContract } from "@/domain/search-offers.contract";
import { env } from "@/lib/env";
import { createPostgresSearchOffers, replaceOffers } from "./postgres-search-offers";

// Needs a migrated database: `pnpm db:up`, then `pnpm test:integration`.
if (env.DATABASE_URL === undefined) {
  it.skip("Postgres contract suite (DATABASE_URL is not set)", () => {});
} else {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  afterAll(() => pool.end());

  describeSearchOffersContract("Postgres adapter", async (offers) => {
    await replaceOffers(pool, offers);
    return createPostgresSearchOffers(pool);
  });
}
