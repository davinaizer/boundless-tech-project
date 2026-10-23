# ADR-016: Show the AI provider, model and data adapter publicly

- **Status:** Accepted
- **Date:** 2026-10-23
- **Decision owner:** Davi

## Context

Facts:
- The app has two stand-ins for real services: the mock provider and the in-memory adapter ([ADR-007](007-test-strategy.md), [ADR-010](010-postgres-data-layer.md)). Each is chosen by an environment variable, and a missing or wrong value falls back silently.
- `source: "llm"` in the response and in the log does not tell the real model from the mock, because the mock's canned answers also report `llm`. Before this change nothing in the log, in `/api/health` or in the UI said which provider or adapter a running server used.
- The page is static ([ADR-014](014-filters-in-the-url.md)), so anything read from the environment when the page is built can differ from what the server runs on.

Assumption: the provider name, the model ID and the adapter name are not sensitive. The model is named in the README and ADR-005, and the adapter is named in the README.

## Options considered

1. **Log only.** The runtime line and the request fields go to stdout. Nothing is public, but checking a deployed app needs access to the host's logs.
2. **Show it in production behind a flag.** Safe by default, but a deploy that forgets the flag shows nothing, which is the situation this change is meant to expose.
3. **Always show it** on `/api/health` and in a collapsed bar at the bottom of the page.

## Decision

**Option 3, with the log as well.**

- Every request log line carries `provider`, `model` and `adapter`, and the first request of a process writes one `runtime` line with those and the configuration (`nodeEnv`, versions, timeout, rate limit, whether a key is set, never the key).
- `GET /api/health` returns `ai: { provider, model }` and `data: { adapter }` beside the version. Both are read from `env`: no model call, no database connection.
- A collapsed bar at the bottom of the page shows the same two values as badges (green for the real service, amber for a stand-in, always with the word) and the version. It fetches `/api/health` when the page loads rather than taking props from the layout, so it shows the running server, not the build.
- Never exposed: the key, `DATABASE_URL` or any part of it, query text and filter values (those stay out of logs, [architecture](../architecture.md)).
- The "Read by AI" note stays as it is under the mock; the bar and the log carry the distinction.

## Consequences

- Easier: after a deploy, one `curl` or one glance at the page answers whether the real model and database are in use.
- Harder: one extra small request when a page loads, and a visitor can read which model and adapter the demo uses.
- The same bar is where a development-only request inspector can be added later (Phase 5.1, task 2); that needs its own decision because it shows query text.

## Weakest assumption

That the configuration is not sensitive. It would stop being true if the model, a provider account or a database host became something to keep private, or if the adapter name hinted at an unpatched service. Then the bar and the health fields would move behind development, and the log would remain.

## Evidence

- `src/lib/ai/index.ts` (`describeAi`), `src/data/index.ts` (`describeData`), `src/app/api/health/route.ts`, `src/app/_components/DebugPanel.tsx`.
- Contrast of the badges: [DESIGN.md](../../DESIGN.md).
