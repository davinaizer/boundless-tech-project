import { defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";

// The `postgres-test` service in compose.yaml, so integration tests never touch
// the dev database. Dev-only values; CI can point TEST_DATABASE_URL elsewhere.
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://benefits:benefits@127.0.0.1:5433/benefits_test";

// Integration tests against the test database, migrated first by the global
// setup. Files share one table, so they run one at a time.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    env: { ...base.test?.env, DATABASE_URL: testDatabaseUrl },
    include: ["src/**/*.integration.test.ts"],
    exclude: [],
    fileParallelism: false,
    globalSetup: ["./vitest/integration-setup.ts"],
  },
});
