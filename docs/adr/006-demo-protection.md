# ADR-006: Public demo protection

- **Status:** Accepted. Scope narrowed by [ADR-011](011-local-first-delivery.md): the rate limit and provider spend limit apply only if the app is deployed.
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

A deployed demo puts a paid API key behind a public endpoint. The main risk is cost from abuse or loops, not normal use.

## Options considered

1. **Input cap, best-effort rate limit, provider spend limit.** Cheap and proportionate.
2. **Bot challenge (for example Turnstile) on top.** Stronger, but adds a dependency and UI for a demo.
3. **Gate the demo behind a password.** Reliable, but adds friction for reviewers.

## Decision

**Option 1.**

- The API key is server-side only and never reaches the client.
- A query length cap, set in config (initial value 200 characters, a starting heuristic).
- A per-IP rate limit. An in-memory limiter is best-effort only, because serverless instances do not share memory. It is documented as such.
- The real control is a spend limit on the provider account. Check that the provider console supports one before relying on it.

## Consequences

- Protection is proportionate, not airtight. A determined abuser is limited mainly by the spend cap.
- No new dependencies.

## Weakest assumption

That a provider-side limit is available and enforced. If not, switch to option 3 until it is.

## Evidence

- [ADR-005](005-llm-provider.md) for per-query cost.
