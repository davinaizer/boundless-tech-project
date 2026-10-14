---
name: implement-task
description: Implement one developer-approved task from an accepted plan. Use after plan-next-task approval when the developer asks to implement the planned work. Preserve the approved scope, escalate material decisions, validate the result, and hand off to review-task without issuing a verdict.
---

# Implement Task

## Purpose

Implement one small, developer-approved task. The approved plan is the implementation contract; product, architecture and material engineering decisions stay with the developer.

## Preconditions

Before changing files:

1. Confirm the developer explicitly approved a plan from `plan-next-task`.
2. Locate it in the conversation or in `docs/plans/`. Do not infer the contract from the diff, the TODO item or the request alone.
3. Confirm the plan's objective, scope, exclusions, assumptions, criteria and validation are still current.
4. Inspect repository state, including uncommitted changes, so the developer's work is not overwritten.
5. If the plan is missing, unapproved, stale or inconsistent with the repository, stop and ask for planning or a plan revision.

## Responsibilities

1. Keep the approved plan as the single source of scope and acceptance criteria.
2. Follow the authority order: brief, `docs/architecture.md`, accepted ADRs, `AGENTS.md`, `docs/TODO.md`, approved plan.
3. Implement the smallest coherent sequence that satisfies the criteria.
4. Preserve behaviour outside the scope. No unrelated cleanup, refactoring, features, dependencies or infrastructure.
5. Follow the repository's TypeScript, React, semantic HTML, accessibility, responsive, testing and composition patterns. Validate all external input at the boundary with Zod.
6. Respect the AI boundary in ADR-002: the model produces only filters and explanations over retrieved data. No secrets or personal data in code, tests or docs.
7. Update tests and documentation when the plan or the changed behaviour requires it.
8. Explain meaningful trade-offs that affect maintainability, behaviour, accessibility or validation.
9. Validate with the repository's `package.json` scripts through `pnpm`. Run the smallest relevant checks first, then broaden when the change warrants it.
10. Investigate failures with evidence. Fix defects the implementation introduced when the cause is clear, then rerun validation.
11. Record optional discoveries as future candidates instead of expanding the task.

## Implementation sequence

1. Baseline: inspect relevant files, tests, repository status and existing behaviour.
2. Map each completion criterion to the implementation area and intended evidence.
3. Implement in small, reviewable steps.
4. Check changed behaviour and nearby boundaries, including keyboard use, semantics, responsive layout and error states where applicable.
5. Run the plan's validation and proportional repository checks.
6. Review the diff for scope, accidental changes, dead code, warnings and documentation consistency.
7. Report what changed, what was validated, and any blockers or decisions required.

## Debugging

1. Reproduce the exact symptom with the smallest reliable feedback loop before changing anything.
2. Test one falsifiable hypothesis at a time.
3. Make the smallest root-cause fix within scope.
4. Rerun the reproduction and add a regression check at the relevant boundary when justified.
5. If the fix needs broader scope, a new dependency or an architectural change, stop and escalate.

## Boundaries

- Do not implement without an approved, current plan.
- Do not redefine or approve the plan.
- Do not broaden scope or pull in deferred work.
- Do not make product, architecture, dependency or deployment decisions silently.
- Do not overwrite or revert the developer's changes.
- Do not add speculative abstractions, infrastructure, dependencies or tests.
- Do not commit or create branches.
- Do not issue a review verdict or mark the task complete.

## Escalation

Stop and return control when documents conflict, the plan is no longer valid, the architecture or an ADR must change, a significant decision is required, or acceptance cannot be demonstrated within scope. State the evidence, the affected criterion, the impact, the smallest credible alternatives with trade-offs, and the decision required. Recommend an option when the evidence supports one.

## Output

A concise handoff:

1. Approved objective and result
2. Files or areas changed
3. Criteria traceability, where useful
4. Validation performed and outcome
5. Remaining blockers, assumptions, warnings and future candidates
6. A statement that the work is ready for `review-task`, with no verdict

If incomplete, report the exact blocker instead of claiming readiness.

## Completion criteria

- The approved objective and scope are implemented without unrelated changes.
- Every applicable criterion is satisfied or has an explicit blocker.
- Relevant validation passes proportionally.
- No known implementation-caused regression remains.
- The work is ready for formal review but has not been reviewed or marked complete.
