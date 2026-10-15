# ADR-012: Oxlint and Oxfmt for linting and formatting

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Supersedes the ESLint and Prettier choice in [ADR-003](003-stack-and-hosting.md) and the ESLint wording in [ADR-009](009-nextjs-conventions.md) rule 6. The rules themselves in ADR-009 are unchanged.

## Context

Facts:
- ADR-003 named ESLint and Prettier; ADR-009 rule 6 enforces import boundaries with ESLint `no-restricted-imports`.
- Oxlint documents a `no-restricted-imports` rule with `paths` and custom messages (checked 2026-10-15, [rule page](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports.html)).
- npm latest at the time of writing: `oxlint` 1.88.0, `oxfmt` 0.73.0. Oxfmt is pre-1.0.

Not verified: per-folder overrides for the three boundary rules, and a rule that restricts `process.env` outside `src/lib/env.ts`, in Oxlint. Both are checked in the lint task.

## Decision

Use **Oxlint** for linting and **Oxfmt** for formatting, in place of ESLint and Prettier. The import boundaries in ADR-009 rule 6 still fail the lint, now through Oxlint configuration.

## Consequences

- Easier: one fast toolchain, fewer dependencies, no ESLint and Prettier plugin set to maintain.
- Harder: `eslint-config-next` rules (for example `next/core-web-vitals`) are not available as such. Anything the boundaries need that Oxlint cannot express is recorded as a gap, not worked around silently.
- Oxfmt is pre-1.0, so formatting output may change between releases. Pin the exact version.

## Weakest assumption

That Oxlint can express all three ADR-009 boundary rules, including per-folder scoping. If it cannot, the fallback is to keep ESLint for those rules only, recorded in a new ADR.
