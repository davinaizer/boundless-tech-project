import { Pool } from "pg";
import { z } from "zod";
import { replaceOffers } from "@/data/postgres-search-offers";
import { CATALOGUE_OFFERS } from "@/data/sample-catalogue";

// Loads the fictional sample catalogue into a migrated database, replacing what
// is there. Run with `pnpm db:seed` (tsx with the react-server condition; see
// docs/architecture.md). It does not import src/lib/env.ts, which needs the
// build-time version, so it parses DATABASE_URL itself. Imports the catalogue
// and the adapter module directly, not `@/data`, which chooses an adapter.
const DatabaseUrl = z.url({ protocol: /^postgres(ql)?$/ });

async function main(): Promise<void> {
  const parsed = DatabaseUrl.safeParse(process.env.DATABASE_URL);
  if (!parsed.success) {
    throw new Error("DATABASE_URL must be a postgres:// URL (see .env.example).");
  }
  const pool = new Pool({ connectionString: parsed.data });
  try {
    await replaceOffers(pool, CATALOGUE_OFFERS);
    console.log(`Seeded ${CATALOGUE_OFFERS.length} sample offers.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
