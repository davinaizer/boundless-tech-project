import { z } from "zod";
import type { Filters } from "./filters";
import type { Audience, Category, Offer } from "./offer";
import { UK_WIDE_REGION } from "./search-offers";

export const MAX_EXPLANATION_LENGTH = 160;

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

export type Explanation = { offerId: string; text: string };

// The grounding check on a model answer. The whole answer is rejected, not
// trimmed, when any entry fails (ADR-002): an ID outside the offers that were
// sent, a repeated ID, empty or over-long text, or any numeric character (any
// script), "£" or "%" in the text (the model never states prices, savings or
// terms; a deliberate heuristic that also rejects harmless text such as
// "2-for-1", and misses spelled-out figures such as "half price"). An offer left without a
// line is not a failure: the caller fills it with describeMatch.
export function groundExplanations(
  raw: unknown,
  sentIds: readonly string[],
): { ok: true; explanations: Explanation[] } | { ok: false } {
  const parsed = ModelExplanations.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const allowed = new Set(sentIds);
  const seen = new Set<string>();
  const explanations: Explanation[] = [];
  for (const { offerId, text } of parsed.data.explanations) {
    const trimmed = text.trim();
    if (!allowed.has(offerId) || seen.has(offerId)) return { ok: false };
    if (trimmed === "" || trimmed.length > MAX_EXPLANATION_LENGTH) return { ok: false };
    if (/[\p{N}£%]/u.test(trimmed)) return { ok: false };
    seen.add(offerId);
    explanations.push({ offerId, text: trimmed });
  }
  return { ok: true, explanations };
}
