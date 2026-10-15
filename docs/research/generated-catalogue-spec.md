# Generated catalogue spec

The spec and generation instruction used once, offline, to generate `src/data/generated-offers.json` ([ADR-013](../adr/013-ai-generated-sample-data.md)). Everything in that file is fictional sample data: invented partners, labelled sample terms. Generated 2026-10-15 with Claude (Opus 5.5) in a Claude Code session: the model wrote the offers as one delimited line each, and a throwaway script (not committed) turned them into JSON and numbered the ids. Then checked by the invariant and denylist tests and reviewed by the author.

## Spec

| Field | Rule |
|---|---|
| Count | 150 offers, 25 per category (`days-out`, `dining`, `shopping`, `travel`, `motoring`, `events`) |
| `id` | `offer-025` to `offer-174`, after the 24 hand-written offers |
| `partner` | Invented, unique across the whole catalogue, not a real UK brand or a near copy of one |
| `title` | Short, plain, names the activity or product ("Zoo entry, kids go free"), so keyword search on titles finds it |
| `region` | One of the 12 UK ITL1 regions (`North East`, `North West`, `Yorkshire and The Humber`, `East Midlands`, `West Midlands`, `East of England`, `London`, `South East`, `South West`, `Wales`, `Scotland`, `Northern Ireland`) or `UK-wide`; every value used, spread roughly evenly |
| `tier` | About 70% `standard`, 30% `plus` |
| `audience` | One to three of `solo`, `couple`, `family`; every audience present in every category |
| `typicalPricePerPerson` | Pounds, above 0, within the category band below |
| `typicalSavingPerUse` | Pounds, at least 0 and below the price, following the discount pattern in the title |
| `assumedUsesPerYear` | A plausible whole number for the offer (a hotel break once, coffee weekly) |
| `expiryDate` | About 10% already expired on 2026-10-15, some dated in the future, the rest undated |
| Discount patterns | Real-world shapes: two for one, percentage off, kids go free, off-peak or midweek, nth visit free |

Price bands per person, in pounds. These are assumptions for plausible sample terms, not research:

| Category | Band |
|---|---|
| days-out | 8 to 35 |
| dining | 4 to 45 |
| shopping | 10 to 150 |
| travel | 40 to 250 |
| motoring | 5 to 80 |
| events | 12 to 90 |

## Generation instruction

The instruction the model followed in the session, restated from the spec. It was not sent as a separate prompt to an API, and the model did not output JSON directly: it wrote one delimited line per offer (category, title, partner, tier, region, audiences, price, saving, uses, expiry), which the throwaway script converted to JSON with sequential ids. Rerunning it would give different offers; the committed file, not this text, is the source of truth.

> Generate 150 fictional UK leisure offers that fit the `Offer` schema in `src/domain/offer.ts`, following every rule in the spec table and price bands above. Partners must be invented names that do not belong to, or closely imitate, any real UK business or brand; avoid the major brands in each category entirely, including in titles. Prices and savings are sample terms, so keep them plausible for the category and consistent with the discount described in the title (two for one saves half the price; "20% off" saves a fifth). Vary regions, audiences and discount shapes within each category.

## Checks

- Zod parses every offer at load (`src/data/sample-catalogue.ts`).
- `src/data/generated-offers.test.ts` holds the spec and the brand denylist.
- Manual review by the author. That no generated name matches a real business is not verified.
