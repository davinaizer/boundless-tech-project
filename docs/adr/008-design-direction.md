# ADR-008: Design direction

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owner:** Davi

## Context

The demo needs a UI direction before implementation. The first mockup used a neutral theme invented for the product. The app is built for a specific company, and a mockup in its public visual language shows the research and how the product could sit beside its site.

Facts: the public site's colours, shapes and font families were observed directly (homepage and days-out page, October 2026). Assumptions: that a Boundless-styled demo reads as research and not as imitation, and that the observed styling is representative of the wider site.

## Options considered

1. **Neutral theme.** No risk of implying affiliation, but no signal that the company's product was studied.
2. **Boundless-styled theme.** Colours, pill shapes, rounded tiles and curved sections taken from the public site. Shows the research, but can be mistaken for an official design if not labelled.
3. **No mockup before implementation.** Cheapest, but gives reviewers nothing to react to before the code exists.

## Decision

**Option 2, with limits.**

- The theme is recorded as design tokens in [DESIGN.md](../../DESIGN.md).
- No Boundless logo, wordmark, illustrations or fonts. The product is named "Benefits Finder". Inter and Carlito stand in for the site's Korto and Aller.
- Every page and mockup states that it is a concept, not an official Boundless design, and that all data is fictional.
- Mockups are AI-generated HTML rendered to PNG from public observation. They show direction, not the implemented UI, and the built app may differ. Both versions are kept in `docs/design/`.

## Consequences

- Easier: a concrete visual target for the UI phase, and a clear link between the research and the product.
- Harder: the not-affiliated notice must stay visible, and the theme may need to change if the site's identity differs from what was observed.
- Accepted risk: the app is read as an official Boundless product despite the notices.

## Weakest assumption

That the styling reads as informed reference and not imitation. If a reviewer reads it as imitation, switch to option 1 by changing the tokens in `DESIGN.md`. The component structure does not depend on the theme.

## Evidence

- [DESIGN.md](../../DESIGN.md) for tokens, observed values and limits.
- [Company profile](../research/boundless-company-profile.md) for what Boundless does.
- Not verified: whether Boundless publishes a brand guide, whether the site uses Tailwind, and licensing for Korto and Aller.
