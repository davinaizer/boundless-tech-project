import "server-only";
import type { SearchOffers } from "@/domain/search-offers";
import { createInMemorySearchOffers } from "./in-memory-search-offers";
import { SAMPLE_OFFERS } from "./sample-catalogue";

const inMemory = createInMemorySearchOffers(SAMPLE_OFFERS);

// The one place an adapter is chosen; nothing else constructs one. The Postgres
// adapter joins here when DATABASE_URL is wired (ADR-010).
export function getSearchOffers(): SearchOffers {
  return inMemory;
}
