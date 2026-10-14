---
name: complete-task
description: Complete one accepted task. Use only after review-task returns a current same-scope PASS and the developer asks to close the task. Verify final state, update docs/TODO.md and affected documentation, and commit the task without planning the next one.
---

# Complete Task

## Purpose

Close the accepted task cleanly without starting or planning another.

## Inputs

- The developer-approved plan.
- A `PASS` verdict from `review-task` for the current state.
- The accepted implementation and final repository state.

## Responsibilities

1. Confirm `review-task` returned `PASS` for the approved plan and that nothing material changed since.
2. Confirm the completion criteria and the final validation results.
3. Verify the repository still builds and works.
4. Update `docs/TODO.md`: tick the completed items and fill the time log row if the phase is finished.
5. Update documentation only where the accepted implementation made it inaccurate.
6. If the task introduced a significant decision, record it as a new ADR in `docs/adr/` and add it to the index. Do not edit accepted ADRs; supersede them.
7. Identify the next candidate as the next incomplete item in `docs/TODO.md`, without planning it.
8. Report completion, validation, documentation changes and known non-blocking limitations.
9. When every criterion is met and validation is green, commit the task's changes as the final action.

## Boundaries

- Do not implement fixes or close a task without `PASS`.
- Do not plan the next task.
- Do not make new product, architecture or engineering decisions.
- Do not modify unrelated files.
- Do not push.
- Commit only the task's own files: the reviewed implementation plus this stage's documentation updates. Check `git status` and `git diff`, and stage those paths explicitly. Never use `git add -A` or `git add .`.
- If validation fails, or the working tree holds anything beyond the task's files that cannot be safely excluded, stop and surface it instead of committing.

## Escalation

Stop and return control when documents conflict, the architecture or an ADR would need to change, a significant decision is required, or the approved scope is no longer valid. Any material change after `PASS` invalidates it: return the work to `review-task`.

## Commit format

Conventional Commits v1.0.0, one line: `type(scope): short imperative description`. Choose `type` from the nature of the change (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`) and `scope` from the affected area. Keep it short; the plan, review and `docs/TODO.md` carry the detail. Append the attribution trailers required by `AGENTS.md` and the session.

## Output

1. Completion result
2. Validation confirmed
3. Execution and documentation updates
4. Known non-blocking limitations
5. Next candidate, without scope or planning
6. The commit made (message and included files)

The commit is the final action. The workflow ends there.

## Completion criteria

- The task satisfies its approved plan and final validation passes.
- `docs/TODO.md` and affected documentation are accurate.
- Significant decisions are recorded as ADRs.
- The next task has not been planned or started.
- The task's changes are committed with a Conventional Commits message, and nothing outside the task's files was included.
