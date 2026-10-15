import { z } from "zod";
import { Tier, tierCanUse, type Offer } from "./offer";

// Annual membership fees in whole pence, from boundless.co.uk as of 2026-10-14
// (docs/research/boundless-company-profile.md). A snapshot, shown as illustrative.
export const MEMBERSHIP_FEES_PENCE = {
  standard: 4500,
  plus: 7800,
} as const satisfies Record<Tier, number>;

const Pence = z.number().int();

// The fee panel's numbers. All amounts are whole pence, so sums and margins are
// exact; the UI formats pounds. Illustrative: built from sample catalogue values.
export const SavingsEstimate = z.strictObject({
  offers: z.array(
    z.strictObject({
      offerId: z.string().min(1),
      savingPerUsePence: Pence.nonnegative(),
      usesPerYear: z.number().int().nonnegative(),
      annualSavingPence: Pence.nonnegative(),
    }),
  ),
  tiers: z.array(
    z.strictObject({
      tier: Tier,
      feePence: Pence.nonnegative(),
      // Offers this tier can use: Standard counts Standard offers, Plus counts all.
      usableSavingPence: Pence.nonnegative(),
      // usableSavingPence − feePence; negative when the offers do not cover the fee.
      marginPence: Pence,
    }),
  ),
  // The highest tier total, for the "up to" badge.
  bestAnnualSavingPence: Pence.nonnegative(),
});
export type SavingsEstimate = z.infer<typeof SavingsEstimate>;

// Pure arithmetic over catalogue fields; the model never supplies these figures
// (ADR-002). Sums what it is given: search results never repeat an offer.
export function estimateSavings(offers: readonly Offer[]): SavingsEstimate {
  const lines = offers.map((offer) => {
    const savingPerUsePence = Math.round(offer.typicalSavingPerUse * 100);
    return {
      offer,
      line: {
        offerId: offer.id,
        savingPerUsePence,
        usesPerYear: offer.assumedUsesPerYear,
        annualSavingPence: savingPerUsePence * offer.assumedUsesPerYear,
      },
    };
  });

  const tiers = Tier.options.map((tier) => {
    const feePence = MEMBERSHIP_FEES_PENCE[tier];
    const usableSavingPence = lines
      .filter(({ offer }) => tierCanUse(tier, offer.tier))
      .reduce((sum, { line }) => sum + line.annualSavingPence, 0);
    return { tier, feePence, usableSavingPence, marginPence: usableSavingPence - feePence };
  });

  return {
    offers: lines.map(({ line }) => line),
    tiers,
    bestAnnualSavingPence: Math.max(...tiers.map((t) => t.usableSavingPence)),
  };
}
