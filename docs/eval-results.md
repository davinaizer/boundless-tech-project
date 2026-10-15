# Eval results

Recorded runs of `pnpm eval` ([ADR-007](adr/007-test-strategy.md)): hand-written queries with expected filters (15 at the first run, 19 after the follow-up, 20 since the Brighton case), run against the real model, once each unless a section says otherwise. The cases are queries the author thought of, so a pass rate is a regression signal, not a measure of accuracy on real use. Each run is read next to the prompt version that produced it (`PROMPT_VERSION`, [roadmap](roadmap.md)).

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

## 2026-10-15, prompt `2026-10-15.5` against `2026-10-15.4` (follow-up to the first run)

Four cases were added before the prompt changed (`out-of-schema-cat`, `not-an-offer-question`, `mood-surprise-me`, `something-tomorrow`), so the set is now 19 cases. Each prompt was run three times on all 19, at `today` 2026-10-15.

| | `2026-10-15.4` | `2026-10-15.5` |
|---|---|---|
| Parse pass rate, three runs | 16/19, 16/19, 16/19 | 19/19, 19/19, 19/19 |
| Cases failing | `breakdown-cover`, `out-of-schema`, `out-of-schema-cat`, every run | none |
| Offers found by `breakdown-cover` | 1 | 2 |
| Offers found by `cinema-london`, `pizza-kids-manchester`, `spa-day-yorkshire` | 2, 2, 1 | 2, 2, 1 |
| Keyword fallbacks | 0 | 0 |

What changed in the prompt: a mood word, a pet or a general question names no category; an audience needs the request to say who is going; a keyword is one distinctive word, not a phrase. The scorer was not changed: "breakdown cover" really did lose one offer ("Breakdown recovery add-on, half price") against "breakdown", so the strict rule was reporting a real recall loss.

**Limits of this comparison**
- The new prompt names pets, so `out-of-schema` and `out-of-schema-cat` are no longer a clean held-out test: they are the family the rule was written for. The three other new cases already passed on `.4`, so they show no regression but no generalisation either.
- Unrecorded probe, one run each on `.5`, queries not in the case list: "where can I take my hamster", "a gift for my goldfish" and "fun for my parrot this weekend" all returned no fields. Seven queries, one sample each.
- One over-correction seen in that probe: "a quiet dinner for me" now gives `dining` with no audience, where "for me" could fairly be read as solo. Under-filling widens results, which was judged safer than inventing a field, but it is a trade-off and not covered by a case.
- All 19 cases are the author's; three runs per prompt are still a small sample.

## 2026-10-15, prompt `2026-10-15.5`: keywords-only baseline and the Brighton case

Two additions to the runner, no prompt change. The report now scores `keywordFallback` (no model) over the same cases with the same scorer, and the set gained `cheap-family-brighton` from `BUGS.md` (20 cases). One run, one sample per case, `claude-haiku-5-5`.

**Model: 19/20. Keywords only: 7/20.** 19 of 20 interpreted filters found at least one offer. 20895 input and 497 output tokens; slowest case 1577 ms (not a latency measure).

- **Where the model adds value:** all 12 cases that name a category, region, price, audience or tier fail the baseline and pass the model. The baseline cannot set any field but keywords, so this gap is by construction: it shows what the model is for, not how good the keyword match is.
- **The baseline's 7 passes are the no-invented-fields cases** (`out-of-schema`, `instruction-in-query`, `vague`, `out-of-schema-cat`, `not-an-offer-question`, `mood-surprise-me`, `something-tomorrow`). They pass because extra keywords are allowed and nothing else is set, so they say nothing about understanding the query.
- **The one model failure is the new case:** `cheap-family-brighton` got `maxPricePerPerson: 0` for "cheap", which finds 0 offers. This reproduces the `BUGS.md` report with the real model. It is recorded as it ran and not fixed here: the fix (a prompt change, a boundary guard, or both) is its own task. The baseline also fails this case, for the missing category, region and audience, not the price.
- **Limits:** the cases are the author's own, so 20/20 would still not be a measure of accuracy on real queries; the baseline is a floor, not a competitor.
