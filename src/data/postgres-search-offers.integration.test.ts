import { Pool } from "pg";
import { afterAll } from "vitest";
import { describeSearchOffersContract } from "@/domain/search-offers.contract";
import { env } from "@/lib/env";
import { createPostgresSearchOffers, replaceOffers } from "./postgres-search-offers";

// DATABASE_URL is the test database, set by vitest.integration.config.mts.
// Needs `pnpm db:up`; a stopped database fails the run rather than skipping it.
if (env.DATABASE_URL === undefined)
  throw new Error("DATABASE_URL is not set for integration tests.");

const pool = new Pool({ connectionString: env.DATABASE_URL });
afterAll(() => pool.end());

describeSearchOffersContract("Postgres adapter", async (offers) => {
  await replaceOffers(pool, offers);
  return createPostgresSearchOffers(pool);
});
