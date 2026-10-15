import type { z } from "zod";
import type { Filters } from "./filters";
import type { IsoDate, Offer } from "./offer";

// An offer in this region matches every region filter. Behaviour for the rest
// of the port is in docs/architecture.md and the contract suite.
export const UK_WIDE_REGION = "UK-wide";

// The region vocabulary of the catalogue: the 12 UK ITL1 regions (ONS). Offer
// regions are one of these or UK_WIDE_REGION; the interpret prompt lists them so
// the model uses the exact names that region matching compares.
export const UK_REGIONS = [
  "North East",
  "North West",
  "Yorkshire and The Humber",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
  "Wales",
  "Scotland",
  "Northern Ireland",
] as const;

// The only way services reach the catalogue. Typed filters in, offers out; the
// model never reaches it (ADR-002).
export interface SearchOffers {
  // `today` is supplied by the caller so adapters read no clock.
  search(filters: Filters, today: z.infer<typeof IsoDate>): Promise<Offer[]>;
  getByIds(ids: readonly string[]): Promise<Offer[]>;
}
