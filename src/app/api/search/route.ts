import { SearchRequest, SearchResponse } from "@/domain/api";
import { estimateSavings } from "@/domain/savings";
import { findOffers } from "@/services/find-offers";
import { handleJson } from "../_lib/handle-json";

export async function POST(request: Request) {
  return handleJson(request, {
    body: SearchRequest,
    result: SearchResponse,
    run: async ({ filters }) => {
      const offers = await findOffers(filters);
      return { offers, savings: estimateSavings(offers) };
    },
  });
}
