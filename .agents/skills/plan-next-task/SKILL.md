---
name: plan-next-task
description: Plan one task for developer approval. Use when the developer asks what to do next or selects an item in docs/TODO.md. Read-only; no files are modified.
---

# Plan Next Task

Turn the next incomplete item in `docs/TODO.md` (or the developer's chosen objective) into one small plan for approval.

Authority order: brief → `docs/architecture.md` → accepted ADRs → `AGENTS.md` → `docs/TODO.md`. Higher wins.

## Steps

1. Confirm the task is incomplete and fits the current phase, architecture and ADRs.
2. Read only the evidence the task needs.
3. Define the objective, scope, exclusions, and criteria with the cheapest proportional evidence for each.
4. Present the plan and wait for approval.

## Rules

- Do not modify files or plan beyond this one task.
- Surface only risks, blockers and decisions that affect this task. If an ADR or document conflict blocks it, stop and say what decision is needed.
- Save to `docs/plans/` only for multi-session or decision-heavy work.

## Output

1. **Position**: completed, current, next
2. **Objective** and scope / exclusions
3. **Risks or decisions needed** (omit if none)
4. **Criteria**, each with its evidence
5. **Sequence** and **validation**
6. **Next step**: end by suggesting the developer approve the plan and run `implement-task`. Do not start it.
