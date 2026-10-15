# ADR-014: Filters in the URL, read on the client

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Answers rule 13 of [ADR-009](009-nextjs-conventions.md), which left the server-or-client reading to Phase 3, and settles the scaffold defaults it names.

## Context

Facts:
- The architecture says filters live in the URL query string, so a reload keeps the results and a link can be shared.
- Reading `searchParams` on the server makes the route dynamic, and with `cacheComponents` it needs `<Suspense>` (ADR-009 rule 13; [nextjs-practices](../research/nextjs-practices.md)).
- The page already runs the search flow on the client: `interpret`, `search`, `explain` through the Route Handlers, and a model call for explanations that cannot run during render.
- `create-next-app` 16.4.1 set `cacheComponents: true` and `partialPrefetching: true`. Nothing in the app uses `use cache`, partial prerendering or prefetching.

Assumption, not measured: a short loading state on a shared link is acceptable for a demo.

## Options considered

1. **Read on the client.** `window.location.search` on mount and on `popstate`; the page stays a static, prerendered shell.
2. **Read `searchParams` on the server.** Results can be in the first HTML, but the route becomes dynamic and needs Suspense, and the explanations still load on the client.

## Decision

**Option 1.**

- The URL holds the understood filters only: repeated `category` and `keyword`, and `region`, `maxPrice`, `audience`, `tier`. It never holds the user's own words, since a URL ends up in history and referrers.
- The URL is untrusted input: each value is validated alone with the `Filters` schema and an invalid one is dropped (`src/app/_components/filters-url.ts`).
- A link with filters loads search and explain with no interpret call. A submit or chip edit pushes a history entry, and Back and Forward restore earlier filters.
- `cacheComponents` and `partialPrefetching` are removed from `next.config.ts`: with client reading they buy nothing, and they add a rule (Suspense for dynamic reads) with no benefit. Putting them back is two lines.

## Consequences

- Easier: the page stays static; no Suspense or dynamic-rendering rules apply to the page; the same client flow serves a link and a submit.
- Harder: a shared link shows a loading state before results, and the page's HTML has no results for a crawler. Filters cleared to empty leave an empty URL, so a reload shows the idle page, not all offers.
- The Netlify adapter's support for these flags no longer matters for this app; its support for 16.4.1 is still not verified (TODO, deploy phase).

## Weakest assumption

That the loading state on a shared link is acceptable. If a reviewer wants results in the first paint, switch to option 2 for the page and keep `explain` on the client.

## Evidence

- ADR-009 rule 13 and [nextjs-practices](../research/nextjs-practices.md).
- Build route table and a browser walk-through, recorded in [TODO](../TODO.md).
