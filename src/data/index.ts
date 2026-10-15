import "server-only";
import { Pool } from "pg";
import type { SearchOffers } from "@/domain/search-offers";
import { env } from "@/lib/env";
import { createInMemorySearchOffers } from "./in-memory-search-offers";
import { createPostgresSearchOffers } from "./postgres-search-offers";
import { CATALOGUE_OFFERS } from "./sample-catalogue";

function createSearchOffers(): SearchOffers {
  if (env.DATABASE_URL === undefined) return createInMemorySearchOffers(CATALOGUE_OFFERS);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  // An idle connection can fail (a hosted database sleeping, a restart). Without
  // a listener that error would crash the process; the pool replaces the client.
  pool.on("error", (error) => console.error(`Postgres pool error: ${error.message}`));
  return createPostgresSearchOffers(pool);
}

let searchOffers: SearchOffers | undefined;

// The one place an adapter is chosen; nothing else constructs one (ADR-010):
// Postgres when DATABASE_URL is set, the in-memory catalogue otherwise. Built on
// first use and reused, so the process holds one pool.
export function getSearchOffers(): SearchOffers {
  searchOffers ??= createSearchOffers();
  return searchOffers;
}
