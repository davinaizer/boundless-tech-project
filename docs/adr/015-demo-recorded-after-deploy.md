# ADR-015: Record the demo after the optional deploy, with Phase 6 time-boxed

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

Supersedes two bullets of [ADR-011](011-local-first-delivery.md): "Order of work" (build locally, record the demo, then decide on deployment) and "Deploy gate" (deploy only when Phases 0 to 5 are complete and the demo is recorded). The rest of ADR-011 stands: local-first, Podman for Postgres only, Netlify as the target with Vercel as the fallback, and the ADR-006 controls built if deployed.

## Context

Facts:
- Phases 0 to 5 are complete except the recorded demo. CI is green and the README setup paths were run in a clean clone.
- ADR-011 put the recorded demo before any deploy work, so it could not be put at risk by an optional phase.
- The brief accepts a recorded demo or a live one, and says time spent should stay near 6 to 8 hours ([brief](../brief/)). The plan is already about 12 hours (see [TODO](../TODO.md)).
- Phase 6 is estimated at about 0.75 hours, outside the total, and is optional.

Assumption: a demo recorded against the deployed app is worth more to a reviewer than one recorded locally, because it can show the live link.

## Options considered

1. **Keep ADR-011's order.** Record the demo locally, then deploy. The demo is safe, but it may have to be recorded again, or left showing localhost, if the deploy goes ahead.
2. **Deploy first, then record, with Phase 6 time-boxed.** The demo can show the live link and is recorded once. The cost is that the guaranteed deliverable moves behind an optional phase, so an overrun puts it at risk.
3. **Drop the demo if the deploy works.** Rejected: a live link needs a key or a mock to see the AI behave, and the brief names the demo as a deliverable.

## Decision

**Option 2**, with these limits:

- **Order:** Phases 0 to 5 (except the demo) complete, then Phase 6, then the demo. Inside Phase 6 the ADR-006 controls (rate limit, provider spend limit) come before the deploy, as the TODO already orders them.
- **The demo is still due.** It is not optional and not replaced by a live link. The README keeps its *Pending* marker for the demo until the link is added.
- **Time-box:** Phase 6 stops at twice its estimate, 1.5 hours (a heuristic, not evidence). At that point the deploy is abandoned, the reason is recorded in the TODO, and the demo is recorded locally exactly as ADR-011 planned.
- **Fallback:** if Netlify does not work and Vercel does not fit the box either, the same rule applies.
- **No change to the product or to the AI boundary.** This is only the order of work.

## Consequences

- Easier: the demo is recorded once, against whatever is the final state, and can show the live link.
- Harder: the deliverable the project calls guaranteed is now last. An unplanned overrun, or a decision to keep tuning, could leave it unrecorded; the time-box and the fallback exist for that reason.
- The public-endpoint controls are built before the demo, so the paid key is never behind an unprotected endpoint during recording.
- The Phase 6 gate in [TODO](../TODO.md), the README and the roadmap change to match. ADR-011's body is not edited; its status line points here.

## Weakest assumption

That Phase 6 stays inside the time-box. The platform checks (pnpm detection, database connectivity from a function, the commit variable for the version string) have not been run yet. If the first of them fails badly, the evidence for stopping is that the box was exceeded, and the plan returns to a local demo with no loss beyond the time spent.

## Evidence

- [ADR-011](011-local-first-delivery.md) for the order of work and gate being superseded.
- [brief](../brief/) for deployment as optional and the time expectation.
- [TODO](../TODO.md) Phase 6 for the estimate (about 0.75 hours).
