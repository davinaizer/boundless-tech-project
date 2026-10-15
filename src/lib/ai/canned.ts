import "server-only";
import type { MockResponder } from "./mock";

// Canned answers for the mock provider, so e2e and a keyless local run can show the
// model-read path (ADR-007). They match one exact query; any other request answers
// like an unreachable model, so every other query takes the services' fallbacks.
// The query is the page's placeholder text.
export const CANNED_QUERY = "A cheap family day out near Brighton, under £30 a head";

export const CANNED_FILTERS = {
  categories: ["days-out"],
  region: "South East",
  maxPricePerPerson: 30,
  audience: "family",
} as const;

// Distinct from the deterministic line (describeMatch), so a test can tell which
// one was shown. No digits, "£" or "%": it must pass the grounding check.
export const CANNED_EXPLANATION = "Mock model line: this offer fits your search.";

const usage = { inputTokens: 0, outputTokens: 0 };

// Which service is asking is read from the schema's properties, so this file does
// not import the services (lib/ai is below them).
export const cannedResponder: MockResponder = (request) => {
  const properties = (request.schema.properties ?? {}) as Record<string, unknown>;

  if ("categories" in properties && request.prompt === CANNED_QUERY) {
    return { ok: true, data: CANNED_FILTERS, usage };
  }

  if ("explanations" in properties) {
    try {
      const parsed: unknown = JSON.parse(request.prompt);
      const offers = (parsed as { offers?: { offerId?: unknown }[] }).offers;
      const ids = (offers ?? []).map((offer) => offer.offerId);
      if (ids.length > 0 && ids.every((id) => typeof id === "string")) {
        return {
          ok: true,
          data: { explanations: ids.map((offerId) => ({ offerId, text: CANNED_EXPLANATION })) },
          usage,
        };
      }
    } catch {
      // Not the services' prompt: answer like an unreachable model.
    }
  }

  return { ok: false, reason: "unavailable" };
};
