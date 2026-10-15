import { InterpretResponse, interpretRequest } from "@/domain/api";
import { env } from "@/lib/env";
import { interpretQuery } from "@/services/interpret-query";
import { handleJson } from "../_lib/handle-json";

export async function POST(request: Request) {
  return handleJson(request, {
    body: interpretRequest(env.MAX_QUERY_CHARS),
    result: InterpretResponse,
    run: async ({ query }) => {
      const { filters, source } = await interpretQuery(query);
      return { filters, source };
    },
  });
}
