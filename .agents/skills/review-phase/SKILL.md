---
name: review-phase
description: Check a finished phase for architecture drift before the next phase is planned. Use when the developer asks for the phase checkpoint. Read-only; returns ALIGNED or DRIFT.
---

# Review Phase

`review-task` judges one task against its plan. This skill judges the whole phase against the design, because drift builds up across tasks. Run it in a fresh session, not the one that wrote the code.

Authority order: brief → `docs/architecture.md` → accepted ADRs → `AGENTS.md` → `docs/TODO.md`. Higher wins.

## Steps

1. Confirm every item of the phase is ticked or consciously deferred, and the tree is clean.
2. Compare the actual folder tree with the target in `docs/architecture.md`. A folder exists only if it has content ([ADR-009](../../../docs/adr/009-nextjs-conventions.md)).
3. Run `pnpm check`. Spot-check that one deliberate import-boundary violation still fails the lint, then undo it.
4. Compare the schemas and types in `src/domain` with the Contracts section of the architecture.
5. For each accepted ADR the phase touched: followed or deviated from. List decisions made in code that no document records.
6. Check ticks, the time log, the README status and layout, and the architecture against what was built.

## Rules

- Read-only apart from the throwaway lint check in step 3. Do not fix, plan the next phase, or commit.
- Report only evidence-backed drift. No style preferences or future work beyond a one-line note.
- Each finding: **Issue**, **Evidence**, **Resolution**, where the resolution is one of: fix the code, fix the document, or write a superseding ADR. Accepted ADRs are not edited.

## Output

1. Drift findings (omit if none)
2. Unrecorded decisions (omit if none)
3. Checks run and their result, one line each
4. Verdict: exactly `ALIGNED` or `DRIFT`. Only `ALIGNED` proceeds to `plan-next-task` for the next phase.
