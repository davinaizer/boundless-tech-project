# Work plan

Phases are small and reversible. Each ends with a review gate before the next starts. Budget: 8 hours including setup and documentation. Record actual time in the table at the end.

## Phase 0: Setup and governance (1h)

- [ ] Scaffold Next.js (App Router), TypeScript strict, Tailwind
- [ ] ESLint, Prettier, Vitest, Playwright config, `npm run check` and `npm run e2e`
- [ ] GitHub Actions: typecheck, lint, unit, e2e
- [ ] Define the plan, implement, review and complete workflow files (provisional)
- [ ] Deploy spike: minimal route handler on Netlify; check function time limits. If unacceptable, use Vercel and record the reason in ADR-003's follow-up
- [ ] `.gitignore` cleaned for this stack

**Done when:** CI is green on an empty app and the spike URL responds.

## Phase 1: Domain and search (2h)

- [ ] Types and Zod schemas: `Offer`, `Filters`, `Category`
- [ ] Fictional sample catalogue, labelled, across the public categories, with tier and optional expiry date (expired hidden by default)
- [ ] `SearchOffers` port and in-memory adapter
- [ ] `estimateSavings` and fee constants
- [ ] Unit tests for schema, search and savings

**Done when:** tests pass and search and savings run with no AI.

## Phase 2: AI layer (2h)

- [ ] `lib/ai` client for Claude Haiku 5.5 with structured output; mock provider
- [ ] `interpretQuery` with Zod re-validation, one retry, keyword fallback, no call on empty input
- [ ] `explainResults` with grounding check
- [ ] Eval set of about 15 queries and an on-demand script
- [ ] Service tests with the mocked client

**Done when:** service tests pass and the eval has been run once and its result recorded.

## Phase 3: API and UI (1.5h)

- [ ] Route Handlers: interpret, search, explain
- [ ] UI: query box, editable chips, results, savings, loading, empty and error states
- [ ] Accessibility basics: labels, focus order, contrast, keyboard use of chips
- [ ] Filters serialised into the URL query string
- [ ] Input cap and best-effort rate limit

**Done when:** a query works end to end locally with the real model and with the mock.

## Phase 4: e2e and deploy (0.5h)

- [ ] Playwright: search happy path; edit-a-chip happy path
- [ ] Deploy; set provider spend limit; smoke test

**Done when:** e2e passes in CI and the live demo works.

## Phase 5: Documentation and demo (1h)

- [ ] README: overview, stack, how AI is used, setup, trade-offs and improvements
- [ ] "Context and assumptions" and "what I would do at the company" in the README
- [ ] Record the demo (Loom or similar)
- [ ] Check ADRs and architecture are current

**Done when:** a new reader can set up, run and understand the decisions from the README.

## Optional, only if time allows

- [ ] Slides in Markdown
- [ ] Netlify and Vercel parity check

## Time log

| Phase | Planned | Actual |
|---|---|---|
| 0 | 1h | |
| 1 | 2h | |
| 2 | 2h | |
| 3 | 1.5h | |
| 4 | 0.5h | |
| 5 | 1h | |
