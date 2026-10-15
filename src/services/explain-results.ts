import "server-only";
import { getSearchOffers } from "@/data";
import type { Filters } from "@/domain/filters";
import {
  MAX_EXPLAINED_OFFERS,
  MAX_EXPLANATION_LENGTH,
  describeMatch,
  groundExplanations,
  type Explanation,
} from "@/domain/match-reasons";
import type { SearchOffers } from "@/domain/search-offers";
import { getAiClient, type AiClient, type ModelUsage, type StructuredFailure } from "@/lib/ai";

// The model answered, but groundExplanations rejected the answer (or it had no lines).
export type ExplainFailure = StructuredFailure | "ungrounded";

export type Explanations = {
  explanations: Explanation[];
  // "llm" when at least one line came from the model; the rest are describeMatch.
  source: "llm" | "fallback";
  modelCalls: number;
  usage: ModelUsage;
  // Why the call gave no usable lines. Set only when source is "fallback" after a
  // model call; no call (no offers found) leaves it out.
  failure?: ExplainFailure;
};

export type ExplainDeps = { ai?: AiClient; offers?: SearchOffers };

// Defined in the domain, where the request schema needs it too.
export { MAX_EXPLAINED_OFFERS };

// A heuristic: low-effort adaptive thinking counts toward it. A live call with
// 10 offers used 1292 output tokens (2026-10-15), so 3000 leaves room; a cut-off
// answer would silently become all deterministic lines.
const MAX_TOKENS = 3000;

// Changing the prompt, the schema or MAX_TOKENS bumps PROMPT_VERSION
// (src/services/prompt-version.ts).
export const EXPLAIN_SYSTEM_PROMPT = `You explain to a member why UK leisure offers match their search.
You receive the search filters and a list of offers, as JSON. Write one short sentence per offer saying why it fits the filters, using only the fields supplied.
- Use each offerId exactly as given, once.
- Say what the offer is and which of the member's filters it meets. Do not just repeat the filters back.
- At most ${MAX_EXPLANATION_LENGTH} characters per sentence, plain words, no marketing language.
- Never write a number, a price, a saving, a date or a term. Write no digits and no "£" or "%" characters.`;

// Plain JSON Schema for the model; the answer is re-checked by groundExplanations.
export const EXPLAIN_SCHEMA = {
  type: "object",
  properties: {
    explanations: {
      type: "array",
      items: {
        type: "object",
        properties: { offerId: { type: "string" }, text: { type: "string" } },
        required: ["offerId", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["explanations"],
  additionalProperties: false,
} as const;

// The caller sends IDs, not offers: the offers are reloaded from the port, so a
// client cannot put its own content in the prompt. One model call and no retry:
// when the answer is unusable, every line is the deterministic one (ADR-002).
export async function explainResults(
  filters: Filters,
  offerIds: readonly string[],
  deps: ExplainDeps = {},
): Promise<Explanations> {
  const usage: ModelUsage = { inputTokens: 0, outputTokens: 0 };
  const none: Explanations = { explanations: [], source: "fallback", modelCalls: 0, usage };
  if (offerIds.length === 0) return none;

  const found = await (deps.offers ?? getSearchOffers()).getByIds([...new Set(offerIds)]);
  const offers = found.slice(0, MAX_EXPLAINED_OFFERS);
  if (offers.length === 0) return none;

  const fallbackLines = new Map(offers.map((offer) => [offer.id, describeMatch(offer, filters)]));
  const withFallback = (lines: Map<string, string>): Explanation[] =>
    offers.map((offer) => ({
      offerId: offer.id,
      text: lines.get(offer.id) ?? fallbackLines.get(offer.id)!,
    }));

  const prompt = JSON.stringify({
    filters,
    offers: offers.map((o) => ({
      offerId: o.id,
      title: o.title,
      partner: o.partner,
      category: o.category,
      region: o.region,
      audience: o.audience,
      typicalPricePerPerson: o.typicalPricePerPerson,
    })),
  });
  const result = await (deps.ai ?? getAiClient()).generateStructured({
    system: EXPLAIN_SYSTEM_PROMPT,
    prompt,
    schema: EXPLAIN_SCHEMA,
    maxTokens: MAX_TOKENS,
  });
  if (result.usage) {
    usage.inputTokens += result.usage.inputTokens;
    usage.outputTokens += result.usage.outputTokens;
  }
  const failure: ExplainFailure = result.ok ? "ungrounded" : result.reason;
  if (result.ok) {
    const grounded = groundExplanations(
      result.data,
      offers.map((o) => o.id),
    );
    if (grounded.ok && grounded.explanations.length > 0) {
      const lines = new Map(grounded.explanations.map((e) => [e.offerId, e.text]));
      return { explanations: withFallback(lines), source: "llm", modelCalls: 1, usage };
    }
  }
  return {
    explanations: withFallback(new Map()),
    source: "fallback",
    modelCalls: 1,
    usage,
    failure,
  };
}
