# Benefits Finder

A small full-stack app where a member of a public-sector benefits club describes what they want in plain English and gets matching offers, with an illustrative saving against the membership fee.

Built as a technical challenge for a Senior Fullstack Engineer role. It is an independent exercise, **not affiliated with or endorsed by Boundless by CSMA**. All offers, partners and savings in the app are fictional sample data.

## Status

| Area | State |
|---|---|
| Problem, research, architecture, decisions | Done: see [Where to look](#where-to-look) |
| Implementation | Built and checked: domain and search, Postgres and in-memory data layer, AI client with a mock, `interpretQuery` and `explainResults`, Route Handlers, finder UI, request log line, rate limit, a runtime bar and a development-only request inspector, e2e and eval. Phases 0 to 6 done except two Netlify checks left open in Phase 6; the final documentation review and the `v0.1.0` tag are still to do. Plan and acceptance criteria in [docs/TODO.md](docs/TODO.md) |
| Live demo | [https://boundless-benefits-finder.netlify.app/](https://boundless-benefits-finder.netlify.app/) on Netlify. The footer and `/api/health` show the deployed version; it is the last deployed build, not necessarily the tip of `develop` |
| Recorded demo | [Loom video](https://www.loom.com/playlists/402ce596-9068-485e-af77-d84e756d1c37/view), recorded after the deploy phase ([ADR-015](docs/adr/015-demo-recorded-after-deploy.md)) |

## The idea in 30 seconds

**Problem (hypothesis, not validated with users).** The membership has a large catalogue of offers across many categories and two paid tiers. A member has to work out what to use and whether the fee pays off.

**Solution.** The member types a request such as "a cheap family day out near Brighton". The app shows how it understood the request as editable filter chips, returns matching offers, and shows an illustrative annual saving against the fee. Short explanations say why each offer fits.

**Scope.** In: natural-language search, editable filters, deterministic retrieval over a sample catalogue, grounded explanations, a savings estimate. Out: authentication, embeddings, real or scraped data, CMS integration, payments.

## Context and assumptions

- **Not an existing product.** The company's real catalogue, systems and users were not available. Everything the app shows is a fictional sample catalogue ([ADR-013](docs/adr/013-ai-generated-sample-data.md)), and the savings figure is an illustration, not a claim about any real offer.
- **The problem is a hypothesis.** A large catalogue and two paid tiers make "what should I use, and is the fee worth it?" plausible, but no member was asked. The scope came from a limited competitor scan and public observation ([ADR-001](docs/adr/001-problem-and-idea.md), [research](docs/research/)).
- **Claims about the company are labelled.** Research notes say which statements come from public pages and which from response headers and client behaviour supplied by the author and not independently reproduced.
- **Scope is deliberately small.** The brief asks for quality and clarity, not completeness, so there is no authentication, no real data, no embeddings and no payments. What was left out is listed with reasons in the [roadmap](docs/roadmap.md).

## How AI is used

The model **translates and explains; it never supplies facts** ([ADR-002](docs/adr/002-ai-boundary.md)).

1. **Interpret.** The model turns the request into a typed filter object, constrained by a JSON schema and re-validated in code.
2. **Search.** Deterministic code filters the catalogue and computes the savings estimate. No model call.
3. **Explain.** The model writes short explanations for offers it was given. Any reference to an offer outside the result set is rejected.

If the model output is invalid, the app retries once and then falls back to keyword search. Empty input makes no model call.

**Model.** Claude Haiku 5.5, chosen on verified price and native structured-output support, not on a head-to-head quality benchmark ([ADR-005](docs/adr/005-llm-provider.md)). An on-demand eval of 21 hand-written queries checks the interpret step against expected filters and records a keywords-only baseline beside the model; recorded runs are in [docs/eval-results.md](docs/eval-results.md). On the latest prompt it passed 21 of 21 in three runs, against 7 of 21 for keywords only (those 7 are the cases that must produce no filters, so they say little about understanding). The prompt was tuned on this same set after it exposed a bug (a price of 0 for "cheap"), so the result is a regression signal, not held-out accuracy.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind |
| Validation | Zod |
| Tests | Vitest (unit and integration against Postgres), Playwright (16 e2e tests in 5 specs, including the two happy paths), on-demand eval script |
| CI | GitHub Actions |
| Data | Fictional sample catalogue behind a `SearchOffers` port: Postgres adapter when `DATABASE_URL` is set, in-memory adapter otherwise ([ADR-010](docs/adr/010-postgres-data-layer.md)) |
| Local services | Podman runs Postgres from a Compose file; the app runs with `pnpm dev` ([ADR-011](docs/adr/011-local-first-delivery.md)) |
| Hosting | Local-first, deployed on Netlify ([live site](https://boundless-benefits-finder.netlify.app/)); Vercel was the fallback and is not used ([ADR-011](docs/adr/011-local-first-delivery.md)) |

## Where to look

**Two minutes**
- [Idea and scope: ADR-001](docs/adr/001-problem-and-idea.md)
- [Architecture and diagrams](docs/architecture.md): user flow, system design, request flow
- [Roadmap](docs/roadmap.md): what is built, optional, or left out (observability, health, versioning, OpenAPI, analytics, scalability), with trade-offs
- [Design theme](DESIGN.md) and [mockups](docs/design/): visual direction, styled after the public look of boundless.co.uk (concept only)

**Ten minutes**
- [Decision records](docs/adr/README.md): one file per decision, each with options, consequences and its weakest assumption
- [Research](docs/research/): company profile, competitor scan, observed technology stack, search usage, Next.js practices. Each states its sources and limits.

**For the engineering approach**
- [AGENTS.md](AGENTS.md): working rules, delegation levels for AI-assisted work, conventions
- [docs/TODO.md](docs/TODO.md): phased plan, acceptance criteria, time log
- [.agents/skills/](.agents/skills/): the plan, implement, review and complete workflow

**Source material**
- [docs/brief/](docs/brief/): the challenge brief

## Decisions at a glance

| ADR | Decision |
|---|---|
| [001](docs/adr/001-problem-and-idea.md) | Natural-language finder plus a savings estimate, chosen after a limited competitor scan |
| [002](docs/adr/002-ai-boundary.md) | Model translates and explains; retrieval and savings are deterministic |
| [003](docs/adr/003-stack-and-hosting.md) | Next.js and TypeScript on Node (hosting superseded by ADR-011) |
| [004](docs/adr/004-data-layer.md) | Superseded by ADR-010 |
| [005](docs/adr/005-llm-provider.md) | Claude Haiku 5.5 behind a single module |
| [006](docs/adr/006-demo-protection.md) | Input cap, best-effort rate limit, provider spend limit (the last two only if deployed) |
| [007](docs/adr/007-test-strategy.md) | Unit tests, mocked AI services, two e2e happy paths (UI and debug-bar specs were added later), on-demand eval |
| [008](docs/adr/008-design-direction.md) | Boundless-styled concept theme, no logo or fonts, labelled not affiliated |
| [009](docs/adr/009-nextjs-conventions.md) | Next.js structure and conventions: enforced module boundaries, server-first components |
| [010](docs/adr/010-postgres-data-layer.md) | Postgres adapter as the default behind the port; in-memory adapter kept for tests and a no-database run |
| [011](docs/adr/011-local-first-delivery.md) | Local-first; Podman for Postgres; deploy only at a gate (order of work superseded by ADR-015) |
| [012](docs/adr/012-oxc-lint-and-format.md) | Oxlint and Oxfmt for linting and formatting |
| [013](docs/adr/013-ai-generated-sample-data.md) | Fictional sample catalogue generated once, offline, from a committed spec |
| [014](docs/adr/014-filters-in-the-url.md) | Filters in the URL, read on the client, so the page stays static |
| [015](docs/adr/015-demo-recorded-after-deploy.md) | Demo recorded after the optional deploy, Phase 6 time-boxed to 1.5 hours |
| [016](docs/adr/016-expose-runtime-config.md) | AI provider, model and data adapter shown on `/api/health` and in a collapsed bar at the bottom of the page |
| [017](docs/adr/017-development-request-inspector.md) | Under `next dev` only, the bar lists each request with its bodies and model and data calls; never in stdout or production |

## Evidence and assumptions

Claims about the company in `docs/research/` are labelled by source: public pages, or analysis of public response headers and client behaviour supplied by the author and not independently reproduced. Anything about how the company's own systems work is a hypothesis, not a fact. The README and ADRs say so where it matters.

## How this was built

AI assistance is part of the workflow and is disclosed. Architecture, the AI boundary and schema design are human-led. Boilerplate, tests and documentation drafts are delegated with review. Each task follows plan, implement, review, complete, with developer approval between plan and implementation. Commits that were AI-assisted carry a `Co-Authored-By` trailer. The UI mockups in `docs/design/` were AI-generated from public observation of boundless.co.uk and show direction only; the built app may differ ([ADR-008](docs/adr/008-design-direction.md)). See [AGENTS.md](AGENTS.md).

## Setup

**Prerequisites:** Node `^22.12`, `^24` or `>=26` (see `engines`), and pnpm 11 (pinned in `packageManager` in `package.json`). Podman (or Docker) is needed only for the Postgres path.

### 1. Quickest run: in-memory data, mock provider, no key

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no `.env.local`, the app uses the in-memory adapter and the mock AI provider. The mock only understands one query, the placeholder text in the search box (`A cheap family day out near Brighton, under £30 a head`), which shows the model-read path. Any other query takes the keyword fallback and the chips show plain keywords. That is the designed degraded mode, not a bug; use the real model to see the full behaviour.

### 2. Real model

```bash
cp .env.example .env.local
# then set in .env.local:
#   AI_PROVIDER=anthropic
#   ANTHROPIC_API_KEY=<your key>
pnpm dev
```

The key stays server-side and `.env.local` is not committed. Defaults for the timeout and the query and body limits are in `.env.example`.

### 3. Postgres instead of the in-memory adapter

```bash
pnpm db:up                       # Podman Compose: dev database on 5432, test database on 5433
export DATABASE_URL=postgres://benefits:benefits@127.0.0.1:5432/benefits
pnpm db:migrate
pnpm db:seed                     # loads the 174 fictional offers, replacing what is there
pnpm dev                         # the app reads DATABASE_URL from .env.local: uncomment it there
```

`db:migrate` and `db:seed` read `DATABASE_URL` from the shell, not from `.env.local`, so export it first. The Podman machine must be running (`podman machine start`). `pnpm db:down` stops the containers.

### Commands

| Command | What it does |
|---|---|
| `pnpm check` | Typecheck, lint, format check and unit tests |
| `pnpm e2e` | Playwright happy paths against the mock provider and in-memory data. Run `pnpm exec playwright install chromium` once first |
| `pnpm test:integration` | Contract tests against the test database (`pnpm db:up` first) |
| `pnpm eval` | Interpret-step eval against the real model. Needs a key in `.env.local`, costs a few cents, never runs in CI |
| `pnpm build` and `pnpm start` | Production build and server |

### Performance and accessibility baseline

One Lighthouse 13.4.1 run of the home page at `http://localhost:3000/` on 2026-10-15 (desktop profile, simulated throttling): Performance, Accessibility, Best practices and SEO all 100; first contentful paint 0.2 s, largest contentful paint 0.5 s, total blocking time 0 ms, layout shift 0. Report: [JSON](docs/audits/lighthouse-localhost_3000-20261015T174915.json), [PDF](docs/audits/lighthouse-localhost_3000-20261015T174915.pdf). It predates the runtime bar added in Phase 5.1 and has not been re-run since. Limits: a single run on a local machine, the empty home page only (not a search or the results), desktop only, and the report does not record whether it was the dev or the production server. Treat it as a baseline to compare against, not a performance claim.

## Trade-offs

Current, from the ADRs:

- **Postgres plus an in-memory fallback.** The data layer shows schema, migrations and safe query building, and the port has two real implementations. The cost is about 2 hours (estimate) and a container for the Postgres path; the in-memory adapter keeps the app runnable without one ([ADR-010](docs/adr/010-postgres-data-layer.md)).
- **Deployed demo.** The live site uses the real model behind the rate limit (below) and the 200-character query cap. The provider-side spend limit is the control that actually bounds cost; it is set by the author in the Anthropic console, cannot be seen from this repository, and is not verified here.
- **Local-first, deployment optional.** The app was built to run locally first, and the deploy was an optional, time-boxed phase done afterwards; the demo was recorded after it ([ADR-011](docs/adr/011-local-first-delivery.md), [ADR-015](docs/adr/015-demo-recorded-after-deploy.md)). Anyone running the code locally still needs an API key or the mock provider to try the AI themselves.
- **Sample data only.** Savings are illustrative, not claims about real offers.
- **Small model, no benchmark.** Parse quality is checked by a hand-written eval, which is a regression check, not a measure of production accuracy.
- **Eval is small and partly tuned.** 21 author-written cases, one sample each, and the prompt was adjusted after failures on the same set. The mock-based e2e cannot see real-model behaviour, which is how the "cheap" price bug was found only by the eval ([eval-results](docs/eval-results.md)).
- **No quality judge for the explain step.** Deterministic grounding guards what an explanation may say, and a rejected line falls back to a plain description. A model-graded eval was considered and dropped: the only judge available without changing the AI module is the same model family, on about 18 lines, a weak signal ([roadmap](docs/roadmap.md)).
- **Best-effort rate limiting.** The two model endpoints share a per-address limit (20 requests a minute by default, only with the real provider) that returns HTTP 429. It is in memory, so each serverless instance counts on its own and a restart forgets it. The provider spend limit is the real control, and it lives in the provider console, outside this repository (see the deployed-demo note above).
- **Only some filters are evidenced in the production index.** Category, expiry and probably membership level were observed. Region, price and audience exist only in the sample data.

Operational scope (observability, health check, versioning, OpenAPI, analytics) and scalability hypotheses are in the [roadmap](docs/roadmap.md).

### What I would do inside the company

These are proposals, not findings; they depend on facts the exercise did not have.

- **Replace the sample catalogue with the real one** through the existing `SearchOffers` port, and re-run the eval on real offer wording before trusting the filters.
- **Measure on real queries.** Log zero-result rate, chip-edit rate and fallback rate (aggregate, no query text), and build the eval set from real queries with the member's consent. The current set only tests what I thought of.
- **Decide the model with data.** Compare a few models on that set for accuracy, latency and cost before settling on Haiku, which was chosen on price and structured-output support, not a benchmark.
- **Check the savings assumptions** with the people who own pricing and benefits, since the estimate rests on assumed uses per year.
- **Harden for public use:** a durable rate limit, a provider spend cap and alerts on cost and fallback rate, plus accessibility and performance checks on real devices.
- **Revisit the judge eval** for explanations once there is a stronger or different judge model and real examples to calibrate it on.

## Repository layout

```text
AGENTS.md, CLAUDE.md   working rules (CLAUDE.md links to AGENTS.md)
DESIGN.md              visual theme (design tokens and rationale)
docs/
  brief/ adr/ research/ design/    challenge brief, decisions, evidence, mockups
  architecture.md, roadmap.md, TODO.md
src/
  app/                 the finder page, `_components/` (including the runtime bar), and Route Handlers (`/api/interpret`, `search`, `explain`, `health`, and `debug` in development)
  domain/              types, Zod schemas, SearchOffers port, estimateSavings
  lib/                 env.ts, version.ts, ai/ (model client and mock), log.ts, debug-store.ts
  data/                sample catalogue, in-memory and Postgres adapters
  services/            findOffers, interpretQuery, explainResults
db/migrations/ scripts/        SQL migrations and the seed script
evals/                         model eval cases, scorer and runner (`pnpm eval`)
e2e/                           Playwright specs (16 tests: two happy paths, card layout, loading states, runtime bar)
docs/audits/                   Lighthouse baseline report (JSON and PDF)
.github/workflows/ci.yml       check and build; integration (Postgres service); e2e (Playwright, mock provider)
compose.yaml, .env.example     local Postgres for dev and integration tests (Podman or Docker), dev-only values
.agents/skills/                task workflow skills (.claude/skills links here)
package.json and tool configs  Next.js, TypeScript, Vitest, Oxlint, Oxfmt
```

The full target tree is in [docs/architecture.md](docs/architecture.md#folder-structure).
