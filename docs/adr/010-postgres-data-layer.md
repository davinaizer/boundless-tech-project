# ADR-010: Postgres adapter behind the search port

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Supersedes [ADR-004](004-data-layer.md).

## Context

[ADR-004](004-data-layer.md) chose an in-memory adapter behind a `SearchOffers` port because nothing needed persistence. On review, that leaves the backend with little data-layer evidence (no schema, migrations or query building), and a port with one adapter is an unproven abstraction.

Facts:
- The brief lists a database or persistence layer as optional ([brief](../brief/)).
- Netlify documents a serverless Postgres, Netlify Database, with Free-plan limits (3 databases, 5 GB, 48 compute units per billing period, sleep after 5 minutes idle). Per its docs it is available on credit-based plans; the Free plan is credit-based per the pricing page. Storage pricing after 1 July 2026 was not clear from the docs. Checked 2026-10-15.
- The catalogue is read-only fictional sample data.

Assumption: a real second adapter adds more evidence of backend design than it costs in time and setup friction.

## Options considered

1. **In-memory only (ADR-004).** Cheapest and nothing to run, but no data-layer evidence.
2. **Postgres adapter as the default, in-memory adapter kept.** A real second implementation of the port, and a no-database run path for tests and for reviewers. About 2 hours (estimate).
3. **SQLite file.** Simple locally, but native modules and file writes are awkward on serverless hosting.
4. **Postgres only.** Simplest code, but every test and every reviewer needs a database.

## Decision

**Option 2.**

- The adapter is chosen by configuration: Postgres when `DATABASE_URL` is set, in-memory when it is not.
- Typed `Filters` map to parameterised SQL in one module. The model never writes SQL or filter strings ([ADR-002](002-ai-boundary.md)). No ORM: the queries are few. Revisit if they multiply.
- Schema, migrations and a seed script load the same fictional catalogue. The driver and migration tool are chosen in the Phase 1 plan and must work with the hosted option if the app is deployed.
- One contract test suite runs against both adapters (category, price, region, tier, expiry, ordering). This is what shows the port is real.
- A search-service-backed adapter stays documented and not built ([architecture](../architecture.md)).
- Local Postgres runs in a container ([ADR-011](011-local-first-delivery.md)).

## Consequences

- Easier: data modelling, migrations and query safety are visible in the repository, and the port is exercised by two implementations.
- Harder: about 2 hours more than ADR-004, plus a container to run for the Postgres path and a CI service container for integration tests. This adds an integration test layer beside [ADR-007](007-test-strategy.md); its other decisions are unchanged.
- Accepted risk if deployed: connection handling on serverless and slow first queries after the database sleeps. Both are hypotheses, not measured.
- Failure path is built in: if Phase 1 does not meet its acceptance criteria in time, unset `DATABASE_URL` and ship the in-memory adapter with no rework.

## Weakest assumption

That reviewers value the database evidence more than the added setup. Mitigated by the in-memory default path. Evidence that would change this: Phase 1 overrunning badly, or the driver not working on the hosted database.

## Evidence

- [ADR-004](004-data-layer.md) for the original decision and the evidence limits on region, price and audience.
- Netlify Database usage and limits: https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/
- Netlify pricing: https://www.netlify.com/pricing/
