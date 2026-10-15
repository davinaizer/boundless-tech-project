import { defineConfig, devices } from "@playwright/test";

// A dedicated port, so a dev server on 3000 (possibly with the real model) is never
// reused. The app is built and started rather than run with `next dev`: the e2e then
// sees what ships, and without the dev double-mount of effects.
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    // The mock provider and the in-memory adapter (ADR-007, ADR-010), set here so
    // a key or a database URL in the shell or in .env.local cannot reach the run.
    // Empty means unset to env.ts, and a value in the process environment wins over
    // .env.local.
    env: { AI_PROVIDER: "mock", ANTHROPIC_API_KEY: "", DATABASE_URL: "" },
  },
});
