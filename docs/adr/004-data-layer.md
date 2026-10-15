# ADR-004: Data layer

- **Status:** Superseded by [ADR-010](010-postgres-data-layer.md)
- **Date:** 2026-10-14
- **Decision owner:** Davi

## Context

The catalogue is read-only sample data for this project. Observed behaviour of the public site suggests that at the company, offers are managed in a headless CMS and served from a hosted search index ([boundless-tech-stack](../research/boundless-tech-stack.md), [algolia-research](../research/algolia-research.md)). This comes from one dated observation of client behaviour, with no view of index settings.

## Options considered

1. **Typed seed behind a port, in-memory adapter.** About 15–30 minutes. Nothing to host.
2. **Postgres with an ORM.** About 1–1.5 hours (estimate) for schema, migrations, seeding, hosting and a CI test database, with no demonstrated need for writes.
3. **SQLite file.** Simple locally, but file-based writes and native modules are awkward on serverless hosting.

## Decision

**Option 1.**

- Define a `SearchOffers` port: `Filters` in, ranked `Offer[]` out. The in-memory adapter filters a seed module validated with Zod at load.
- A search-service-backed adapter is the documented production path and is **not built**. Any adapter translates typed filters into the backend's query syntax. The model never writes search-engine filter strings.
- Seed data uses **fictional partner names and clearly labelled sample terms**. Real brand names are not attached to invented offers, prices or savings.
- Each offer carries `tier`, an optional `expiryDate` (expired offers are hidden by default), `typicalSavingPerUse` and `assumedUsesPerYear` for the illustrative estimate. See the [offer model](../architecture.md#offer-model).

## Consequences

- No migrations, connection handling or test database.
- A reviewer may expect a database. The README states why there isn't one and what the adapter swap would involve.
- Positioning: the finder is a natural-language layer that produces the same structured filters a facet search would take.
- Only some filter fields are evidenced in the production index (categories, expiry, and probably membership level). Region, price and audience exist only in the sample data. In production they would need index enrichment or would be passed as free text.

## Weakest assumption

That production offers are served from a search index as observed on the public site. If the source differs (for example a relational database), a different adapter is a contained change behind the port.

## Evidence

- [boundless-tech-stack](../research/boundless-tech-stack.md)
- [algolia-research](../research/algolia-research.md)
- [boundless-company-profile](../research/boundless-company-profile.md)
