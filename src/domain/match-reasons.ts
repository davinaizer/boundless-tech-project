import { z } from "zod";
import type { Filters } from "./filters";
import type { Audience, Category, Offer } from "./offer";
import { UK_WIDE_REGION } from "./search-offers";

export const MAX_EXPLANATION_LENGTH = 160;

// A heuristic cap on how many offers one explain call covers.
export const MAX_EXPLAINED_OFFERS = 10;

const CATEGORY_LABELS = {
  "days-out": "Days out",
  dining: "Dining",
  shopping: "Shopping",
  travel: "Travel",
  motoring: "Motoring",
  events: "Events",
} as const satisfies Record<Category, string>;

const AUDIENCE_LABELS = {
  solo: "solo members",
  couple: "couples",
  family: "families",
} as const satisfies Record<Audience, string>;

const pounds = (value: number) =>
  value === 0 ? "free" : `£${Number.isInteger(value) ? value : value.toFixed(2)}`;

// The fallback line for an offer: built only from the offer's own fields and the
// filters that were set, so it can never state a figure the catalogue does not
// hold (ADR-002). Shown when the model's line is missing or fails the check.
export function describeMatch(offer: Offer, filters: Filters): string {
  const parts = [`${CATEGORY_LABELS[offer.category]} offer`];
  if (filters.region !== undefined) {
    parts.push(offer.region === UK_WIDE_REGION ? "available UK-wide" : `in ${offer.region}`);
  }
  if (filters.audience !== undefined) parts.push(`for ${AUDIENCE_LABELS[filters.audience]}`);
  if (filters.maxPricePerPerson !== undefined) {
    const price = offer.typicalPricePerPerson;
    parts.push(
      price === 0
        ? `free (within your ${pounds(filters.maxPricePerPerson)} budget)`
        : `${pounds(price)} per person, within your ${pounds(filters.maxPricePerPerson)} budget`,
    );
  }
  if (filters.tier !== undefined) {
    parts.push(`included with your ${filters.tier === "plus" ? "Plus" : "Standard"} membership`);
  }
  const haystacks = [offer.title.toLowerCase(), offer.partner.toLowerCase()];
  const matched = filters.keywords.filter((keyword) =>
    haystacks.some((text) => text.includes(keyword.toLowerCase())),
  );
  if (matched.length > 0) parts.push(`matches ${matched.map((k) => `"${k}"`).join(", ")}`);
  return parts.join(", ");
}

const ModelExplanations = z.strictObject({
  explanations: z.array(z.strictObject({ offerId: z.string(), text: z.string() })),
});

// Where a shown line came from: the model's grounded line, or describeMatch. The
// UI says so per line, because one response can hold both (an offer the model
// left out gets its describeMatch line).
export const LineSource = z.enum(["llm", "fallback"]);
export type LineSource = z.infer<typeof LineSource>;

// A model line that passed the grounding check; it has no source yet.
export type GroundedLine = { offerId: string; text: string };

export type Explanation = GroundedLine & { source: LineSource };

// Which check rejected an answer, so a log line or the request inspector can say
// why explain fell back. Names only: never the line, the text or an offer ID.
export const GroundingRule = z.enum([
  "invalid_shape",
  "unknown_id",
  "duplicate_id",
  "empty_line",
  "too_long",
  "number_or_symbol",
]);
export type GroundingRule = z.infer<typeof GroundingRule>;

// The grounding check on a model answer. The whole answer is rejected, not
// trimmed, when any entry fails (ADR-002): an ID outside the offers that were
// sent, a repeated ID, empty or over-long text, or any numeric character (any
// script), "£" or "%" in the text (the model never states prices, savings or
// terms; a deliberate heuristic that also rejects harmless text such as
// "2-for-1", and misses spelled-out figures such as "half price"). An offer left without a
// line is not a failure: the caller fills it with describeMatch. A rejection names
// the first rule broken.
export function groundExplanations(
  raw: unknown,
  sentIds: readonly string[],
): { ok: true; explanations: GroundedLine[] } | { ok: false; rule: GroundingRule } {
  const parsed = ModelExplanations.safeParse(raw);
  if (!parsed.success) return { ok: false, rule: "invalid_shape" };
  const allowed = new Set(sentIds);
  const seen = new Set<string>();
  const explanations: GroundedLine[] = [];
  for (const { offerId, text } of parsed.data.explanations) {
    const trimmed = text.trim();
    if (!allowed.has(offerId)) return { ok: false, rule: "unknown_id" };
    if (seen.has(offerId)) return { ok: false, rule: "duplicate_id" };
    if (trimmed === "") return { ok: false, rule: "empty_line" };
    if (trimmed.length > MAX_EXPLANATION_LENGTH) return { ok: false, rule: "too_long" };
    if (/[\p{N}£%]/u.test(trimmed)) return { ok: false, rule: "number_or_symbol" };
    seen.add(offerId);
    explanations.push({ offerId, text: trimmed });
  }
  return { ok: true, explanations };
}
