---
name: review-task
description: Review a finished implementation against its approved plan and repository quality requirements. Use when the developer requests the formal task review or verdict after implementation. Return PASS or CHANGES REQUIRED without implementing fixes.
---

# Review Task

## Purpose

Determine whether the completed implementation satisfies the approved plan and the repository's quality requirements.

## Inputs

- The developer-approved plan.
- The implementation and task-scoped changes.
- Relevant architecture, ADRs, code, tests, documentation and validation evidence.

## Responsibilities

1. Locate the approved plan. Do not infer scope from the implementation or diff.
2. Review the **task contract** first: compare the work with the objective, scope, exclusions, criteria and required validation. For each criterion, record the implementation evidence, the validation evidence and the result.
3. Review **engineering quality** second, against `docs/architecture.md`, accepted ADRs and `AGENTS.md`. Evaluate correctness, TypeScript safety, input validation at boundaries, accessibility, responsive behaviour, maintainability, testing, regressions, documentation accuracy and unnecessary complexity where applicable.
4. Check the AI boundary (ADR-002): the model produces only filters and explanations over retrieved data, never offers, prices, savings or terms; invalid output has a defined fallback; empty input makes no model call.
5. Check for secrets, personal data and real brands attached to invented figures.
6. Keep contract findings and quality findings distinct so quality preferences do not redefine the approved scope.
7. Confirm the plan, implementation, affected documentation and validation evidence are consistent.
8. Run the smallest validation set needed to support the verdict.
9. Report only evidence-backed findings.

Every finding states: **Issue**, **Evidence**, **Impact**, **Recommended fix**.

Classify findings as: 1. Blocking defects, 2. Improvements, 3. Future work.

## Boundaries

- Do not implement fixes or change task state.
- Do not infer requirements from the implementation.
- Do not expand scope, require unrelated refactoring, or fail the task for optional future work.
- Do not proceed to completion while a blocking defect remains.

## Escalation

Stop and return control when documents conflict, the architecture or an ADR would need to change, a significant decision is required, or the approved scope is no longer valid. Say why no valid verdict can be given and which decision is required.

## Output

In order:

1. Blocking defects
2. Improvements
3. Future work
4. Criteria traceability (criterion, implementation evidence, validation evidence, result)
5. Verification performed
6. Final verdict, exactly `PASS` or `CHANGES REQUIRED`

If `CHANGES REQUIRED`, set the next stage to `implement-task`. Only `PASS` may proceed to `complete-task`.

## Completion criteria

- Every applicable criterion was assessed against evidence.
- Findings are classified and actionable.
- Verification is recorded.
- The verdict and next stage are unambiguous.
