import { ExplainRequest, ExplainResponse } from "@/domain/api";
import { explainResults } from "@/services/explain-results";
import { handleJson } from "../_lib/handle-json";
import { getModelLimiter } from "../_lib/model-limiter";

export async function POST(request: Request) {
  return handleJson(request, {
    endpoint: "explain",
    rateLimit: getModelLimiter(),
    body: ExplainRequest,
    result: ExplainResponse,
    run: async ({ filters, offerIds }) => {
      const { explanations, source, modelCalls, usage, failure } = await explainResults(
        filters,
        offerIds,
      );
      return {
        body: { explanations },
        telemetry: { modelCalls, usage, source, ...(failure ? { failure } : {}) },
      };
    },
  });
}
