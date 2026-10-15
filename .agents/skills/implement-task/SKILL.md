---
name: implement-task
description: Implement one developer-approved task from its plan. Use after plan approval. Stays in scope, validates, hands off to review-task without a verdict.
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
- Do not commit, branch, or issue a review verdict.

## Output

Short handoff: what changed, validation result, blockers or open decisions (omit if none), and "ready for review-task". End by suggesting the developer run `review-task`; if a blocker or open decision remains, say it must be resolved first. Do not start the review.
