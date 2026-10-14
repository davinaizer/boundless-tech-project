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
| [003](003-stack-and-hosting.md) | Stack and hosting | Accepted |
| [004](004-data-layer.md) | Data layer | Accepted |
| [005](005-llm-provider.md) | LLM provider and model | Accepted |
| [006](006-demo-protection.md) | Public demo protection | Accepted |
| [007](007-test-strategy.md) | Test strategy | Accepted |
