import { ExplainRequest, ExplainResponse } from "@/domain/api";
import { explainResults } from "@/services/explain-results";
import { handleJson } from "../_lib/handle-json";

export async function POST(request: Request) {
  return handleJson(request, {
    body: ExplainRequest,
    result: ExplainResponse,
    run: async ({ filters, offerIds }) => {
      const { explanations } = await explainResults(filters, offerIds);
      return { explanations };
    },
  });
}
