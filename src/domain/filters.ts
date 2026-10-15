import { z } from "zod";
import { Audience, Category, Tier } from "./offer";

// Heuristic bounds, not evidence: they cap what reaches the model and the port.
// Tune them from real use.
export const FILTER_LIMITS = {
  maxKeywords: 8,
  maxKeywordLength: 40,
  maxRegionLength: 60,
  maxPrice: 1000,
} as const;

const text = (max: number) => z.string().trim().min(1).max(max);

// Every field is optional; absence means "no constraint". The two lists default
// to empty so consumers never null-check them.
export const Filters = z.strictObject({
  categories: z
    .array(Category)
    .max(Category.options.length)
    .default([])
    .transform((values) => [...new Set(values)]),
  region: text(FILTER_LIMITS.maxRegionLength).optional(),
  maxPricePerPerson: z.number().min(0).max(FILTER_LIMITS.maxPrice).optional(),
  audience: Audience.optional(),
  tier: Tier.optional(),
  keywords: z
    .array(text(FILTER_LIMITS.maxKeywordLength))
    .max(FILTER_LIMITS.maxKeywords)
    .default([]),
});
export type Filters = z.infer<typeof Filters>;
