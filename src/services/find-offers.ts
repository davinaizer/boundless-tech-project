import "server-only";
import { getSearchOffers } from "@/data";
import type { Filters } from "@/domain/filters";
import type { Offer } from "@/domain/offer";

// The calendar date in the UK, which is when an offer's expiry date rolls over.
// The `en-CA` locale formats as YYYY-MM-DD.
export function ukDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function findOffers(filters: Filters, today: string = ukDate()): Promise<Offer[]> {
  return getSearchOffers().search(filters, today);
}
