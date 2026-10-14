# ADR-007: Test strategy

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

The brief lists basic tests as optional. The goal is proportionate evidence that behaviour is correct, including the AI-dependent parts, within the time cap.

## Options considered

1. **Broad e2e coverage.** Slow, brittle, and mostly retests the same paths.
2. **Unit tests on deterministic logic, mocked AI services, two e2e happy paths, and an on-demand eval for real model behaviour.**
3. **Unit tests only.** Misses wiring and UI failures.

## Decision

**Option 2.**

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Filter schema, search, savings estimate, grounding check |
| AI services | Vitest, mocked client | Schema validation, retry, keyword fallback, rejection of IDs outside the result set |
| e2e | Playwright, 2 happy paths | Search from query to results and savings; editing a filter chip. The server uses a mock AI provider selected by environment variable |
| Eval | Script, on demand | About 15 queries with expected filters against the real model, reporting pass rate |

- CI runs typecheck, lint, unit and e2e (mock provider). The eval is not in CI because it is non-deterministic and costs money.
- No coverage threshold. A number would be arbitrary here.

## Consequences

- Mock-based e2e cannot catch real-model regressions. That is the eval's job.
- The mock provider needs maintenance when schemas change.

## Weakest assumption

That a hand-written eval of about 15 queries represents real use. It is a regression check, not a measure of accuracy in production.

## Evidence

- [ADR-002](002-ai-boundary.md), [ADR-005](005-llm-provider.md)
