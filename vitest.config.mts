import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` path in tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws outside a React Server Components build.
      "server-only": fileURLToPath(new URL("./vitest/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    // env.ts parses at import time; tests get a fixed value instead of the build-time one.
    // DATABASE_URL is blanked (env.ts reads "" as unset) so a URL exported in the
    // shell cannot move unit tests onto Postgres; the integration config sets it.
    // The AI variables are blanked the same way, so unit tests always get the mock.
    env: {
      NEXT_PUBLIC_APP_VERSION: "v0.0.0+test",
      DATABASE_URL: "",
      AI_PROVIDER: "",
      ANTHROPIC_API_KEY: "",
      AI_TIMEOUT_MS: "",
      MAX_QUERY_CHARS: "",
      MAX_BODY_BYTES: "",
    },
    include: ["src/**/*.test.ts", "evals/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    passWithNoTests: true,
  },
});
