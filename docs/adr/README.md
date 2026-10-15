# Architecture Decision Records

One file per decision. A decision is never edited after acceptance: a changed decision gets a new ADR, and the old one is marked `Superseded by ADR-NNN`.

## When to write one

Write an ADR when a decision is hard to reverse or shapes the design (idea, AI boundary, stack, provider, test strategy). Smaller choices belong in task notes. Write the ADR when the decision is made, not in advance.

## Where things live

- Evidence (research, pricing, competitor findings): `docs/research/`
- Rationale and the decision itself: `docs/adr/`
- Use [000-template.md](000-template.md) for new records.

## Index

| ADR | Title | Status |
|---|---|---|
| [001](001-problem-and-idea.md) | Problem and idea selection | Accepted |
| [002](002-ai-boundary.md) | AI boundary | Accepted |
| [003](003-stack-and-hosting.md) | Stack and hosting | Accepted; hosting superseded by ADR-011, ESLint and Prettier by ADR-012 |
| [004](004-data-layer.md) | Data layer | Superseded by ADR-010 |
| [005](005-llm-provider.md) | LLM provider and model | Accepted |
| [006](006-demo-protection.md) | Public demo protection | Accepted; narrowed by ADR-011 (rate and spend limits only if deployed) |
| [007](007-test-strategy.md) | Test strategy | Accepted; extended by ADR-010 (integration layer) |
| [008](008-design-direction.md) | Design direction | Accepted |
| [009](009-nextjs-conventions.md) | Next.js structure and conventions | Accepted; ESLint wording in rule 6 superseded by ADR-012 |
| [010](010-postgres-data-layer.md) | Postgres adapter behind the search port | Accepted |
| [011](011-local-first-delivery.md) | Local-first delivery, Podman, deployment at a gate | Accepted; order of work and gate superseded by ADR-015 |
| [012](012-oxc-lint-and-format.md) | Oxlint and Oxfmt for linting and formatting | Accepted |
| [013](013-ai-generated-sample-data.md) | AI-generated fictional sample data | Accepted |
| [014](014-filters-in-the-url.md) | Filters in the URL, read on the client | Accepted |
| [015](015-demo-recorded-after-deploy.md) | Record the demo after the optional deploy, Phase 6 time-boxed | Accepted |
