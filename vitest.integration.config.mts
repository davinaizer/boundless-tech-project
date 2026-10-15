import { defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";

// Integration tests against the local database. Files share one table, so they
// run one at a time.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["src/**/*.integration.test.ts"],
    exclude: [],
    fileParallelism: false,
  },
});
