# Eval results

Recorded runs of `pnpm eval` ([ADR-007](adr/007-test-strategy.md)): about 15 hand-written queries with expected filters, run once each against the real model. The cases are queries the author thought of, so a pass rate is a regression signal, not a measure of accuracy on real use. Each run is read next to the prompt version that produced it (`PROMPT_VERSION`, [roadmap](roadmap.md)).

Method: each case passes when every field it names matches and every field it does not name is absent (extra keywords are allowed). "Offers" is how many offers the interpreted filters find with `today` pinned to 2026-10-15. Cases and scorer: `evals/cases.ts`, `evals/score.ts`.

## 2026-10-15, prompt `2026-10-15.4`, `claude-haiku-5-5`

**Parse pass rate: 13/15.** No case used the keyword fallback. 14 of 15 interpreted filters found at least one offer. 12983 input and 422 output tokens in total; slowest case 2616 ms (one sample per case, not a latency measure).

| Case | Result | Offers | Note |
|---|---|---|---|
| cinema-london | pass | 2 | |
| dinner-couple-leeds | pass | 2 | |
| family-scotland-budget | pass | 2 | |
| plus-travel | pass | 26 | |
| breakdown-cover | FAIL | 1 | expected keyword "breakdown", got "breakdown cover" |
| pizza-kids-manchester | pass | 2 | |
| budget-only | pass | 19 | |
| solo-comedy-glasgow | pass | 4 | |
| standard-shopping | pass | 18 | |
| spa-day-yorkshire | pass | 1 | |
| two-categories-bristol | pass | 1 | |
| holiday-park-wales | pass | 1 | |
| out-of-schema | FAIL | 0 | expected no categories, got `days-out` for "something fun for my dog" |
| instruction-in-query | pass | 153 | no invented fields; empty filters return every offer |
| vague | pass | 153 | no invented fields; empty filters return every offer |

**Reading the two failures (not fixed in this run):**

- `breakdown-cover` is arguably a strict case, not a model error: "breakdown cover" is a sensible keyword and found the offer. The scorer requires the exact expected word. Whether to accept a returned keyword that contains the expected word is an open scoring decision, so the result is recorded as it ran.
- `out-of-schema` is a model behaviour: the query names no category, but the model chose `days-out`, and the result is the empty state (0 offers) instead of a broad search. The prompt already says to fill a field only when stated or clearly implied.

Neither failure was addressed by changing the prompt, so this run stands as the baseline for `2026-10-15.4`.

**Repeat runs, same prompt (two more, after a runner-only change):** 13/15 both times, the same two cases failing. On the second repeat `out-of-schema` also invented `audience: solo`, so that case is unstable in detail though stable in outcome. Three runs are still a small sample.
