# ADR-011: Local-first delivery, containers with Podman, deployment at a gate

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Supersedes the hosting decision in [ADR-003](003-stack-and-hosting.md) and narrows the scope of [ADR-006](006-demo-protection.md).

## Context

Facts:
- The brief lists deployment as optional and says a recorded demo (Loom or similar) is fine ([brief](../brief/)).
- Podman is installed on the author's machine (author-supplied).
- Netlify's Free plan has hard monthly limits and pauses the site when they are reached; its synchronous function limit is 60 seconds and not configurable. Vercel Hobby allows 300 seconds and is limited to non-commercial, personal use. Checked 2026-10-15.
- A public deployment puts a paid model key behind an endpoint, which needs the controls in ADR-006.

Assumption: a recorded demo is received as well as a live one.

## Options considered

1. **Deploy as a core task (ADR-003).** A live link, but the platform spike, the public-endpoint controls and the deploy step are all on the critical path.
2. **Local-first, deploy at a gate.** The recorded demo is the guaranteed deliverable. A live deployment is added only if the work is complete.
3. **Containerise the whole app.** One-command reviewer setup, but extra Dockerfile work for no demonstrated need.

## Decision

**Option 2.**

- **Containers:** Podman runs Postgres only. The app runs with `pnpm dev`. A `compose.yaml` (engine-neutral Compose spec) defines the database; `podman compose` and `docker compose` are equivalent. Images use fully qualified names (for example `docker.io/library/postgres:<major>`) so Podman does not prompt for a registry. The Postgres major version should match the hosted option and is confirmed in Phase 0. On macOS, Podman needs its machine running (`podman machine start`). Which Compose provider is installed on the author's machine is unverified; if none works, plain `podman run` scripts replace the Compose file.
- **No-container run path:** with `DATABASE_URL` unset the app uses the in-memory adapter ([ADR-010](010-postgres-data-layer.md)).
- **Real AI without a deployment:** the recorded demo shows the real model. Reviewers who run the app locally use the mock provider, or their own API key.
- **Order of work:** build locally, record the demo, then decide on deployment.
- **Deploy gate:** deploy only when Phases 0 to 5 are complete and the demo is recorded.
- **If deployed:** Netlify is the target and Vercel the fallback (as in ADR-003). The ADR-006 controls (rate limit, provider spend limit) are built then. Smoke test against `/api/health` and tag the release.
- **Always:** the model key stays server-side, and the input cap is built.

## Consequences

- Easier: no platform spike on the critical path, no public key exposure by default, and less to build before the demo.
- Harder: no live link unless the gate is passed, and reviewers need a key or the mock to see AI behaviour themselves.
- [ADR-009](009-nextjs-conventions.md) rule 15 (pinned version and `proxy.ts` against the Netlify adapter) and the `proxy.ts` check it assigns to the Phase 0 spike now apply in the optional deploy phase.
- The Phase 0 Netlify spike is replaced by checks that matter locally (Podman Compose provider, Postgres version). Remaining deployment checks (pnpm detection on Netlify, database connectivity from a function) move to the optional deploy phase.

## Weakest assumption

That a recorded demo is received as well as a live one. The brief says so, but how it is weighed is unknown. If a live link matters more than expected, the cost of passing the gate is the optional deploy phase in the plan.

## Evidence

- [brief](../brief/) for deployment as optional and the recorded-demo wording.
- Netlify functions configuration: https://docs.netlify.com/build/functions/configuration/
- Netlify pricing: https://www.netlify.com/pricing/
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
