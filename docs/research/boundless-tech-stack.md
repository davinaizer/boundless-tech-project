# Boundless: observed technology stack

- **Date observed:** 2026-10-14
- **Provenance:** analysis supplied by the project author from the public homepage's response headers, HTML and Content-Security-Policy (CSP). Not independently reproduced.
- **Purpose:** inform stack and integration decisions (see [ADR-003](../adr/003-stack-and-hosting.md), [ADR-004](../adr/004-data-layer.md), now superseded by [ADR-010](../adr/010-postgres-data-layer.md), and [ADR-011](../adr/011-local-first-delivery.md)).

## Observed

| Layer | Technology | Basis |
|---|---|---|
| Framework | Next.js, React, App Router | `x-powered-by`, `x-nextjs-*` headers, `/_next/static/` assets |
| Hosting / CDN | Netlify | `server` and `x-nf-*` headers, cache status |
| Rendering | Static prerender with revalidation (ISR) | `x-nextjs-prerender`, `x-nextjs-stale-time` |
| Headless CMS | Storyblok | Asset URLs, visual-editor frame policy, preview cookie |
| Carousels | Swiper | References in the HTML |
| Search | Algolia, for site search and offer/content listings | Client-side calls; see [algolia-research](algolia-research.md) |

## Services allowed by the CSP

Listed by category. The CSP is a superset of what runs on any one page, so presence here does not prove use.

| Category | Services |
|---|---|
| Auth / data | Supabase |
| CRM and forms | Microsoft Dynamics 365, Azure-hosted endpoints |
| Payments | Stripe |
| Bot protection | Cloudflare Turnstile |
| Address lookup | Loqate |
| Monitoring | Datadog (browser RUM) |
| Analytics and experimentation | Google Tag Manager, GA4, A/B testing, session recording, live chat |
| Consent | OneTrust |
| Embeds | Third-party booking widgets, Vimeo, YouTube, Google Maps |

The CSP is in report-only mode and reports violations to a custom Next.js API route.

## Not determined

- Exact Next.js and React versions.
- CSS approach (Tailwind, CSS Modules or other): chunk names are hashed.
- Subdomains (for example the join flow) may use a different stack.
- Algolia index settings and whether records carry region, price or audience fields (see [algolia-research](algolia-research.md)).

## Implications for this project

- Next.js App Router with TypeScript matches the observed framework.
- Offers appear to come from a CMS and be served from a search index, not a database owned by the front end. The data layer is therefore a port with adapters ([ADR-010](../adr/010-postgres-data-layer.md)).
- Netlify hosting makes Netlify the preferred deployment target if the app is deployed ([ADR-011](../adr/011-local-first-delivery.md)).
- Keyword and category-facet discovery already exists, so the finder's value is the natural-language intent layer and the value-for-fee estimate, not search as such.
