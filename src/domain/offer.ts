import { z } from "zod";

// Simplified from the public site's categories as of 2026-10-14 (docs/research).
// Retail, supermarket and electronics are `shopping`; insurance sits in `motoring`.
export const Category = z.enum(["days-out", "dining", "shopping", "travel", "motoring", "events"]);
export type Category = z.infer<typeof Category>;

export const Tier = z.enum(["standard", "plus"]);
export type Tier = z.infer<typeof Tier>;

export const Audience = z.enum(["solo", "couple", "family"]);
export type Audience = z.infer<typeof Audience>;

// Pounds, not negative, at most two decimals.
export const Money = z.number().nonnegative().multipleOf(0.01);

// An ISO calendar date, `YYYY-MM-DD`, with no time or zone.
export const IsoDate = z.iso.date();

export const Offer = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  partner: z.string().min(1),
  category: Category,
  tier: Tier,
  region: z.string().min(1),
  audience: z.array(Audience).min(1),
  typicalPricePerPerson: Money,
  typicalSavingPerUse: Money,
  assumedUsesPerYear: z.number().int().nonnegative(),
  expiryDate: IsoDate.optional(),
});
export type Offer = z.infer<typeof Offer>;
