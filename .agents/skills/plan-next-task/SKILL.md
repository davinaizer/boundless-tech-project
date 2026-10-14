---
name: plan-next-task
description: Plan one task for developer approval. Use before implementation when the developer asks what to do next, requests a task plan, or selects an incomplete item in docs/TODO.md. Establish project position, scope, completion criteria and validation without modifying files.
---

# Plan Next Task

## Purpose

Turn the current state of `docs/TODO.md` or a developer-selected objective into one small implementation plan for developer approval.

## Authority order

Brief (`docs/brief/`) → `docs/architecture.md` → accepted ADRs (`docs/adr/`) → `AGENTS.md` → `docs/TODO.md` → approved plan → implementation evidence. A higher source wins over a lower one.

## Inputs

- The task named by the developer, otherwise the next valid incomplete item in `docs/TODO.md`.
- Relevant architecture, ADRs, code, tests and repository state.

## Responsibilities

1. Establish the developer's position: current phase, most recent relevant completed outcome, candidate task, and the immediate downstream outcome.
2. Confirm the candidate task is not complete or superseded, by checking `docs/TODO.md` and repository evidence.
3. Apply one gate before planning. Confirm the task:
   - supports the brief's objectives and the current phase in `docs/TODO.md`;
   - preserves `docs/architecture.md` and accepted ADRs;
   - has a small, independently reviewable scope; and
   - has no unresolved material decision.
4. Inspect only the evidence needed. Read wider documents only when the task could affect architecture, dependencies, deployment or public behaviour.
5. Define an observable objective; scope and exclusions; affected areas; assumptions, risks, blockers and material unknowns.
6. For each completion criterion, define the observable outcome and the proportional evidence that will demonstrate it. Use manual verification when automation is not justified.
7. Propose the smallest coherent implementation sequence.
8. Present one plan and wait for the developer to approve or revise it.

## Boundaries

- Do not implement or modify files while planning.
- Do not approve the plan on the developer's behalf.
- Do not plan multiple future tasks in detail.
- Do not broaden scope, reopen accepted ADRs without new evidence, or propose speculative abstractions.

After explicit approval, save the plan in `docs/plans/` only when it has a material decision, several acceptance criteria, or expected multi-session work. Otherwise do not create a plan file.

## Escalation

Stop and return control to the developer when documents conflict, the architecture or an ADR would need to change, the brief appears not to cover the task, a significant decision is required, or the task scope is no longer valid. State the evidence, the impact and the decision required, without resolving it.

## Output

One concise plan:

1. Project position (four bullets: **Completed**, **Current**, **Next outcome**, **Workflow stage**; use `Undefined` when it cannot be established from evidence)
2. Task objective and current evidence
3. Scope and explicit exclusions
4. Assumptions, risks, blockers and required decisions
5. Completion criteria
6. Implementation sequence
7. Validation

The approved plan is the implementation contract and the `review-task` baseline.

## Completion criteria

- The task is small, coherent, evidence-backed and testable.
- Material unknowns are resolved or returned to the developer.
- The developer has approved the plan.
- No files were changed.
