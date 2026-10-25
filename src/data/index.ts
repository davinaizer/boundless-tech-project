import "server-only";
import { Pool } from "pg";
import type { Offer } from "@/domain/offer";
import type { SearchOffers } from "@/domain/search-offers";
import { cut, isDebugEnabled, recordCall } from "@/lib/debug-store";
import { env } from "@/lib/env";
import { createInMemorySearchOffers } from "./in-memory-search-offers";
import { createPostgresSearchOffers } from "./postgres-search-offers";
import { CATALOGUE_OFFERS } from "./sample-catalogue";

// What the running server uses, for the log and the health check. Read from env
// only: it opens no connection, so asking never touches the database.
export function describeData(): { adapter: "postgres" | "in-memory" } {
  return { adapter: env.DATABASE_URL === undefined ? "in-memory" : "postgres" };
}

function createSearchOffers(): SearchOffers {
  if (env.DATABASE_URL === undefined) return createInMemorySearchOffers(CATALOGUE_OFFERS);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  // An idle connection can fail (a hosted database sleeping, a restart). Without
  // a listener that error would crash the process; the pool replaces the client.
  pool.on("error", (error) => console.error(`Postgres pool error: ${error.message}`));
  return createPostgresSearchOffers(pool);
}

// In development each call is recorded for the request inspector (ADR-017).
// Results and errors pass through unchanged.
function withDebug(port: SearchOffers): SearchOffers {
  async function timed(
    method: "search" | "getByIds",
    input: unknown,
    run: () => Promise<Offer[]>,
  ): Promise<Offer[]> {
    const started = performance.now();
    const ms = () => Math.round(performance.now() - started);
    try {
      const rows = await run();
      recordCall({ kind: "data", ms: ms(), method, input: cut(input), rows: rows.length });
      return rows;
    } catch (error) {
      const name = error instanceof Error ? error.name : "unknown";
      recordCall({ kind: "data", ms: ms(), method, input: cut(input), rows: 0, error: name });
      throw error;
    }
  }
  return {
    search: (filters, today) =>
      timed("search", { filters, today }, () => port.search(filters, today)),
    getByIds: (ids) => timed("getByIds", ids, () => port.getByIds(ids)),
  };
}

let searchOffers: SearchOffers | undefined;

// The one place an adapter is chosen; nothing else constructs one (ADR-010):
// Postgres when DATABASE_URL is set, the in-memory catalogue otherwise. Built on
// first use and reused, so the process holds one pool.
export function getSearchOffers(): SearchOffers {
  searchOffers ??= isDebugEnabled() ? withDebug(createSearchOffers()) : createSearchOffers();
  return searchOffers;
}
