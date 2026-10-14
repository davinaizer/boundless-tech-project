# ADR-002: AI boundary

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

The AI has to add real value, but members rely on offers, prices and terms being correct. A wrong or invented offer is a worse failure than no answer. The product must also stay testable and cheap to run.

## Options considered

1. **LLM answers from free text or its own knowledge** (including RAG over offer text). Flexible, but offers, prices and terms can be invented or drift.
2. **LLM as translator and explainer over deterministic retrieval.** The model turns the query into a typed filter object and explains results it was given. Less expressive, but verifiable.
3. **LLM re-ranks results.** Adds a second source of non-determinism for little demonstrated value.

## Decision

**Option 2.**

- The model produces a `Filters` object (strict JSON schema, then Zod validation) and a short explanation that references only offer IDs it was given.
- The model never produces offers, prices, savings or terms. Retrieval and the savings estimate are deterministic code.
- Each LLM step is its own endpoint with at most one model call: `interpret` and `explain`. Search itself makes no model call, so editing a filter chip is cheap and deterministic.
- Empty or whitespace-only input makes no model call.
- Failure handling: invalid filters get one retry, then a keyword fallback. If explanation fails or cites an ID outside the result set, the UI shows deterministic match reasons instead.
- Only the query text is sent to the model, with a length cap. No member identifiers.

## Consequences

- The filter schema limits what can be asked. Queries outside it degrade to keyword search, and this is visible to the user in the chips.
- Parse accuracy is measurable with an eval set ([ADR-007](007-test-strategy.md)).
- Latency stays bounded because no request chains more than one model call.

## Weakest assumption

That the filter schema covers the queries members actually type. The eval set tests this only for queries I write. Real query logs would be the evidence.

## Evidence

- Structured outputs on the Claude API: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- [boundless-tech-stack](../research/boundless-tech-stack.md)
