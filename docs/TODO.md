# Work plan

Phases are small and reversible. Each ends with a review gate before the next starts. Budget: the original plan was 8 hours including setup and documentation; it is now about 10h30 (see the time log and [ADR-010](adr/010-postgres-data-layer.md), [ADR-011](adr/011-local-first-delivery.md)). Record actual time in the table at the end.

## Phase 0: Setup and governance (1h20)

- [x] Scaffold Next.js (App Router), TypeScript strict, Tailwind
- [x] Oxlint, Oxfmt ([ADR-012](adr/012-oxc-lint-and-format.md)), Vitest, `pnpm check` (typecheck, lint, format check, unit tests)
- [ ] Playwright config and `pnpm e2e`, once there is a spec and the mock provider to run it against (split from the item above)
- [x] GitHub Actions: `pnpm check` and `pnpm build` on push and pull request (not yet run on GitHub; e2e job added with the Playwright item)
- [ ] `compose.yaml` for local Postgres with a fully qualified image; confirm the `podman compose` provider works on the author's machine and the Postgres major version ([ADR-011](adr/011-local-first-delivery.md)); fall back to `podman run` scripts if not. `pnpm db:up` and `db:down`; `.env.example` with dev-only values
- [x] Add the plan, implement, review and complete task skills (adapted from an earlier project)
- [ ] `GET /api/health` returning status and version
- [ ] App version string `v<package>+<build>.<short sha>` computed at build time; build number from the git commit count, falling back to `dev`
- [ ] `.gitignore` cleaned for this stack
- [ ] Oxlint `no-restricted-imports` boundaries (confirm per-folder overrides and a `process.env` restriction work, [ADR-012](adr/012-oxc-lint-and-format.md)) and `server-only` handling in the Vitest setup ([ADR-009](adr/009-nextjs-conventions.md))

**Done when:** CI is green on an empty app and `pnpm db:up` starts a local database.

## Phase 1: Domain, data and search (3h30)

- [ ] `src/lib/env.ts`: Zod-parsed environment, the only reader of `process.env` ([ADR-009](adr/009-nextjs-conventions.md)); needed first for `DATABASE_URL`
- [ ] Types and Zod schemas: `Offer`, `Filters`, `Category`
- [ ] Fictional sample catalogue, labelled, across the public categories, with tier and optional expiry date (expired hidden by default)
- [ ] Decide the open `SearchOffers` behaviours (ranking, tier rule, category any-of or all-of, region matching, price handling, keyword fields) in the plan, and write them as the contract test suite ([architecture](architecture.md#searchoffers-port))
- [ ] `SearchOffers` port (interface in `src/domain`) and in-memory adapter in `src/data`; `findOffers` service; one adapter-selection point
- [ ] Decide how `scripts/` reads `server-only` modules (the seed script) and where migrations live
- [ ] Postgres: schema, SQL migrations and seed script for the same fictional catalogue; Postgres adapter with parameterised queries; choose the driver and migration tool in the plan ([ADR-010](adr/010-postgres-data-layer.md))
- [ ] `pnpm db:migrate` and `pnpm db:seed` scripts
- [ ] One contract test suite run against both adapters; `pnpm test:integration` against the local database
- [ ] GitHub Actions integration job with a Postgres service container
- [ ] Adapter chosen by `DATABASE_URL` (Postgres when set, in-memory otherwise)
- [ ] `estimateSavings` and fee constants
- [ ] Unit tests for schema, search and savings

**Done when:** tests pass on both adapters, in CI and locally, and search and savings run with no AI. If this is not met in time, unset `DATABASE_URL` and continue on the in-memory adapter.

## Phase 2: AI layer (2h15)

- [ ] `lib/ai` client for Claude Haiku 5.5 with structured output; mock provider
- [ ] `PROMPT_VERSION` constant, recorded in eval output
- [ ] Timeout on model calls (set in config, a heuristic tuned from logged latency); a timeout counts as a failed attempt
- [ ] `interpretQuery` with Zod re-validation, one retry, keyword fallback, no call on empty input
- [ ] `explainResults` with grounding check
- [ ] Eval set of about 15 queries and an on-demand script
- [ ] Service tests with the mocked client, including a timeout

**Done when:** service tests pass and the eval has been run once and its result recorded.

## Phase 3: API and UI (1h55)

- [ ] Route Handlers: interpret, search, explain
- [ ] UI: query box, editable chips, results, savings, loading, empty and error states
- [ ] Accessibility basics: labels, focus order, contrast, keyboard use of chips
- [ ] Filters serialised into the URL query string; decide server or client reading (server `searchParams` makes the route dynamic) and record it in ADR-009 follow-up
- [ ] Scaffold defaults kept (`create-next-app` 16.4.1): `cacheComponents: true` and `partialPrefetching: true`, so dynamic reads such as `searchParams` need `<Suspense>`. Revert is removing the two lines in `next.config.ts`. Phase 3 confirms or reverts when it records the server or client filter-reading decision ([ADR-009](adr/009-nextjs-conventions.md) rule 13)
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`
- [ ] Input cap, and a content-type and body-size check before parsing (the rate limit moves to the optional deploy phase)
- [ ] One error shape from all endpoints, `{ error: { code, message, requestId } }`, with codes defined in `src/domain` and mapped to UI error states; no internals in messages ([architecture](architecture.md))
- [ ] One structured JSON log line per request (no query text); version shown in the UI footer

**Done when:** a query works end to end locally with the real model and with the mock.

## Phase 4: e2e (0.5h)

- [ ] Playwright: search happy path; edit-a-chip happy path

**Done when:** e2e passes in CI against the in-memory adapter and the mock provider.

## Phase 5: Documentation and demo (1h)

- [ ] README: replace every *pending* marker (status, setup with both run paths: in-memory with the mock provider, and Postgres via Podman; trade-offs and improvements)
- [ ] "Context and assumptions" and "what I would do at the company" in the README
- [ ] Record the demo (Loom or similar) from the local run, with the real model; this is the guaranteed deliverable
- [ ] Check ADRs, architecture and the roadmap are current
- [ ] Tag `v0.1.0` at submission

**Done when:** a new reader can set up, run and understand the decisions from the README.

## Phase 6: Optional deploy (about 0.75h, outside the total)

Gate: Phases 0 to 5 complete and the demo recorded ([ADR-011](adr/011-local-first-delivery.md)).

- [ ] Check pnpm detection on Netlify, database connectivity from a function, and the commit variable for the version string; use Vercel and record the reason if Netlify does not work
- [ ] Confirm the pinned Next.js version and `proxy.ts` use against the Netlify adapter docs ([ADR-009](adr/009-nextjs-conventions.md) rule 15). Read 2026-10-15 for the scaffold pin (`next@16.4.1`): the page says the adapter supports 13.5 onward, is tested with every new stable release, and lists Cache Components and Turbopack as fully supported. It names no 16.x version and does not mention `proxy.ts`, so 16.4.1 is not verified on Netlify until the deploy spike.
- [ ] Rate limit (best effort) and provider spend limit ([ADR-006](adr/006-demo-protection.md))
- [ ] Deploy; smoke test against `/api/health`; add the link to the README

## Optional, only if time allows

- [ ] Slides in Markdown
- [ ] Netlify and Vercel parity check (only if deployed)
- [ ] OpenAPI: generate `openapi.json` from the Zod schemas (see [roadmap](roadmap.md); check Zod version support first)

## Below the line (documented, not built)

Analytics, API versioning, tracing and dashboards, readiness checks that call the model, scalability work. Trade-offs in [roadmap.md](roadmap.md).

## Time log

| Phase | Planned | Actual |
|---|---|---|
| 0 | 1h20 | |
| 1 | 3h30 | |
| 2 | 2h15 | |
| 3 | 1h55 | |
| 4 | 0.5h | |
| 5 | 1h | |
| 6 (optional) | 0.75h | |

Planned total, phases 0 to 5, is about 10h30. The first plan was 8h. The roadmap additions added about 45 minutes, ADR-010 and ADR-011 added about 1h20 net (the Postgres adapter and container about 2h, less the Netlify spike and the rate limit moved to Phase 6), and the model timeout and error shape added about 25 minutes. All figures are estimates, not measurements. Slides are outside this total. The ADR-009 items added to phases 0, 2 and 3 are small and not re-estimated (an unmeasured guess is about 15 minutes in total).
