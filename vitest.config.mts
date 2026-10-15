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
    env: { NEXT_PUBLIC_APP_VERSION: "v0.0.0+test" },
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    passWithNoTests: true,
  },
});
