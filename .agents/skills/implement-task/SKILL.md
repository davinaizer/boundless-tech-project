---
name: implement-task
description: Implement one developer-approved task from its plan. Use after plan approval. Stays in scope, validates, then invokes review-task automatically. Issues no verdict itself.
---

# Implement Task

The approved plan is the contract. Stop and ask if it is missing, unapproved, or stale.

## Steps

1. Check repo state so the developer's uncommitted work is not overwritten.
2. Implement the smallest change that meets the criteria, following `AGENTS.md` conventions and ADRs (incl. the AI boundary in ADR-002).
3. Add or update tests and docs only where the change requires it.
4. Run the plan's validation (`pnpm` scripts), smallest checks first.
5. Fix failures you caused; investigate with evidence, one hypothesis at a time.

## Rules

- No unrelated cleanup, features, dependencies or abstractions. Note discoveries as future candidates instead.
- No silent product, architecture or dependency decisions. If one is needed, stop with the evidence, options and a recommendation.
- Do not commit or branch.
- Do not issue a verdict yourself; the verdict comes only from `review-task`.

## Output

Short handoff: what changed, validation result, and blockers or open decisions (omit if none).

## Review (automatic)

When the handoff is written, invoke `review-task` with the Skill tool, without waiting for the developer. Do not edit code between the handoff and the review.

Skip the automatic review, and say why, only when:

- a blocker or open decision remains, so it must be resolved first;
- the plan's validation fails for a reason you could not fix.

Report the `review-task` result as returned. Do not fix findings in the same run; `CHANGES REQUIRED` goes back to the developer, who decides whether to re-run `implement-task`.
