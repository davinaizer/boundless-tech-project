# ADR-017: A development-only request inspector that shows query text

- **Status:** Accepted
- **Date:** 2026-10-23
- **Decision owner:** Davi

Amends, for development only, the rule in [architecture](../architecture.md) and the [roadmap](../roadmap.md) that query text, filter values and error messages are never logged. That rule is unchanged for stdout and for production.

## Context

Facts:
- The request log line holds counts, timings, outcomes and the provider, never the query or filters. That is enough to see that something failed, not why: which filters the model returned, what prompt it was sent, what came back from the catalogue.
- [ADR-016](016-expose-runtime-config.md) added a bar at the bottom of the page that reads `/api/health`.
- `next dev` sets `NODE_ENV=development`; `next build` and `next start`, and so Netlify and the e2e run, set `production`.

Assumption: in development the only person typing queries is the developer, so showing them back to that developer is not a data-protection question.

## Options considered

1. **Keep the rule; debug with breakpoints and ad hoc logging.** No new risk, but every investigation starts from nothing, and ad hoc logging tends to be committed.
2. **A flag, such as `DEBUG_PAYLOADS=1`, that turns payload logging on.** Flexible, but a flag can be set in production by mistake, and the rule would then depend on configuration.
3. **A development-only inspector, gated in code on `NODE_ENV`.** Bodies and model and data calls are kept in memory and shown in the bar, never written to stdout. Production has no way to turn it on.

## Decision

**Option 3.**

- The gate is `env.NODE_ENV === "development"` in `src/lib/debug-store.ts`, with no flag. Unset `NODE_ENV` reads as `production` ([ADR-016](016-expose-runtime-config.md)'s `env.ts` change), so it fails closed.
- In development the server keeps the last 20 requests in memory: request and response bodies, the log line, and each model call (prompt, the parsed reply or failure reason, tokens, ms) and data call (method, input, rows, ms). Each text field is cut at 4,000 characters. Calls are tied to their request with `AsyncLocalStorage`.
- `GET /api/debug/[requestId]` serves one entry in development and answers 404 otherwise, before reading anything.
- `/api/health` gains `debug`; the bar shows a Requests tab only when it is true. The browser records this page's calls only after that.
- The model reply is the parsed JSON the AI client returns, not the raw text: `src/lib/ai/client.ts` stays the only module that calls the model and is not changed.
- Stdout is unchanged: no query text, in development or production.

## Consequences

- Easier: a developer sees, for one search, what was sent, what the model answered and what the catalogue returned, without adding logging.
- Harder: a second code path in `handleJson`, the AI client and the data adapter, each a no-op outside development. `src/data` and `src/lib/ai` now depend on `src/lib/debug-store`.
- Risk accepted: the buffer lives in server memory in development and holds up to 20 queries until the process restarts.

## Weakest assumption

That development is single-user. A shared development server, or a staging site run with `next dev`, would show one person's queries to another. Then the gate would need a second condition, such as a local-only address, or the inspector would be dropped.

## Evidence

- `src/lib/debug-store.ts`, `src/app/api/debug/[requestId]/route.ts`, `src/app/_components/RequestsView.tsx`.
- Unit tests that nothing is recorded or served under `production` and `test`; an e2e test on the production build that the debug route answers 404 and the Requests tab is absent.
