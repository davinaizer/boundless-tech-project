# Benefits Finder

A small full-stack app where a member of a public-sector benefits club describes what they want in plain English and gets matching offers, with an illustrative saving against the membership fee.

Built as a technical challenge for a Senior Fullstack Engineer role. It is an independent exercise, **not affiliated with or endorsed by Boundless by CSMA**. All offers, partners and savings in the app are fictional sample data.

## Status

| Area | State |
|---|---|
| Problem, research, architecture, decisions | Done: see [Where to look](#where-to-look) |
| Implementation | Not started. Plan and acceptance criteria in [docs/TODO.md](docs/TODO.md) |
| Live demo and recorded demo | Pending: links will be added here when available |

This README describes the intended design. Sections marked *pending* are completed once the code exists.

## The idea in 30 seconds

**Problem (hypothesis, not validated with users).** The membership has a large catalogue of offers across many categories and two paid tiers. A member has to work out what to use and whether the fee pays off.

**Solution.** The member types a request such as "a cheap family day out near Brighton". The app shows how it understood the request as editable filter chips, returns matching offers, and shows an illustrative annual saving against the fee. Short explanations say why each offer fits.

**Scope.** In: natural-language search, editable filters, deterministic retrieval over a sample catalogue, grounded explanations, a savings estimate. Out: authentication, embeddings, real or scraped data, CMS integration, payments.

## How AI is used

The model **translates and explains; it never supplies facts** ([ADR-002](docs/adr/002-ai-boundary.md)).

1. **Interpret.** The model turns the request into a typed filter object, constrained by a JSON schema and re-validated in code.
2. **Search.** Deterministic code filters the catalogue and computes the savings estimate. No model call.
3. **Explain.** The model writes short explanations for offers it was given. Any reference to an offer outside the result set is rejected.

If the model output is invalid, the app retries once and then falls back to keyword search. Empty input makes no model call.

**Model.** Claude Haiku 5.5, chosen on verified price and native structured-output support, not on a head-to-head quality benchmark ([ADR-005](docs/adr/005-llm-provider.md)). A small evaluation set will check parse accuracy.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind |
| Validation | Zod |
| Tests | Vitest (unit), Playwright (two happy-path e2e tests), on-demand eval script |
| CI | GitHub Actions |
| Hosting | Netlify, with Vercel as fallback ([ADR-003](docs/adr/003-stack-and-hosting.md)) |
| Data | Fictional sample catalogue behind a `SearchOffers` port; no database ([ADR-004](docs/adr/004-data-layer.md)) |

## Where to look

**Two minutes**
- [Idea and scope: ADR-001](docs/adr/001-problem-and-idea.md)
- [Architecture and diagrams](docs/architecture.md): user flow, system design, request flow
- [Roadmap](docs/roadmap.md): what is built, optional, or left out (observability, health, versioning, OpenAPI, analytics, scalability), with trade-offs
- [Design theme](DESIGN.md) and [mockups](docs/design/): visual direction, styled after the public look of boundless.co.uk (concept only)

**Ten minutes**
- [Decision records](docs/adr/README.md): one file per decision, each with options, consequences and its weakest assumption
- [Research](docs/research/): company profile, competitor scan, observed technology stack, search usage. Each states its sources and limits.

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
| [003](docs/adr/003-stack-and-hosting.md) | Next.js and TypeScript on Node; Netlify with Vercel fallback |
| [004](docs/adr/004-data-layer.md) | Port with an in-memory adapter; production adapters documented, not built |
| [005](docs/adr/005-llm-provider.md) | Claude Haiku 5.5 behind a single module |
| [006](docs/adr/006-demo-protection.md) | Input cap, best-effort rate limit, provider spend limit |
| [007](docs/adr/007-test-strategy.md) | Unit tests, mocked AI services, two e2e paths, on-demand eval |
| [008](docs/adr/008-design-direction.md) | Boundless-styled concept theme, no logo or fonts, labelled not affiliated |

## Evidence and assumptions

Claims about the company in `docs/research/` are labelled by source: public pages, or analysis of public response headers and client behaviour supplied by the author and not independently reproduced. Anything about how the company's own systems work is a hypothesis, not a fact. The README and ADRs say so where it matters.

## How this was built

AI assistance is part of the workflow and is disclosed. Architecture, the AI boundary and schema design are human-led. Boilerplate, tests and documentation drafts are delegated with review. Each task follows plan, implement, review, complete, with developer approval between plan and implementation. Commits that were AI-assisted carry a `Co-Authored-By` trailer. The UI mockups in `docs/design/` were AI-generated from public observation of boundless.co.uk and show direction only; the built app may differ ([ADR-008](docs/adr/008-design-direction.md)). See [AGENTS.md](AGENTS.md).

## Setup

*Pending: completed in Phase 5 once the app exists.* It will cover prerequisites (Node, pnpm), environment variables (an Anthropic API key, kept server-side and never committed), running the app, and running the unit, e2e and eval commands.

## Trade-offs

Current, from the ADRs:

- **No database.** Catalogue data is read-only sample data, so a typed seed behind a port is enough. The cost is less "database" signal; a different adapter is a contained change.
- **Sample data only.** Savings are illustrative, not claims about real offers.
- **Small model, no benchmark.** Parse quality is checked by a hand-written eval, which is a regression check, not a measure of production accuracy.
- **Best-effort rate limiting.** In-memory limits do not hold across serverless instances. The provider spend limit is the real control.
- **Only some filters are evidenced in the production index.** Category, expiry and probably membership level were observed. Region, price and audience exist only in the sample data.

Operational scope (observability, health check, versioning, OpenAPI, analytics) and scalability hypotheses are in the [roadmap](docs/roadmap.md).

*Pending: what would be done differently inside the company is finalised after the build.*

## Repository layout

```text
AGENTS.md          working rules for contributors and AI agents
DESIGN.md          visual theme (design tokens and rationale)
docs/
  brief/           the challenge brief
  adr/             decision records
  research/        evidence behind the decisions
  architecture.md  design and diagrams
  roadmap.md       scope tiers, trade-offs, scalability
  design/          UI mockups
  TODO.md          plan, acceptance criteria, time log
.agents/skills/    task workflow skills (.claude/skills links here)
src/               application code (not yet created)
```
