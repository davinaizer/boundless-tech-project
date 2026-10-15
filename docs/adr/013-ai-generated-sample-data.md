# ADR-013: AI-generated fictional sample data

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Extends the fictional-data rule of [ADR-004](004-data-layer.md) (superseded by [ADR-010](010-postgres-data-layer.md) for the adapter choice; the rule itself is kept in the CLAUDE.md conventions). Clarifies the scope of [ADR-002](002-ai-boundary.md).

## Context

Facts:
- The hand-written sample catalogue has 24 offers, four per category, several expired or Plus-only, over six region values. Live checks of `interpretQuery` through `findOffers` (2026-10-15) often returned no offers, so demo queries end empty.
- Scraping a real site is out ([ADR-001](001-problem-and-idea.md), README scope: no real or scraped data).
- Sample data uses fictional partner names and labelled sample terms; real brands are not attached to invented figures (ADR-004, CLAUDE.md).
- ADR-002 says the model never produces offers, prices, savings or terms.

Assumption: about 150 more offers, spread over all regions and categories, make an empty result rare for ordinary demo queries. Not measured.

## Options considered

1. **Write ~150 offers by hand.** Fully controlled, but hours of repetitive work for sample data.
2. **Generate once, offline, with a model, from a written spec; review and commit the result.** Fast; the spec and generation instruction make it repeatable in kind, not byte for byte; the risk is invented names that collide with real businesses and implausible figures.
3. **Generate at runtime or in a build step.** Non-deterministic data under the tests, and a model producing offers that members see. Rejected.
4. **Synthesise with a script from word lists.** Deterministic, but repetitive, unnatural titles that keyword search and the demo would expose.

## Decision

**Option 2.**

- ADR-002's rule governs what the running app shows members: at runtime the model only produces filters and explanations over retrieved data. Data generated offline by a model, reviewed by a person, committed and labelled as sample is treated like hand-written sample data. It is never generated at runtime or at build time.
- The spec and the generation instruction the model followed are committed (not a literal API prompt: the offers were written in a Claude Code session, as delimited lines converted to JSON by a throwaway script) ([generated-catalogue-spec](../research/generated-catalogue-spec.md)). The output is committed as `src/data/generated-offers.json`, validated with Zod at load and merged after the 24 hand-written offers, which stay unchanged.
- Invariant tests hold the spec (counts, regions, tiers, expiry mix, price bands, saving below price, unique ids and partners), and a denylist test rejects major UK brand names in partners and titles.
- A person reviews the generated file before it is committed.

## Consequences

- Easier: a catalogue large enough for the demo and the eval, in minutes, with the generation recorded.
- Harder: tests that pinned results of the whole catalogue must pin only the hand-written offers or assert properties.
- Accepted risk: a generated partner name may match a real, smaller business. The denylist catches only major brands, and the review is best effort. Not verified.

## Weakest assumption

That a reviewed, labelled fictional dataset is acceptable evidence for a demo. If a reviewer reads any model-made data as a breach of ADR-002, the fallback is Option 1 with the same spec and tests.

## Evidence

- [generated-catalogue-spec](../research/generated-catalogue-spec.md)
- Live `interpretQuery` checks (2026-10-15), recorded in [TODO](../TODO.md) Phase 2.
