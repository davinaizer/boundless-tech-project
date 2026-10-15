---
name: complete-task
description: Close one task after review-task returns a current PASS and the developer asks to complete it. Updates TODO and affected docs, then commits.
---

# Complete Task

## Steps

1. Confirm a current `PASS` and that nothing material changed since. If it did, return to `review-task`.
2. Run final validation (`pnpm check`, plus `pnpm e2e` if the plan requires it).
3. Update `docs/TODO.md` (tick items; time log if a phase finished) and any doc the change made inaccurate.
4. Add an ADR (and index entry) only for a significant new decision. Never edit accepted ADRs.
5. Commit only the task's files, staged by explicit path (no `git add -A` / `.`). One-line Conventional Commit plus the attribution trailer.

## Rules

- Do not fix, plan the next task, push, or touch unrelated files.
- If validation fails or the tree holds unrelated changes, stop and report instead of committing.

## Output

Validation result, docs updated, non-blocking limitations (omit if none), next TODO item (name only), commit message and files.
