---
version: alpha
name: Benefits Finder
description: Visual theme for the Benefits Finder demo, styled after the public look of boundless.co.uk. Concept only, not an official Boundless design.
colors:
  red: "#E51F2D"
  blue: "#2B5FA6"
  slate: "#36535F"
  body: "#444444"
  muted: "#4F6873"
  tint: "#EFF4F6"
  line: "#DFECEE"
  periwinkle: "#CED7EC"
  surface: "#FFFFFF"
typography:
  display:
    fontFamily: Inter
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
  heading:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.015em
  title:
    fontFamily: Inter
    fontSize: 21px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: Carlito
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: Carlito
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.2
  figure:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
rounded:
  sm: 16px
  md: 32px
  full: 999px
spacing:
  xs: 6px
  sm: 12px
  md: 20px
  lg: 40px
  xl: 48px
  gutter: 40px
  content-max: 1200px
  side-panel: 370px
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 15px 34px
  query-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: 15px 26px
  filter-chip:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.slate}"
    typography: "{typography.body-small}"
    rounded: "{rounded.full}"
    padding: 4px 14px
  filter-chip-add:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.blue}"
    rounded: "{rounded.full}"
    padding: 4px 14px
  offer-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 20px 24px
  offer-card-title:
    textColor: "{colors.blue}"
    typography: "{typography.title}"
  saving-tag:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.blue}"
    typography: "{typography.figure}"
    rounded: "{rounded.full}"
    padding: 8px 18px
  tier-strip:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    padding: 9px 24px
  fee-panel:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 46px 28px 26px
  fee-panel-result:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.slate}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: 4px 16px
  savings-badge:
    backgroundColor: "{colors.red}"
    textColor: "{colors.surface}"
    typography: "{typography.figure}"
    rounded: "{rounded.full}"
    size: 112px
---

# Benefits Finder design theme

Concept theme for the Benefits Finder demo. Evidence and limits are stated below so the theme can be defended in review.

## Overview

The theme borrows the public visual language of boundless.co.uk: a white header with a soft shadow, blue headings, a red pill call to action, white rounded tiles on a pale tint, and a curved edge under the hero. It is a visual reference only. It is not an official Boundless design and uses no Boundless logo or wordmark. The product is named "Benefits Finder" and every screen carries the notice that offers, partners and savings are fictional sample data.

Evidence and limits:
- Observed on boundless.co.uk (homepage and days-out page, October 2026): the colour values, pill buttons, rounded white tiles, curved section edge, red circular badge, and the font families Korto (headings) and Aller (body).
- Not verified: whether Boundless publishes a brand guide, and whether the site uses Tailwind.
- Substitution: Korto and Aller are not available to this project. Inter (headings and figures) and Carlito (body) stand in, so letterforms differ from the real site. The shapes and colours are the part that follows Boundless.

Tone: plain, friendly, sentence case. Buttons say what happens ("Find offers"). Savings are always labelled illustrative.

## Colors

- **red (#E51F2D):** the single action colour. Used for the primary button and the yearly-saving badge only.
- **blue (#2B5FA6):** headings, offer titles, figures and links.
- **slate (#36535F):** supporting text, the tier strip and the fee panel background.
- **body (#444444):** running text on white.
- **muted (#4F6873):** secondary text such as partner names and hints.
- **tint (#EFF4F6):** page background and chip and tag fills.
- **line (#DFECEE):** hairline borders on cards.
- **periwinkle (#CED7EC):** borders of the query box, chips and saving tags.
- **surface (#FFFFFF):** header, hero, cards.

Red is used sparingly so it keeps its meaning. Do not use it for tier labels or errors.

## Typography

Two families. Inter carries headings, labels and figures. Carlito carries body text. Both are stand-ins for Boundless's Korto and Aller (see Overview). Headings use a slight negative letter spacing. Body line length stays under 80 characters.

Scale: display 38, heading 26, title 21, figure 24, body 18, body-small 16, label 16 (px).

## Layout

- Content width is capped at 1200px with 40px side gutters.
- The results page is two columns: results on the left, a 370px fee panel on the right, with a 48px gap.
- The hero is white with a curved bottom edge, then the tinted page. Content is left aligned.
- The query box and filter chips sit in the hero. The "Understood as" chips follow the query box, then the hint that the AI read the request and that edits update results immediately.
- On narrow screens the fee panel moves below the results.

## Elevation & Depth

Flat. The only shadow is the soft header shadow. The savings badge has one small shadow to separate it from the panel edge. Cards use a 1px `line` border instead of shadows.

## Shapes

Three radii only: 16px for tiles, 32px for the large fee panel, and full pills for buttons, inputs, chips and tags. The hero's curved bottom edge echoes the section dividers on boundless.co.uk.

## Components

- **button-primary:** red pill, white bold label.
- **query-input:** white pill with a periwinkle border.
- **filter-chip / filter-chip-add:** tinted pill with a bold blue field name and a remove mark. The add chip has a dashed blue border.
- **offer-card:** white tile with the offer title in blue, partner in muted text, one line of why it matches, and a saving tag. A slate tier strip closes the tile and shows tier eligibility and validity.
- **saving-tag:** the per-use saving as tint pill with a blue figure.
- **fee-panel:** slate card with the illustrative yearly arithmetic per offer, then one row per membership tier (fee, usable offers, margin). The margin sits in a white pill.
- **savings-badge:** red circle overlapping the panel's top right corner, showing the highest tier total.

The mockup is `docs/design/benefits-finder-mockup-boundless.png`. The first, neutral version is `docs/design/benefits-finder-mockup-v1.png`.

## Do's and Don'ts

- Do keep savings labelled as illustrative and based on sample data.
- Do keep the not-affiliated notice visible on every page.
- Do keep red for the primary action and the yearly-saving badge.
- Do show filter changes immediately, without a page reload.
- Don't use the Boundless logo, wordmark, illustrations or fonts.
- Don't state a saving the deterministic estimate did not produce. Model output never supplies prices or savings.
- Don't add a fourth radius or a second action colour.
- Don't rely on colour alone: tier eligibility is always written in the tier strip.
