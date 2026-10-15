---
name: review-task
description: Review a finished implementation against its approved plan. Use when the developer asks for the review or verdict. Returns PASS or CHANGES REQUIRED; does not fix.
---

# Review Task

Judge the work against the approved plan first, then against `docs/architecture.md`, accepted ADRs and `AGENTS.md`. Do not infer scope from the diff.

## Steps

1. Locate the plan. Check each criterion against implementation and validation evidence.
2. Check quality only where the change touches it: correctness, boundary validation (Zod), AI boundary (ADR-002: no model-made offers, prices or terms; fallback on invalid output; no call on empty input), accessibility, secrets/personal data/real brands, doc accuracy.
3. Run the smallest validation needed to support the verdict.

## Rules

- Report only evidence-backed findings that matter to this task. No style preferences, no optional refactors, no future work beyond a one-line note.
- Each finding: **Issue**, **Evidence**, **Fix**. Blocking vs improvement.
- Do not implement fixes. Escalate if documents conflict or a decision is needed.

## Output

1. Blocking defects (omit if none)
2. Improvements (omit if none)
3. Criteria: pass/fail with evidence, one line each
4. Verification run
5. Verdict: exactly `PASS` or `CHANGES REQUIRED` (next stage: `implement-task`). Only `PASS` proceeds to `complete-task`.
6. **Next step**: end by suggesting the next skill. `PASS` → `complete-task`. `CHANGES REQUIRED` → `implement-task` to fix the blocking defects, then `review-task` again. Do not start it.
