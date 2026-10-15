# ADR-005: LLM provider and model

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

Two small tasks: parse a short query into a typed filter object, and write a short grounded explanation. Both need low latency, low cost and reliable schema-valid output.

## Options considered

Prices per 1M tokens (input/output), from vendor pages on 2026-10-14.

1. **Anthropic Claude Haiku 5.5:** $0.10 / $0.50 (prompts up to 100K tokens). Structured outputs (JSON schema via constrained decoding) are listed as supported on Haiku 5.5. New API accounts receive a small amount of free credit; amount not stated.
2. **Google Gemini 3.1 Flash-Lite:** $0.25 / $1.50. Free tier exists, but free-tier data is used to improve Google's products.
3. **OpenAI small models:** **not verified**. The pricing pages fetched did not list per-token prices.

## Decision

**Claude Haiku 5.5** (API id `claude-haiku-5-5`), called through a single module, `src/lib/ai/client.ts`, so swapping provider is a one-file change. No multi-provider abstraction.

Chosen on verified price and native schema support, not on a head-to-head quality benchmark. The eval set ([ADR-007](007-test-strategy.md)) is where parse quality is checked.

## Consequences

- Cost per query is a fraction of a cent at these prices, so spend is dominated by abuse, not normal use ([ADR-006](006-demo-protection.md)).
- Structured outputs do not support numeric or string-length constraints in the schema, so those checks live in Zod after parsing.
- Responses must check `stop_reason` for refusals and truncation before trusting the JSON.

## Weakest assumption

That the smallest tier parses queries accurately enough. If the eval shows otherwise, try Sonnet 5.5 for the parse step only ($2 / $10) and record the change in a new ADR.

## Evidence

- Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
