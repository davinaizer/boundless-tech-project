import { InterpretResponse, interpretRequest } from "@/domain/api";
import { env } from "@/lib/env";
import { interpretQuery } from "@/services/interpret-query";
import { handleJson } from "../_lib/handle-json";
import { getModelLimiter } from "../_lib/model-limiter";

export async function POST(request: Request) {
  return handleJson(request, {
    endpoint: "interpret",
    rateLimit: getModelLimiter(),
    body: interpretRequest(env.MAX_QUERY_CHARS),
    result: InterpretResponse,
    run: async ({ query }) => {
      const { filters, source, modelCalls, usage, failure } = await interpretQuery(query);
      return {
        body: { filters, source },
        telemetry: { modelCalls, usage, source, ...(failure ? { failure } : {}) },
      };
    },
  });
}
