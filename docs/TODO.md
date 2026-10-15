# Work plan

Phases are small and reversible. Phases 1 to 4 each end with a phase checkpoint (`review-phase`, run in a fresh session) before the next phase is planned; it checks for architecture drift across tasks. Budget: the original plan was 8 hours including setup and documentation; it is now about 11h10 (see the time log and [ADR-010](adr/010-postgres-data-layer.md), [ADR-011](adr/011-local-first-delivery.md)). Record actual time in the table at the end.

## Phase 0: Setup and governance (1h20)

- [x] Scaffold Next.js (App Router), TypeScript strict, Tailwind
- [x] Oxlint, Oxfmt ([ADR-012](adr/012-oxc-lint-and-format.md)), Vitest, `pnpm check` (typecheck, lint, format check, unit tests)
- [x] GitHub Actions: `pnpm check` and `pnpm build` on push and pull request (first run green, about 28s, reported by the author; e2e job added with the Playwright item)
- [x] `compose.yaml` for local Postgres with a fully qualified image; `pnpm db:up` and `db:down`; `.env.example` with dev-only values. Checked 2026-10-15 ([ADR-011](adr/011-local-first-delivery.md)): `podman compose` 6.1.3 delegates to the `docker-compose` 5.6.0 provider and works; Postgres 18 (`18.6`), the latest major on Docker Hub, chosen because no hosted option is selected yet. The Podman machine must be running (`podman machine start`)
- [x] Add the plan, implement, review and complete task skills (adapted from an earlier project)
- [x] `GET /api/health` returning status and version (request-time via `connection()`)
- [x] App version string `v<package>+<build>.<short sha>` computed at build time in `next.config.ts`; build number from the git commit count, `v<package>+dev` when git is unavailable. CI checks out full history (`fetch-depth: 0`). `src/lib/env.ts` now exists with this one variable and Zod; Phase 1 extends it
- [x] `.gitignore` cleaned for this stack (earlier-project leftovers removed; Playwright output paths are its documented defaults, confirmed when the Playwright item runs)
- [x] Oxlint `no-restricted-imports` boundaries and `server-only` handling in the Vitest setup ([ADR-009](adr/009-nextjs-conventions.md), [ADR-012](adr/012-oxc-lint-and-format.md)). Verified with throwaway fixtures (2026-10-15): per-folder overrides, the domain-imports-nothing rule, the SDK-only-in-`src/lib/ai` rule (`@anthropic-ai/sdk`, confirmed when the client was built) and `process.env` only in `src/lib/env.ts` all fail the lint; overlapping overrides replace each other, so domain repeats the SDK rule. Vitest aliases `server-only` to a stub and `@/` to `src`, and sets `NEXT_PUBLIC_APP_VERSION`

**Done when:** CI is green on an empty app and `pnpm db:up` starts a local database.

## Phase 1: Domain, data and search (3h40)

- [x] `src/lib/env.ts`: Zod-parsed environment, the only reader of `process.env` ([ADR-009](adr/009-nextjs-conventions.md)). Server-only; `parseEnv` is unit-tested; holds `NEXT_PUBLIC_APP_VERSION` and optional `DATABASE_URL`. Each later feature adds its own variable (model provider and key in Phase 2). `scripts/` is outside `src/` and does not import this module
- [x] Types and Zod schemas: `Offer`, `Filters`, `Category` (`src/domain/offer.ts`, `filters.ts`; strict objects, limits are heuristics in `FILTER_LIMITS`; behaviour decisions stay with the contract item)
- [x] Fictional sample catalogue, labelled, across the public categories, with tier and optional expiry date (expired hidden by default) (`src/data/sample-catalogue.ts`: 24 offers, four per category, validated at load; edge cases for the contract tests included; region values are a sample vocabulary until the contract item decides matching; `server-only` per ADR-009, so the seed script's access is decided in its own item)
- [x] Decide the open `SearchOffers` behaviours (ranking, tier rule, category any-of or all-of, region matching, price handling, keyword fields) in the plan, and write them as the contract test suite ([architecture](architecture.md#searchoffers-port)). Rules are in the architecture table; the type-only port (`src/domain/search-offers.ts`, with `search(filters, today)`) and the suite factory (`src/domain/search-offers.contract.ts`, 30 tests) landed here because the suite cannot typecheck without the interface
- [x] In-memory adapter in `src/data` (the first run of the contract suite, all 30 tests green); `findOffers` service supplying `today` (`src/services/find-offers.ts`, `today` defaults to the Europe/London date); one adapter-selection point (`getSearchOffers()` in `src/data/index.ts`, in-memory only until the `DATABASE_URL` item). Repeated keywords are de-duplicated case-insensitively in `Filters`, so each counts once toward ranking
- [x] Decide how `scripts/` reads `server-only` modules (the seed script) and where migrations live. Decision in the [architecture](architecture.md#folder-structure): scripts run with `tsx --conditions=react-server`; migrations are plain SQL in `db/migrations/`. Checked 2026-10-15 on Node 24.16.0 with `tsx@4.20.3` (via `pnpm dlx`, a throwaway probe): without the condition the `server-only` guard throws; with it the catalogue loads all 24 offers. Plain `node` fails on the `@/` paths. `tsx` is added with the first script
- [x] Postgres: schema as a SQL migration, `pnpm db:migrate`, Postgres adapter with parameterised queries, and the contract suite run against it with `pnpm test:integration` against the local database; choose the driver and migration tool in the plan ([ADR-010](adr/010-postgres-data-layer.md)). The seed script moved to the next item so this one could be proved by the contract suite. Built with `pg@8.23.1` and `node-pg-migrate@9.0.0` (`src/data/postgres-search-offers.ts`, `db/migrations/`); all 30 contract tests green against local Postgres 18 on 2026-10-15. `db:migrate` and `test:integration` read `DATABASE_URL` from the shell, not `.env.local`
- [x] Seed script for the same fictional catalogue (reusing `replaceOffers`) and `pnpm db:seed`; integration tests moved to their own database (the `postgres-test` Compose service, migrated by the Vitest global setup) so they never wipe the seeded dev data. Checked 2026-10-15 with `tsx@4.23.15`: seeding twice leaves 24 offers, a dev count after `pnpm test:integration` is still 24, and a missing or non-Postgres `DATABASE_URL` exits 1 with a clear message
- [x] GitHub Actions integration job with a Postgres service container (`integration` job in `ci.yml`, beside `check`: the contract suite via `pnpm test:integration` with `TEST_DATABASE_URL`, then `db:migrate` and `db:seed`). First run green on 2026-10-15: [run 38733112557](https://github.com/davinaizer/boundless-tech-project/actions/runs/38733112557), 30 tests passed, 24 offers seeded
- [x] Adapter chosen by `DATABASE_URL` (Postgres when set, in-memory otherwise). `getSearchOffers()` builds the adapter once per process (one pool, with an `error` listener); unit tests blank `DATABASE_URL`, so a shell value cannot reach them. `src/data/index.integration.test.ts` proves the Postgres choice with an offer that exists only in the database (both tests fail if in-memory is forced). Not yet exercised by a running route (Phase 3)
- [x] `estimateSavings` and fee constants (`src/domain/savings.ts`: `MEMBERSHIP_FEES_PENCE` from the public site as of 2026-10-14; per-offer yearly saving, per-tier usable total and margin, and the "up to" figure, all in whole pence; `SavingsEstimate` Zod schema for the search response). 9 unit tests, including the mockup's worked example
- [x] Unit tests for schema, search and savings. Mostly written by the items above; this item audited them and filled two gaps. Schema: `offer.test.ts` (10), `filters.test.ts` (9), `SavingsEstimate` rejections in `savings.test.ts` (3). Search: the contract suite (30, on both adapters), `index.test.ts`, `find-offers.test.ts`, `sample-catalogue.test.ts`. Savings: `savings.test.ts` (9). The Phase 1 no-AI path, search then savings on the sample catalogue with hand-checked figures, is one test in `find-offers.test.ts`. 81 unit tests in all
- [x] Phase checkpoint: run `review-phase` in a fresh session (about 10 min); resolve each drift item by fixing the code, fixing the document or writing a superseding ADR. Run 2026-10-15: DRIFT, five items, all fixed in code or docs (no ADR needed) in `c3dcc6b`: the domain import rule now also blocks bare `@/data`-style barrels; the tier rule is shared as `tierCanUse` in `src/domain/offer.ts` (the SQL keeps its own copy, guarded by the contract suite); architecture moved built proposals under "Decided in Phase 1", corrected layer dependencies and expiry wording, and recorded the Europe/London `today`; README layout lists `estimateSavings`

**Done when:** tests pass on both adapters, in CI and locally, and search and savings run with no AI. If this is not met in time, unset `DATABASE_URL` and continue on the in-memory adapter.

## Phase 2: AI layer (2h25)

- [x] `lib/ai` client for Claude Haiku 5.5 with structured output; mock provider. Built with `@anthropic-ai/sdk@0.133.0` (`src/lib/ai/`: `client.ts`, `mock.ts`, `types.ts`, `index.ts`). One structured-output call with a caller-supplied JSON schema, returning `unknown` data for the service to re-validate, token usage, and a failure reason (`refusal`, `truncated`, `invalid_json`, `unavailable`) from `stop_reason` and SDK errors. Effort `low` with adaptive thinking (a heuristic, tuned by the eval); SDK retries off (`maxRetries: 0`) so the services own the one retry; credential, host and log level pinned so ambient `ANTHROPIC_*` variables cannot change them (`ANTHROPIC_CUSTOM_HEADERS` is still read; the SDK has no option to stop it). `getAiClient()` picks the provider from `AI_PROVIDER` (`mock` by default; `anthropic` needs `ANTHROPIC_API_KEY`); the mock plays scripted results and, unscripted, answers like an unreachable model. 18 unit tests. One live call checked 2026-10-15 with a simplified schema: schema-valid JSON, 326 input and 48 output tokens, about 2 to 3 s (two samples, not a latency measure)
- [x] `PROMPT_VERSION` constant (`src/services/prompt-version.ts`, `2026-10-15.1`): one version for both prompts, bumped on any change to a system prompt, a model-facing JSON schema, or effort, thinking or max tokens ([architecture](architecture.md#folder-structure)). Narrowed at planning: the eval and the request log record it when they are built
- [x] Timeout on model calls (set in config, a heuristic tuned from logged latency); a timeout counts as a failed attempt. `AI_TIMEOUT_MS` in `env.ts`, default 8000, at most 60000 (Node turns an oversized timer into 1 ms). The client combines its own `AbortSignal.timeout` with the caller's signal, so the limit covers the whole call, and returns the new failure reason `timeout`; a caller abort stays `unavailable`. Live check 2026-10-15: a 1 ms limit gave `timeout` in 30 ms; 8000 ms gave valid JSON in about 3.2 s (one sample each)
- [x] `interpretQuery` with Zod re-validation, one retry, keyword fallback, no call on empty input (`src/services/interpret-query.ts`, 12 unit tests with the mock client). Any failed attempt, including an answer `Filters` rejects, is retried once (the same call repeated, so 1 or 2 calls; the endpoint table and roadmap log line now say so); the fallback is keywords only (stop words and words under three letters dropped). The result carries `source`, model calls and summed token usage for the log line. The query cap stays with the route (Phase 3). Live check 2026-10-15: five queries run through `findOffers`, all `llm` with one call; the first runs led to two prompt fixes (category hints follow the catalogue, no generic or adjective keywords). A smoke test, not the eval
- [ ] `explainResults` with grounding check
- [ ] Eval set of about 15 queries and an on-demand script; each run records `PROMPT_VERSION`
- [ ] Service tests with the mocked client, including a timeout
- [ ] Phase checkpoint: run `review-phase` in a fresh session (about 10 min); resolve each drift item by fixing the code, fixing the document or writing a superseding ADR

**Done when:** service tests pass and the eval has been run once and its result recorded.

## Phase 3: API and UI (2h05)

- [ ] Route Handlers: interpret, search, explain
- [ ] UI: query box, editable chips, results, savings, loading, empty and error states
- [ ] Accessibility basics: labels, focus order, contrast, keyboard use of chips
- [ ] Filters serialised into the URL query string; decide server or client reading (server `searchParams` makes the route dynamic) and record it in ADR-009 follow-up
- [ ] Scaffold defaults kept (`create-next-app` 16.4.1): `cacheComponents: true` and `partialPrefetching: true`, so dynamic reads such as `searchParams` need `<Suspense>`. Revert is removing the two lines in `next.config.ts`. Phase 3 confirms or reverts when it records the server or client filter-reading decision ([ADR-009](adr/009-nextjs-conventions.md) rule 13)
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`
- [ ] Input cap, and a content-type and body-size check before parsing (the rate limit moves to the optional deploy phase)
- [ ] One error shape from all endpoints, `{ error: { code, message, requestId } }`, with codes defined in `src/domain` and mapped to UI error states; no internals in messages ([architecture](architecture.md))
- [ ] One structured JSON log line per request (no query text); version shown in the UI footer
- [ ] Phase checkpoint: run `review-phase` in a fresh session (about 10 min); resolve each drift item by fixing the code, fixing the document or writing a superseding ADR

**Done when:** a query works end to end locally with the real model and with the mock.

## Phase 4: e2e (0h40)

- [ ] Playwright config, `pnpm e2e` and the CI e2e job (split from Phase 0: it needs a spec and the mock provider to run against); search happy path; edit-a-chip happy path
- [ ] Phase checkpoint: run `review-phase` in a fresh session (about 10 min); resolve each drift item by fixing the code, fixing the document or writing a superseding ADR

**Done when:** e2e passes in CI against the in-memory adapter and the mock provider.

## Phase 5: Documentation and demo (1h)

- [ ] README: replace every *pending* marker (status, setup with both run paths: in-memory with the mock provider, and Postgres via Podman; trade-offs and improvements)
- [ ] "Context and assumptions" and "what I would do at the company" in the README
- [ ] Record the demo (Loom or similar) from the local run, with the real model; this is the guaranteed deliverable
- [ ] Check ADRs, architecture and the roadmap are current

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

## Final review (last step, after every phase that is being done, including the optional ones)

- [ ] Review all documentation (README, TODO, AGENTS, architecture, roadmap, DESIGN, ADRs and research notes) against the code as built: no stale status, paths, counts, versions, checkboxes, times or links; every *pending* marker resolved; the time log filled in; superseded or unbuilt items marked as such. Accepted ADRs are not edited, only superseded
- [ ] Tag `v0.1.0` at submission

**Done when:** a reader who follows only the repository finds nothing that contradicts the code.

## Below the line (documented, not built)

Analytics, API versioning, tracing and dashboards, readiness checks that call the model, scalability work. Trade-offs in [roadmap.md](roadmap.md).

## Time log

| Phase | Planned | Actual |
|---|---|---|
| 0 | 1h20 | about 46 min (recorded by the author) |
| 1 | 3h40 | 1h47 (recorded by the author) |
| 2 | 2h25 | |
| 3 | 2h05 | |
| 4 | 0h40 | |
| 5 | 1h | |
| 6 (optional) | 0.75h | |

Planned total, phases 0 to 5, is about 11h10. The first plan was 8h. The roadmap additions added about 45 minutes, ADR-010 and ADR-011 added about 1h20 net (the Postgres adapter and container about 2h, less the Netlify spike and the rate limit moved to Phase 6), the model timeout and error shape added about 25 minutes, and the phase checkpoints for phases 1 to 4 added about 40 minutes. All figures are estimates, not measurements. Slides are outside this total. The ADR-009 items added to phases 0, 2 and 3 are small and not re-estimated (an unmeasured guess is about 15 minutes in total).
