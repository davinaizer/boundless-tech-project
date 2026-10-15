import { runner } from "node-pg-migrate";
import type { TestProject } from "vitest/node";

// Brings the test database up to date before any integration test runs, using
// the same migrations and tracking table as `pnpm db:migrate`.
export default async function setup(project: TestProject): Promise<void> {
  const databaseUrl = project.config.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("The integration config must set DATABASE_URL.");
  await runner({
    databaseUrl,
    dir: "db/migrations",
    direction: "up",
    migrationsTable: "pgmigrations",
    log: () => {},
  });
}
