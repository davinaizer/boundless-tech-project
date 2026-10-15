import "server-only";
import { FILTER_LIMITS, Filters } from "@/domain/filters";
import { Audience, Category, Tier } from "@/domain/offer";
import { getAiClient, type AiClient, type ModelUsage } from "@/lib/ai";

export type Interpretation = {
  filters: Filters;
  source: "llm" | "fallback";
  modelCalls: number;
  usage: ModelUsage;
};

// Changing the prompt, the schema or MAX_TOKENS bumps PROMPT_VERSION
// (src/services/prompt-version.ts).
export const INTERPRET_SYSTEM_PROMPT = `You turn a member's request for UK leisure offers into search filters.
Fill a field only when the request states or clearly implies it; leave every other field out.
- categories: any of ${Category.options.join(", ")}. Cinemas, gardens, attractions and days out are days-out; theatre, comedy and concerts are events; restaurants and cafes are dining; hotels and flights are travel; fuel, parking and car insurance are motoring.
- region: a UK nation or region, such as London, South East, North West, Scotland or Wales. Map a town or city to its region (Manchester is North West).
- maxPricePerPerson: a budget in pounds per person, as a number. "Under £20 each" is 20.
- audience: solo, couple or family.
- tier: standard or plus, only when the member says which membership they have.
- keywords: when given, an offer is found only if its title or partner name contains one of them, so use them only for a specific venue, activity or product that the other fields do not capture, such as "cinema", "spa" or "pizza". Leave out generic words for a category itself, such as "dinner", "meal", "trip" or "day out", and adjectives such as "cheap" or "romantic". A budget belongs in maxPricePerPerson.`;

// Plain JSON Schema for the model. Structured outputs reject length and number
// limits (ADR-005), so Filters re-checks those after the call.
export const INTERPRET_SCHEMA = {
  type: "object",
  properties: {
    categories: { type: "array", items: { type: "string", enum: [...Category.options] } },
    region: { type: "string" },
    maxPricePerPerson: { type: "number" },
    audience: { type: "string", enum: [...Audience.options] },
    tier: { type: "string", enum: [...Tier.options] },
    keywords: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
} as const;

// A heuristic: low-effort adaptive thinking counts toward it, and live calls
// have used under 50 output tokens.
const MAX_TOKENS = 1024;

// Words of three letters or more that name no place, activity or brand.
const STOP_WORDS = new Set(
  (
    "about and any are around can for from get good have how into like near nice not off our " +
    "out some something that the their them there this under want what where which with would " +
    "you your"
  ).split(" "),
);

// The fallback when the model gives no usable filters: the query's distinct
// words, less stop words and words under three letters. Keywords only, so the
// chips show plainly what was understood (ADR-002).
export function keywordFallback(query: string): Filters {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  const keywords = [...new Set(words.filter((word) => word.length >= 3 && !STOP_WORDS.has(word)))]
    .slice(0, FILTER_LIMITS.maxKeywords)
    .map((word) => word.slice(0, FILTER_LIMITS.maxKeywordLength));
  return Filters.parse({ keywords });
}

// The query is assumed to have passed the route's length cap (ADR-006). Empty
// input makes no model call; any failed attempt is retried once, then the
// keyword fallback is used (ADR-002).
export async function interpretQuery(
  query: string,
  ai: AiClient = getAiClient(),
): Promise<Interpretation> {
  const text = query.trim();
  const usage: ModelUsage = { inputTokens: 0, outputTokens: 0 };
  let modelCalls = 0;
  if (text !== "") {
    for (let attempt = 0; attempt < 2; attempt++) {
      modelCalls++;
      const result = await ai.generateStructured({
        system: INTERPRET_SYSTEM_PROMPT,
        prompt: text,
        schema: INTERPRET_SCHEMA,
        maxTokens: MAX_TOKENS,
      });
      if (result.usage) {
        usage.inputTokens += result.usage.inputTokens;
        usage.outputTokens += result.usage.outputTokens;
      }
      if (!result.ok) continue;
      const parsed = Filters.safeParse(result.data);
      if (parsed.success) return { filters: parsed.data, source: "llm", modelCalls, usage };
    }
  }
  return { filters: keywordFallback(text), source: "fallback", modelCalls, usage };
}
