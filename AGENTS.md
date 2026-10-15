# Agent and contributor instructions

Working rules for anyone, human or AI, changing this repository. Keep it short; detail lives in the owning document.

## Purpose

A small full-stack AI app (a natural-language benefits finder) built as a technical challenge. Quality and clarity over completeness. Read [docs/brief](docs/brief/) for the brief.

## Where things live

| Need | Owner |
|---|---|
| Overview, setup, how AI is used, trade-offs | `README.md` |
| System design, diagrams, contracts | [docs/architecture.md](docs/architecture.md) |
| Why a decision was made | [docs/adr/](docs/adr/README.md) |
| Scope tiers, below-the-line items, scalability | [docs/roadmap.md](docs/roadmap.md) |
| Visual theme and mockups | [DESIGN.md](DESIGN.md), [docs/design/](docs/design/) |
| Evidence behind decisions | [docs/research/](docs/research/) |
| Work plan, phases, acceptance criteria | [docs/TODO.md](docs/TODO.md) |
| Task workflow skills | [.agents/skills/](.agents/skills/) |

Every durable concept has one owner. Define it there; elsewhere summarise and link.

## Working rules

- **Small, reversible steps.** One task per change, each with acceptance criteria in `docs/TODO.md`.
- **Decisions are explicit.** A decision that is hard to reverse or shapes the design gets an ADR when it is made. Accepted ADRs are not edited; supersede them.
- **Plans do not authorise implementation.** Implementation starts after the plan is approved by the repository owner.
- **Prior decisions are constraints.** Change one through a new ADR, not silently in code.
- **Evidence over assertion.** Label facts, user-supplied evidence, assumptions and inferences. Say "not verified" when it is not.
- **Simplicity first.** No abstraction, dependency or infrastructure without a demonstrated need.

## AI-assisted work

Delegation level follows consequence, reversibility and how well the result can be checked.

| Mode | When | Human responsibility |
|---|---|---|
| Human-led, AI explores | High consequence, novel, hard to verify (architecture, AI boundary, schemas) | Decide and own the result |
| AI executes with review | Bounded scope with meaningful checks (boilerplate, tests, docs drafts) | Set criteria, review the diff and evidence |

Accepted work needs: scope and acceptance criteria, verification proportionate to the change, review of assumptions and the meaningful diff, and any unresolved risk stated. Passing checks does not replace review.

Workflow per task: **plan → implement → review → complete**, using the skills in `.agents/skills/` (`plan-next-task`, `implement-task`, `review-task`, `complete-task`). They are adapted from an earlier project and trimmed to this repository's documents. Claude Code finds them through the `.claude/skills` symlink. Each stage hands off to the next and stops for developer approval where the skill says so.

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`). AI-assisted commits carry a `Co-Authored-By` trailer.
- **TypeScript:** strict mode. Validate all external input at the boundary with Zod.
- **Next.js:** rules in [ADR-009](docs/adr/009-nextjs-conventions.md). In short: `app/` is for routing; Server Components by default and `"use client"` only on small leaves; `server-only` on services, AI client and data; env vars read only in `src/lib/env.ts`; create no folder before it has content. Import boundaries are enforced by ESLint, so a failing lint is a rule violation, not a style issue.
- **AI boundary:** the model only produces filters and explanations over retrieved data. It never produces offers, prices, savings or terms ([ADR-002](docs/adr/002-ai-boundary.md)).
- **Sample data:** fictional partner names and labelled sample terms. No real brands attached to invented figures.
- **Secrets:** API keys in environment variables, server-side only. Never committed.
- **No personal data** in any tracked file.

## Validation

Once the project is scaffolded, run before handoff:

```sh
pnpm check   # typecheck, lint, unit tests
pnpm e2e     # Playwright happy paths, mock AI provider
```
