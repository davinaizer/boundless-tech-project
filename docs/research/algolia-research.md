# Boundless: how Algolia is used

- **Date observed:** 2026-10-14
- **Provenance:** analysis supplied by the project author from the public site's client-side behaviour (loaded pages, client code, and one search). Not independently reproduced.
- **Purpose:** inform the data layer and how the finder is positioned ([ADR-004](../adr/004-data-layer.md), superseded by [ADR-010](../adr/010-postgres-data-layer.md)).

## Observed

Algolia is used client-side for search and for content listings. Its code loads lazily, only when search or a listing page needs it.

| Use | Behaviour |
|---|---|
| Site-wide search | Searches all content types, with a type filter (savings, events, articles). Requires at least two characters, shows top results first, and paginates. One test query ("hotel") returned results across savings and events. |
| Content listings | Savings, events and articles pages use the search index as their data source, with category facets. Expired offers and past events are filtered out by date. |
| Eligibility lookup | A search box that lets a visitor check whether their employer or organisation qualifies for membership. |

**Index structure.** One index per content type (savings, events, articles, eligibility, and a combined index for site search), plus a replica of savings sorted by expiry date for limited-time offers. Content is managed in the CMS and indexed into Algolia.

**Record fields seen.** A content-type field, categories, and an expiry or event date. Savings cards also adapt to the member's membership level, for example to show an upgrade prompt.

**Client behaviour.** Empty queries are skipped and typing is debounced to save requests. If the client fails to initialise, the UI shows no results instead of failing. Search and click events are reported for analytics.

## Not determined

- Index settings (ranking, synonyms, rules), record counts, and index-side analytics.
- Whether records carry region, price or audience fields. None were observed.
- Whether Algolia's AI search features are enabled. Algolia announced NeuralSearch (vector plus keyword search) and AI query categorisation in 2023; whether Boundless uses them was not checked.
- Pages other than the homepage's search were inferred from code paths, not exercised.

## Implications for this project

- Offers are most likely served from a search index fed by the CMS, so the production adapter for the `SearchOffers` port is search-service-backed. The adapter translates typed filters into the service's filter syntax; the model never writes filter strings.
- Only categories, expiry and (probably) membership level are evidenced as filterable. Region, price and audience in our sample data would need index enrichment in production.
- Keyword and category discovery already exists, so the finder's value is multi-constraint intent and the value-for-fee estimate.
- Before extending the natural-language layer, check whether the search service's own AI features already cover it.

## Sources

- Algolia, NeuralSearch announcement: https://www.businesswire.com/news/home/20230501005663/en
- Algolia, query categorisation announcement: https://www.businesswire.com/news/home/20230616426518/en
