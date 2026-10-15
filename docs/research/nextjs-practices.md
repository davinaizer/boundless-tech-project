# Next.js practices: article versus official docs

- **Date read:** 2026-10-15
- **Purpose:** evidence for [ADR-009](../adr/009-nextjs-conventions.md). Compares one community article with the official Next.js documentation, then adds the documented enterprise-relevant guidance.
- **Provenance:** pages were fetched with a summarising tool, so the tables below are extracts, not verbatim quotes. Re-read the linked page before relying on a detail. The Next.js version for this project is not yet pinned; the docs pages were last updated between 2026-02 and 2026-10 (dates shown by each page).
- **Labels:** **[Docs]** stated by the official docs. **[Article]** stated by the article. **[Mine]** author's inference, not in either source.

## Sources

| Source | Weight |
|---|---|
| [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure) (official) | Primary |
| [Production checklist](https://nextjs.org/docs/app/guides/production-checklist) (official) | Primary |
| [Data security](https://nextjs.org/docs/app/guides/data-security) (official) | Primary |
| [Self-hosting](https://nextjs.org/docs/app/guides/self-hosting) (official) | Primary |
| [Testing](https://nextjs.org/docs/app/guides/testing) (official) | Primary |
| [Next.js Clean Code: Best Practices for Scalable Applications](https://dev.to/sizan_mahmud0_e7c3fd0cb68/nextjs-clean-code-best-practices-for-scalable-applications-2jmc) (dev.to) | Secondary: one author's opinion |

## Structure: where the sources agree and differ

| Topic | Article | Official docs |
|---|---|---|
| Folder strategy | Layer-by-type under `src/`: `components/{ui,features,layouts}`, `lib`, `hooks`, `services`, `types`, `constants`, `config` | Unopinionated. Lists three strategies (code outside `app`, in top-level folders inside `app`, split by feature or route) and says to pick one and be consistent |
| Colocation | Not addressed | Project files in `app/` are safely colocated; a route is public only when `page` or `route` exists |
| Private folders, route groups | Not mentioned | `_folder` opts out of routing; `(group)` organises routes and layouts without changing the URL |
| Folder names | Prescribes them | `components` and `lib` "have no special framework significance" |
| Naming | PascalCase components, `useX` hooks, camelCase utilities, UPPER_SNAKE constants | Only the special file names are fixed |
| Server and Client Components | Server by default; `'use client'` only for interactivity, browser APIs, hooks | Server by default; keep `"use client"` boundaries small to limit bundle size |
| Component size | Refactor above about 200 lines | Not addressed |

## Weak or version-sensitive points in the article

- The 200-line threshold has no stated evidence. The useful signal is a component mixing several concerns. **[Mine]**
- The `isUser` guard checks only that keys exist, so it does not validate types. Schema validation at the boundary is stronger. **[Mine]**
- Its `cache: 'no-store'` and `force-cache` advice depends on the Next.js version's caching defaults, which have changed between versions. Not verified here; check the docs for the installed version.
- It does not cover Server Actions, global state, or a test framework.

## Enterprise-relevant guidance from the docs

**Data access and security [Docs]**

- Choose one data-fetching approach and do not mix them: external HTTP APIs (large existing organisations), a Data Access Layer (new projects), or component-level access (prototypes only).
- A Data Access Layer runs only on the server, performs authorization, and returns minimal DTOs. Only it should read secrets from `process.env`.
- `import 'server-only'` turns accidental client imports into build errors. Taint APIs are an experimental extra layer, not a replacement for filtering.
- Server Actions are reachable by direct POST. Verify authentication and authorization inside each one; a page or layout check does not cover them. Validate all client input, return only what the UI needs, and rate-limit expensive operations.
- Audit `proxy.ts` and `route.ts` with extra care; do regular penetration testing or scanning.
- Add a Content Security Policy.

**Rendering and performance [Docs]**

- `cookies()` and the `searchParams` prop opt the whole route (or the app, if used in the root layout) into dynamic rendering. Use them intentionally and wrap in `<Suspense>`.
- Fetch in parallel; stream with `loading.tsx` and Suspense; do not call your own Route Handlers from Server Components.
- Add `global-error.tsx` and a global 404. Use `next/image`, `next/font`, `next/script`.
- Analyse bundles with `@next/bundle-analyzer`; send web vitals to analytics; Lighthouse is a simulated test, so also look at field data.

**Deployment, if self-hosting [Docs]**

- Reverse proxy in front of the Node server; disable proxy buffering so streaming works.
- Build once and promote the same artifact; read env vars at request time (`NEXT_PUBLIC_*` values are inlined at build).
- Multiple instances need: a shared cache handler with `refreshTags()`, the same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` on every instance, and a `deploymentId` for rolling deploys. By default the cache is per instance.
- Graceful shutdown so in-flight requests and `after()` callbacks finish.

**Testing [Docs]**

- `async` Server Components are not fully supported by unit-test tools; prefer end-to-end tests for them. Jest, Vitest, Playwright and Cypress are the listed tools.

## Netlify support (checked 2026-10-15)

Source: [Netlify Next.js adapter overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), read through a summarising tool.

- **Versions:** supported from Next.js 13.5. No maximum is stated; the page says each new stable version is verified.
- **Full support listed:** App Router, Route Handlers, Server Actions, ISR, SSR/SSG, streaming, React Server Components, `next/after`, Image Optimization, Draft Mode, Turbopack, Cache Components.
- **Skew protection:** opt-in by setting `NETLIFY_NEXT_SKEW_PROTECTION=true`; explicit client `fetch` calls do not get the deployment ID automatically.
- **Limits stated:** edge-runtime pages run in the functions region on Node.js; rewrites cannot point at static files in `public`; Middleware has execution-order differences.
- **Not stated:** `proxy.ts` (only Middleware is covered); function timeouts and payload limits (not on the overview or usage-and-billing pages; the Configuration page was not read).

## Not covered by either source (insufficient data)

Feature flags, internationalisation at scale, design-system packaging, observability beyond `instrumentation.ts` and web vitals, and monorepo tooling. Any guidance on these would be **[Mine]**.

## Limits of this note

- On Netlify, platform-managed items (cache, skew protection) are partly covered above; the rest of the self-hosting list was not mapped to Netlify.
- Netlify documents a 60-second synchronous function limit that is not configurable (configuration docs, checked 2026-10-15, read through a summarising tool). Other deployment checks moved to the optional deploy phase ([ADR-011](../adr/011-local-first-delivery.md)).
- Extracts came from a summarising tool, not a full read of each page.
