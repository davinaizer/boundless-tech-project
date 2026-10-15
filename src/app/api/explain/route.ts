import { ExplainRequest, ExplainResponse } from "@/domain/api";
import { explainResults } from "@/services/explain-results";
import { handleJson } from "../_lib/handle-json";

export async function POST(request: Request) {
  return handleJson(request, {
    endpoint: "explain",
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
