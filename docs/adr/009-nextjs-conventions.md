# ADR-009: Next.js structure and conventions

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

## Context

[ADR-003](003-stack-and-hosting.md) chose Next.js App Router. [Architecture](../architecture.md) already defines the layers (`app`, `services`, `domain`, `lib/ai`, `data`). Nothing yet says how the Next.js-specific parts are organised or which rules a reviewer can check.

Facts: the official docs are unopinionated on folder layout and say to pick one strategy and stay consistent. They are specific on data security, server and client boundaries, and production readiness. A community article prescribes a layer-by-type layout. See [nextjs-practices](../research/nextjs-practices.md) for the comparison and its limits.

Netlify (checked 2026-10-15, [adapter docs](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)): the adapter supports Next.js from 13.5, with full support listed for the App Router, Route Handlers, ISR, streaming, `next/after` and Cache Components. The page states no maximum version, says each new stable version is verified, and does not mention `proxy.ts` (it covers Middleware only). Function timeouts are not stated on the pages read.

Constraint: this is an 8-hour exercise with no auth, no user data and Route Handlers rather than Server Actions. Rules must be cheap to follow and checkable.

## Options considered

1. **Adopt the article's layout** (`components/{ui,features,layouts}`, `hooks`, `services`, `types`, `constants`, `config`). Familiar, but it duplicates layers already in the architecture, creates folders before there is code for them, and rests on a secondary source.
2. **Keep the existing layers, colocate UI with routes, and add a short rule set taken from the official docs.** No new structure; rules target boundaries that can be linted.
3. **Feature-sliced modules** (one folder per feature with its own UI, services and types). Scales to many teams, but this app has one feature.

## Decision

**Option 2.** The rules below apply to code under `src/`.

**Structure**

1. `src/app` holds routes and Route Handlers only. Route-specific UI lives beside its route in a `_components/` private folder. Shared UI moves to `src/components/` when a second route needs it.
2. Create no folder before it has content. `hooks/`, `types/`, `constants/` and `config/` do not exist until needed.
3. Naming: Next.js special files keep their fixed names. Component files are `PascalCase.tsx`. All other files are `kebab-case.ts`, matching special files such as `not-found.tsx`. Hooks are `useX`. `UPPER_SNAKE` is for true constants only. (A choice made here; neither source mandates it.)
4. No line-count rule. In review, ask whether a component mixes data access, state, form handling and rendering; split it if so.

**Boundaries (enforced, not just documented)**

5. `import 'server-only'` in `src/services`, `src/lib/ai` and `src/data`. `src/domain` stays pure and imports nothing from the other layers.
6. ESLint `no-restricted-imports` enforces: `domain` imports no other layer; the provider SDK is imported only in `src/lib/ai`; `process.env` is read only in `src/lib/env.ts`.
7. `src/lib/env.ts` parses environment variables with Zod at startup and fails fast. Secrets never carry the `NEXT_PUBLIC_` prefix. The only public variable is the app version string ([roadmap](../roadmap.md)). `.env*` files are not committed.
8. The `SearchOffers` port plus services play the role of the docs' Data Access Layer. Only that layer touches the catalogue.

**Server and client**

9. Components are Server Components by default. Add `"use client"` only for interactivity, and place it on the smallest leaf (query box, chips). Client Components receive only the fields they render, not whole domain objects.
10. Route Handlers validate input with Zod, return a minimal response shape, and write the single log line. Server Components do not call this app's own Route Handlers. No mutation happens during render.
11. If authentication is ever added, authentication and authorization (resource ownership) are checked inside each handler or action, not only in layouts or `proxy.ts`.

**Route states and rendering**

12. Add `loading.tsx`, `error.tsx` (a Client Component), `not-found.tsx` and `global-error.tsx`.
13. Dynamic rendering is deliberate. Reading `searchParams` or `cookies()` on the server makes the route dynamic; use it knowingly and wrap in `<Suspense>`. Filters live in the URL query string ([architecture](../architecture.md)), so Phase 3 decides whether the page reads them on the server or on the client, and records the result.

**Quality**

14. `async` Server Components are covered by Playwright, not unit tests, as the docs advise and [ADR-007](007-test-strategy.md) already provides.
15. Pin the Next.js version to a current stable release that the Netlify adapter documents as supported. Re-read the docs for the pinned version at scaffold time, especially caching defaults. Avoid `proxy.ts` unless the Phase 0 spike shows it works on Netlify.

## Consequences

- Easier: the boundaries that matter here (secrets, provider, domain purity) fail the lint or build instead of relying on review.
- Harder: lint configuration is a Phase 0 task, and `server-only` needs a decision on the test setup (unit tests of server modules must stub it).
- Not adopted now, and recorded with triggers in the [roadmap](../roadmap.md): a formal Data Access Layer with DTO per query, a Content Security Policy, a shared cache handler and deployment ID for multi-instance hosting, taint APIs, CODEOWNERS and monorepo tooling.
- Rules 3 and 4 are preferences with no evidence behind them beyond consistency.

## Weakest assumption

That the existing layers plus these rules are enough for a single-feature app. If a second feature or contributor appears, revisit option 3. A second weak point: the docs pages were read through a summarising tool and may have changed by the version pinned at scaffold time; rule 15 is the mitigation.

## Evidence

- [nextjs-practices](../research/nextjs-practices.md)
- Next.js docs: [project structure](https://nextjs.org/docs/app/getting-started/project-structure), [data security](https://nextjs.org/docs/app/guides/data-security), [production checklist](https://nextjs.org/docs/app/guides/production-checklist)
