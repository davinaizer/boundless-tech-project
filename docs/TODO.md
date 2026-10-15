# Work plan

Phases are small and reversible. Each ends with a review gate before the next starts. Budget: 8 hours including setup and documentation (now about 8h45 with the roadmap additions; see the time log). Record actual time in the table at the end.

## Phase 0: Setup and governance (1h)

- [ ] Scaffold Next.js (App Router), TypeScript strict, Tailwind
- [ ] ESLint, Prettier, Vitest, Playwright config, `pnpm check` and `pnpm e2e`
- [ ] GitHub Actions: typecheck, lint, unit, e2e
- [x] Add the plan, implement, review and complete task skills (adapted from an earlier project)
- [ ] `GET /api/health` returning status and version; used as the deploy spike's route handler
- [ ] App version string `v<package>+<build>.<short sha>` computed at build time; settle the build-number source and Netlify commit variable in the spike
- [ ] Deploy spike: minimal route handler on Netlify; check function time limits and that the build detects pnpm. If unacceptable, use Vercel and record the reason in ADR-003's follow-up
- [ ] `.gitignore` cleaned for this stack
- [ ] ESLint `no-restricted-imports` boundaries and `server-only` handling in the Vitest setup ([ADR-009](adr/009-nextjs-conventions.md))

**Done when:** CI is green on an empty app and the spike URL responds.

## Phase 1: Domain and search (2h)

- [ ] Types and Zod schemas: `Offer`, `Filters`, `Category`
- [ ] Fictional sample catalogue, labelled, across the public categories, with tier and optional expiry date (expired hidden by default)
- [ ] `SearchOffers` port and in-memory adapter
- [ ] `estimateSavings` and fee constants
- [ ] Unit tests for schema, search and savings

**Done when:** tests pass and search and savings run with no AI.

## Phase 2: AI layer (2h)

- [ ] `src/lib/env.ts`: Zod-parsed environment, the only reader of `process.env`
- [ ] `lib/ai` client for Claude Haiku 5.5 with structured output; mock provider
- [ ] `PROMPT_VERSION` constant, recorded in eval output
- [ ] `interpretQuery` with Zod re-validation, one retry, keyword fallback, no call on empty input
- [ ] `explainResults` with grounding check
- [ ] Eval set of about 15 queries and an on-demand script
- [ ] Service tests with the mocked client

**Done when:** service tests pass and the eval has been run once and its result recorded.

## Phase 3: API and UI (1.5h)

- [ ] Route Handlers: interpret, search, explain
- [ ] UI: query box, editable chips, results, savings, loading, empty and error states
- [ ] Accessibility basics: labels, focus order, contrast, keyboard use of chips
- [ ] Filters serialised into the URL query string; decide server or client reading (server `searchParams` makes the route dynamic) and record it in ADR-009 follow-up
- [ ] `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`
- [ ] Input cap and best-effort rate limit
- [ ] One structured JSON log line per request (no query text); version shown in the UI footer

**Done when:** a query works end to end locally with the real model and with the mock.

## Phase 4: e2e and deploy (0.5h)

- [ ] Playwright: search happy path; edit-a-chip happy path
- [ ] Deploy; set provider spend limit; smoke test against `/api/health`; tag `v0.1.0`

**Done when:** e2e passes in CI and the live demo works.

## Phase 5: Documentation and demo (1h)

- [ ] README: overview, stack, how AI is used, setup, trade-offs and improvements
- [ ] "Context and assumptions" and "what I would do at the company" in the README
- [ ] Record the demo (Loom or similar)
- [ ] Check ADRs, architecture and the roadmap are current

**Done when:** a new reader can set up, run and understand the decisions from the README.

## Optional, only if time allows

- [ ] Slides in Markdown
- [ ] Netlify and Vercel parity check
- [ ] OpenAPI: generate `openapi.json` from the Zod schemas (see [roadmap](roadmap.md); check Zod version support first)

## Below the line (documented, not built)

Analytics, API versioning, tracing and dashboards, readiness checks that call the model, scalability work. Trade-offs in [roadmap.md](roadmap.md).

## Time log

| Phase | Planned | Actual |
|---|---|---|
| 0 | 1h15 | |
| 1 | 2h | |
| 2 | 2h05 | |
| 3 | 1h55 | |
| 4 | 0.5h | |
| 5 | 1h | |

Planned total is about 8h45. The first plan was 8h; the roadmap additions (health, version string, logging, prompt version) added about 45 minutes, which is estimated, not measured. Slides are outside this total. The ADR-009 items added to phases 0, 2 and 3 are small and not re-estimated (an unmeasured guess is about 15 minutes in total).
