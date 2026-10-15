# Roadmap: scope tiers and what comes next

What is built, what is optional, and what is deliberately left out of this exercise, with the trade-off for each. Items below the line are documented so the omission is a visible decision, not a gap.

Status of evidence: the scope decisions are judgements made against an 8-hour budget. Time figures are estimates, not measurements. Statements about production needs are hypotheses until measured.

## Tiers

| Item | Tier | Built as |
|---|---|---|
| Observability | In scope, minimal | One structured JSON log line per request, to stdout |
| Health check | In scope, minimal | `GET /api/health`, no model call |
| App version in the UI | In scope, small | `v<package version>+<build>.<short sha>` in the footer and on `/api/health` |
| Prompt and schema version | In scope, trivial | `PROMPT_VERSION` constant, logged and written into eval output |
| OpenAPI contract | Optional | `openapi.json` generated from the Zod schemas, only if time allows |
| Analytics | Below the line | Documented, not built |
| API versioning (`/v1`) | Below the line | Documented, not built |
| Scalability and future improvements | Documented only | This file |

## In scope

### Observability

- **Built:** each route handler writes one JSON line to stdout: request ID, endpoint, latency, number of model calls (0 or 1), input and output token counts, whether the keyword fallback ran, and the outcome. Netlify and Vercel capture stdout.
- **Why:** cost per query and fallback rate are the two numbers that show whether the AI layer works and what it costs. The same fields make the eval comparable with live behaviour.
- **Privacy:** query text is never logged. Logging it needs a data-protection review (see [architecture](architecture.md)).
- **Not built:** tracing, OpenTelemetry, dashboards, alerts. They need a backend to send to and would show nothing on a demo with no traffic.
- **Trade-off:** logs only show what was thought of in advance, and stdout logs on serverless are short-lived. Accepted for a demo.
- **Production:** the supplied research lists Datadog browser monitoring on the company site ([research](research/boundless-tech-stack.md), not independently verified). The assumption is that this would feed existing monitoring, not add a tool. Add cost alerts and a parse-accuracy measure on real queries.

### Health check

- **Built:** `GET /api/health` returns `{ status: "ok", version }`. The Phase 0 deploy spike needs a minimal route handler anyway, so this is that handler. The Phase 4 smoke test calls it.
- **Not built:** a readiness check that calls the model. It would spend money on every probe and open the abuse path that [ADR-006](adr/006-demo-protection.md) closes.
- **Trade-off:** on serverless the platform manages liveness, so the endpoint mostly serves the smoke test and the version string. It proves the deploy is up, not that the model is reachable.
- **Production:** uptime monitoring, and a dependency check that does not call the model per probe (for example a cached last-success timestamp).

### App version in the UI

- **Format:** `v0.5.3+654.9602a29` is the package version, then build metadata: a build number and the short commit SHA. The format follows SemVer's build-metadata convention.
- **Built:** computed at build time in `next.config` into a public environment value, shown in the footer, returned by `/api/health` and written into logs. The package version is bumped by hand at release (`pnpm version`) and the submission is tagged `v0.1.0`.
- **Why:** a reviewer, or a bug report, can be tied to an exact build.
- **Open points to settle in the Phase 0 spike:** which build number to use (a commit count from git history, or a CI run number) and which environment variable carries the commit on Netlify. If either is unavailable the footer falls back to `dev` for that part and the build still passes.
- **Not built:** automated release versioning or a generated changelog. Conventional Commits are in place, so a changelog can be generated later.

### Prompt and schema version

- **Built:** a `PROMPT_VERSION` constant, logged per request and recorded in each eval run.
- **Why:** the prompt and the `Filters` schema are part of the app's behaviour. An eval result is only meaningful next to the prompt that produced it.

## Optional

### OpenAPI contract

- **Plan:** generate `openapi.json` from the Zod schemas if time allows, so the Zod schemas stay the single source of truth.
- **Why optional:** the only consumer is the app's own UI, deployed with the API. The endpoints are already documented in [architecture](architecture.md).
- **Risk:** a hand-written spec drifts from the code. A generator adds a dependency.
- **Unverified:** whether current generator libraries support the Zod version in use. Check before committing to one.
- **Estimate:** 30 to 45 minutes.

## Below the line

### Analytics

- **Not built:** product analytics (page views, funnels).
- **Why:** a demo has no real users to measure. Common analytics tools set cookies, which brings a consent banner under UK PECR, and query text is potentially personal.
- **Worth measuring in production:** zero-result rate, chip-edit rate (a proxy for the model misreading a query) and fallback rate. These can be aggregate counters from the same logs, with no user identifiers.
- **Trade-off:** no evidence about how people use the finder. Acceptable because there are no users yet.

### API versioning (`/api/v1`)

- **Not built.**
- **Why:** one first-party consumer deployed in lockstep. A version segment adds a path component and no benefit until a second consumer exists.
- **Revisit when:** a client outside this repository calls the API, or a breaking change must be rolled out gradually.

## Scalability and future improvements

No load data exists. The items below are hypotheses about where limits would appear, not findings.

| Possible limit | Status | What would confirm it | Possible response |
|---|---|---|---|
| Model latency and cost per query | Cost per query is estimated in [ADR-005](adr/005-llm-provider.md); latency not measured | Token and latency fields from the logs | Cache repeated interpretations; stream explanations |
| In-memory rate limit does not hold across serverless instances | Known limitation ([ADR-006](adr/006-demo-protection.md)) | Abuse observed beyond the provider spend limit | Shared store for counters |
| In-memory catalogue | Fine for sample data | A real catalogue larger than memory or changing often | Search-service-backed adapter ([ADR-004](adr/004-data-layer.md)) |
| Filters beyond category, expiry and tier | Only those are evidenced in the production index | Index inspection | Index enrichment, or handle as free-text query |
| Parse accuracy on real queries | Eval is a hand-written regression check | Logged fallback and chip-edit rates | Larger eval set; prompt changes tracked by `PROMPT_VERSION` |

### Next.js hardening if this became a production service

Not built. Source for each: official Next.js docs, summarised in [nextjs-practices](research/nextjs-practices.md). On Netlify, skew protection is opt-in through an environment variable and the cache is platform-managed ([research](research/nextjs-practices.md#netlify-support-checked-2026-10-15)); the other items were not mapped to Netlify.

| Item | Revisit when |
|---|---|
| Content Security Policy | Before any public launch beyond the demo |
| Formal Data Access Layer with a DTO per query and authorization | User-specific data or authentication is added |
| Shared cache handler with `refreshTags()`, shared `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId` | Self-hosting on more than one instance, or rolling deploys causing stale-client errors |
| Reverse proxy with streaming buffering disabled, graceful shutdown | Self-hosting the Node server |
| `instrumentation.ts` and OpenTelemetry | Real traffic and a backend to send to (see Observability) |
| Taint APIs (experimental) | A DAL exists and sensitive objects flow near Client Components |
| CODEOWNERS, bundle-size check in CI, monorepo tooling | More than one contributor or deployable |

Other improvements, none built:
- Check whether the search service's own AI features already cover natural-language queries before extending this layer.
- Authentication, embeddings, real data and CMS integration remain out of scope ([architecture](architecture.md)).

## When to revisit

- A second API consumer appears: reconsider versioning and OpenAPI.
- Real traffic exists: add the analytics counters and move logs to the company's monitoring.
- The role leans toward platform work: observability moves up the list.
